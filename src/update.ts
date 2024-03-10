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
  lastUpdate: number; // Tracks the last update time for cache
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

  let boolStatus = false; // Default to false (not running)

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
