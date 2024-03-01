import { Hono } from "hono";
import { firestoredb, prisma } from ".";
import { saveToLog } from "./logs";

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

const machineCache: Record<string, CacheEntry> = {};

const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutes in milliseconds

app.post("/:school/:building/:type/:id/:status", async (c) => {
  let { school, building, type, id, status } = c.req.param();

  school = school.toLowerCase();
  building = building.toLowerCase();
  type = type.toLowerCase();
  status = status.toLowerCase();

  // Shorter NaN check
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

  if (status !== "true" && status !== "false") {
    return c.text("Invalid status", 400);
  }

  const boolStatus = status === "true";
  const machineId = `${school}-${building}-${type}-${id}`;

  // Get the raw body text so we can save it to the database
  const body = await c.req.text();

  // Always log to the database
  const entry = await prisma.machineLog.create({
    data: {
      machineId,
      isInUse: boolStatus,
      body: JSON.stringify(body),
    },
  });

  saveToLog(JSON.stringify(entry)); // Log the entry

  const now = Date.now();
  const cacheEntry = machineCache[machineId];

  // Update Firebase conditionally based on cache expiration and status change
  if (
    !cacheEntry ||
    cacheEntry.status !== boolStatus ||
    cacheEntry.lastUpdate + CACHE_EXPIRATION < now
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
      // const machineIndex = machines.findIndex((m: any) => m.id === id);
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
        lastUpdate: now,
        status: boolStatus,
      };
    } catch (e) {
      console.log("Error updating Firebase:", e);
      return c.text("Error updating Firebase", 500);
    }
  }

  return c.text("OK", 200);
});

app.post("/:school/:building/:type/:id/:status/:token", async (c) => {
  let { school, building, type, id, status, token } = c.req.param();

  if (!process.env.AUTH_TOKEN) {
    return c.text("Unauthorized");
  }

  if (token !== process.env.AUTH_TOKEN) {
    return c.text("Unauthorized");
  }

  type = type.toLowerCase();

  if (type !== "washer" && type !== "dryer") {
    return c.text("Invalid machine type");
  }

  if (type == "washer") {
    type = "washingmachines";
  } else if (type == "dryer") {
    type = "dryers";
  }

  //parse status to boolean
  const boolStatus = status === "true" ? true : false;

  const machineId = `${school}-${building}-${type}-${id}`;
  const entry = await prisma.machineLog.create({
    data: {
      machineId,
      isInUse: boolStatus,
    },
  });

  try {
    const docRef = firestoredb.collection("schools").doc(school);

    //print the docuemnt data
    const doc = await docRef.get();

    //find the building where the id matches building
    const buildings = doc.data()?.buildings;

    const buildingIndex = buildings.findIndex(
      (building: any) => building.id === building
    );

    //get the building where id  = "ruef"
    const buildingData = buildings.find(
      (selected: any) => selected.id == building
    );
    const machines = buildingData[type];
    const machine = machines[id];

    //update the machine status
    machine.isInUse = boolStatus;

    //update the building
    buildingData[type][id] = machine;

    //update the buildings array
    buildings[buildingIndex] = buildingData;

    //update the document
    await docRef.update({
      buildings,
    });
  } catch (e) {
    console.log("Error updating document:", e);
    return c.text("Error updating document");
  }

  saveToLog(JSON.stringify(entry));

  // console.log(entry);

  return c.text("OK");
});

export default app;
