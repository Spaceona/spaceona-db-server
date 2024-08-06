import { Hono } from "hono";
import { firestoredb, prisma } from ".";
import { saveToLog } from "./logs";
import { SensorData } from "./detection/SensorData";
import { checkMachineRunning } from "./detection/isRunning";
import {z} from "zod";
import {authMiddleware, deviceAuthMiddleware} from "./auth/authMiddleware";

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

//TODO this will change
export type updateRequest = {
    firmwareVersion:string,
    status:boolean
    confidence:number
    extra?:object
}



const updateRequestSchema = z.object({
    firmwareVersion: z.string().regex(/^\d+(-\d+){2}$/), //regex for firmware in format "major-minor-hotfix"
    status: z.boolean(),
    confidence: z.number(),
    extra: z.object().optional(),

})

function getMachineIDString({ school, building, type, id }: Machine): string {
    return `${school}-${building}-${type}-${id}`;
}

const machineCache: Record<string, CacheEntry> = {};

const CACHE_EXPIRATION = 1 * 60 * 1000; // 1 minutes in milliseconds
const FIREBASE_UPDATE_LIMIT = 60 * 1000; // 1 minute in milliseconds

app.use("*",authMiddleware);
app.use("*",deviceAuthMiddleware);

app.post("/:school/:building/:type/:id", async (c) => {
    console.log("test")
    let { school, building, type, id } = c.req.param();

    school = school.toLowerCase();
    building = building.toLowerCase();
    type = type.toLowerCase();

    const machine: Machine = { school, building, type, id };

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
    let body = await c.req.json();
    if(updateRequestSchema.safeParse(body).success === false) {
        return c.json({message:"Bad request"},400);
    }


    let boolStatus = body.status;



    const cacheEntry = machineCache[machineId];
    const now = Date.now();

    if (!cacheEntry) {
        machineCache[machineId] = {
            lastUpdate: now,
            lastFirebaseUpdate: now - FIREBASE_UPDATE_LIMIT, // Initialize to allow immediate update
            status: boolStatus,
        };
    }

    let shouldUpdateFirebase = true;

    if (cacheEntry) {
        shouldUpdateFirebase = now - cacheEntry.lastUpdate >= CACHE_EXPIRATION;
    }

    if (shouldUpdateFirebase) {
        try {
            // Update cache with new Firebase update time and status before the read so we still update even if we error
            machineCache[machineId].lastFirebaseUpdate = now;
            machineCache[machineId].status = boolStatus;

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
                lastUpdated: new Date(),
            };

            buildingData[type] = machines;

            const updatedBuildings = buildingsData.map((b: any) =>
                b.id === building ? buildingData : b
            );

            await docRef.update({ buildings: updatedBuildings });
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
