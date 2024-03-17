import { Hono } from "hono";
import { prisma } from ".";
import { stringify } from "csv-stringify/sync"; // Import the 'sync' function

const app = new Hono();

// Define the LogData interface outside of the function to avoid redefinitions
interface LogData {
  id: number;
  machineId: string;
  timestamp: Date;
  isInUse: boolean;
  body: string; // 'body' field contains the JSON data
}

// Safe parsing function
function safeParse(jsonString: string) {
  try {
    let result = JSON.parse(jsonString);
    result = JSON.parse(result); // Parse the JSON data twice

    // console.log("result", result); // Log the result for debugging
    // console.log("result.gyroscope", result.gyroscope); // Log the gyroscope data for debugging
    // console.log("result.accelerometer", result.accelerometer); // Log the accelerometer data for debugging

    // Implement additional checks here if necessary
    if (
      result.accelerometer &&
      result.accelerometer.x &&
      result.accelerometer.y &&
      result.accelerometer.z &&
      result.gyroscope &&
      result.gyroscope.x &&
      result.gyroscope.y &&
      result.gyroscope.z
    ) {
      return result;
    } else {
      return null; // or throw an error
    }
  } catch (e) {
    return null; // or throw an error
  }
}

app.get("/:machineid", async (c) => {
  const machineid = c.req.param("machineid");
  const hours: number = Number(c.req.query("hours")) || 72;

  const data = await prisma.machineLog.findMany({
    where: {
      machineId: machineid,
      timestamp: {
        gte: new Date(Date.now() - hours * 60 * 60 * 1000),
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const csvData = data.map((log) => {
    const parsedLog = log as LogData; // Cast log to LogData
    const bodyData = safeParse(parsedLog.body); // Parse 'body' instead of 'data'
    console.log("bodyData:", bodyData); // Log the parsed body data for debugging
    if (bodyData) {
      return {
        timestamp: parsedLog.timestamp,
        accX: bodyData.accelerometer.x,
        accY: bodyData.accelerometer.y,
        accZ: bodyData.accelerometer.z,
        gyroX: bodyData.gyroscope.x,
        gyroY: bodyData.gyroscope.y,
        gyroZ: bodyData.gyroscope.z,
      };
    } else {
      return {
        timestamp: parsedLog.timestamp,
        accX: "N/A", // or another placeholder indicating missing data
        accY: "N/A",
        accZ: "N/A",
        gyroX: "N/A",
        gyroY: "N/A",
        gyroZ: "N/A",
      };
    }
  });

  const csvString = stringify(csvData, {
    header: true,
    columns: ["timestamp", "accX", "accY", "accZ", "gyroX", "gyroY", "gyroZ"],
  });

  c.res.headers.set("Content-Type", "text/csv");
  c.res.headers.set("Content-Disposition", 'attachment; filename="data.csv"');

  return c.body(csvString);
});

export default app;
