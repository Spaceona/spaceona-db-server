import { Hono } from "hono";
import { firestoredb, prisma } from ".";
import { saveToLog } from "./logs";
import { SensorData } from "./detection/SensorData";
import { checkMachineRunning } from "./detection/isRunning";

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
  lastUpdate: number; // Tracks the last update time in cache
  lastFirebaseUpdate: number; // Tracks the last Firebase update time
  status: boolean; // The last known status
}

interface Machine {
  school: string;
  building: string;
  type: string;
  id: string;
}

function getMachineIDString({ school, building, type, id }: Machine): string {
  return `${school}-${building}-${type}-${id}`;
}

const machineCache: Record<string, CacheEntry> = {};

const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const FIREBASE_UPDATE_LIMIT = 60 * 1000; // 1 minute in milliseconds

app.post("/:school/:building/:type/:id/:status", async (c) => {
  let { school, building, type, id, status } = c.req.param();

  school = school.toLowerCase();
  building = building.toLowerCase();
  type = type.toLowerCase();

  const machine: Machine = { school, building, type, id };

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

  const machineId = getMachineIDString({ school, building, type, id });
  const body = await c.req.text();

  let boolStatus = false;

  try {
    const json = JSON.parse(body);
    const { accelerometer, gyroscope } = json;
    const sensorData: SensorData = {
      timestamp: Date.now(),
      accelerometer,
      gyroscope,
    };

    boolStatus = checkMachineRunning(machineId, sensorData);
  } catch (e) {
    console.log("Error parsing JSON:", e);
    return c.text("Error parsing JSON", 400);
  }

  const entry = await prisma.machineLog.create({
    data: {
      machineId,
      isInUse: boolStatus,
      body: JSON.stringify(body),
    },
  });

  saveToLog(JSON.stringify(entry));

  const cacheEntry = machineCache[machineId];
  const now = Date.now();

  if (!cacheEntry) {
    machineCache[machineId] = {
      lastUpdate: now,
      lastFirebaseUpdate: now - FIREBASE_UPDATE_LIMIT, // Initialize to allow immediate update
      status: boolStatus,
    };
  }

  const shouldUpdateFirebase = cacheEntry
    ? boolStatus !== cacheEntry.status
      ? now - cacheEntry.lastFirebaseUpdate >= FIREBASE_UPDATE_LIMIT
      : now - cacheEntry.lastUpdate >= CACHE_EXPIRATION
    : true;

  if (shouldUpdateFirebase) {
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

      buildingData[type] = machines;

      const updatedBuildings = buildingsData.map((b: any) =>
        b.id === building ? buildingData : b
      );

      await docRef.update({ buildings: updatedBuildings });

      // Update cache with new Firebase update time and status
      machineCache[machineId].lastFirebaseUpdate = now;
      machineCache[machineId].status = boolStatus;
    } catch (e) {
      console.log("Error updating Firebase:", e);
      return c.text("Error updating Firebase", 500);
    }
  }

  // Update the last cache update time regardless of Firebase update
  machineCache[machineId].lastUpdate = now;

  return c.text("OK", 200);
});

export default app;
