import { Hono } from "hono";
import { firestoredb, prisma } from ".";
import { saveToLog } from "./logs";
import { SensorData } from "./detection/SensorData";
import { GYRO_Y_THRESHOLD, DEBOUNCE_DURATION_MS } from "./detection/simulation";

const app = new Hono();

enum MachineType {
  Washer = "washer",
  Dryer = "dryer",
}

enum MachineTypeListName {
  Washer = "washingmachines",
  Dryer = "dryers",
}

interface CacheEntry {
  lastUpdate: number; // Tracks the last update time for cache
  status: boolean; // The last known status
}

interface DebounceCacheEntry {
  lastDebounceTime: number;
  wasRunning: boolean;
}

const machineCache: Record<string, CacheEntry> = {};
const debounceCache: Record<string, DebounceCacheEntry> = {};

const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes in milliseconds

app.post("/:school/:building/:type/:id/:status", async (c) => {
  let { school, building, type, id, status } = c.req.param();

  school = school.toLowerCase();
  building = building.toLowerCase();
  type = type.toLowerCase();
  status = status.toLowerCase();

  if (isNaN(id as any)) {
    return c.text("Invalid ID", 400);
  }

  if (type !== MachineType.Washer && type !== MachineType.Dryer) {
    return c.text("Invalid machine type", 400);
  }

  type =
    type === MachineType.Washer
      ? MachineTypeListName.Washer
      : MachineTypeListName.Dryer;

  const machineId = `${school}-${building}-${type}-${id}`;
  const body = await c.req.text();

  let boolStatus = false; // Default to false (not running)

  try {
    const json = JSON.parse(body);
    const { gyroscope } = json;

    // Determine if the machine is running based on gyroscope data
    const currentIsRunning = Math.abs(gyroscope.y) > GYRO_Y_THRESHOLD;

    // Debounce logic
    const now = Date.now();
    if (!(machineId in debounceCache)) {
      debounceCache[machineId] = {
        lastDebounceTime: now,
        wasRunning: false,
      };
    }

    const { lastDebounceTime, wasRunning } = debounceCache[machineId];

    if (
      currentIsRunning !== wasRunning &&
      now - lastDebounceTime > DEBOUNCE_DURATION_MS
    ) {
      debounceCache[machineId].wasRunning = currentIsRunning;
      debounceCache[machineId].lastDebounceTime = now;
      boolStatus = currentIsRunning;
    } else if (currentIsRunning === wasRunning) {
      // If the state hasn't changed, update the last debounce time
      debounceCache[machineId].lastDebounceTime = now;
      boolStatus = wasRunning;
    }
  } catch (e) {
    console.log("Error parsing JSON:", e);
  }

  // Always log to the database
  const entry = await prisma.machineLog.create({
    data: {
      machineId,
      isInUse: boolStatus,
      body: JSON.stringify(body),
    },
  });

  saveToLog(JSON.stringify(entry)); // Log the entry

  const cacheEntry = machineCache[machineId];

  // Update Firebase conditionally based on cache expiration and status change
  if (
    !cacheEntry ||
    cacheEntry.status !== boolStatus ||
    cacheEntry.lastUpdate + CACHE_EXPIRATION < Date.now()
  ) {
    try {
      const docRef = firestoredb.collection("schools").doc(school);
      const doc = await docRef.get();
      const buildingsData = doc.data()?.buildings;
      const buildingData = buildingsData?.find((b: any) => b.id === building);
      if (!buildingData) {
        return c.text("Building not found", 404);
      }

      const machines = buildingData[type];
      const machine = machines[id];

      machines[id] = {
        ...machine,
        isInUse: boolStatus,
        lastUpdated: entry.timestamp,
      };

      // Update the building data
      buildingData[type] = machines;

      // Update the buildings array in the document
      const updatedBuildings = buildingsData.map((b: any) =>
        b.id === building ? buildingData : b
      );

      // Update the document in Firestore
      await docRef.update({ buildings: updatedBuildings });

      // Update cache with the new status and update time
      machineCache[machineId] = {
        lastUpdate: Date.now(),
        status: boolStatus,
      };
    } catch (e) {
      console.log("Error updating Firebase:", e);
      return c.text("Error updating Firebase", 500);
    }
  }

  return c.text("OK", 200);
});

export default app;
