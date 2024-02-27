import { Hono } from "hono";
import { prisma } from ".";
import { authMiddleware } from "./auth";

const app = new Hono();

app.use(authMiddleware);

// First API route: Daily summary
app.get("/", async (c) => {
  const startDate = new Date("2024-02-01T00:00:00Z");
  const machineLogs = await prisma.machineLog.findMany({
    where: {
      timestamp: {
        gt: startDate,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const tempResults: {
    [machineId: string]: {
      [date: string]: {
        totalSeconds: number;
        switchCount: number;
        datapoints: number;
      }; // Include datapoints
    };
  } = {};

  machineLogs.forEach((log, index) => {
    const machineId = log.machineId;
    const timestamp = new Date(log.timestamp);
    const date = timestamp.toISOString().split("T")[0];

    if (!tempResults[machineId]) {
      tempResults[machineId] = {};
    }
    if (!tempResults[machineId][date]) {
      tempResults[machineId][date] = {
        totalSeconds: 0,
        switchCount: 0,
        datapoints: 0,
      }; // Initialize datapoints
    }

    tempResults[machineId][date].datapoints += 1; // Increment datapoints for each log

    // Count status switches
    if (index > 0) {
      const prevLog = machineLogs[index - 1];
      if (prevLog.machineId === machineId && prevLog.isInUse !== log.isInUse) {
        tempResults[machineId][date].switchCount += 1;
      }
    }

    // Calculate active time
    if (
      log.isInUse &&
      index + 1 < machineLogs.length &&
      machineLogs[index + 1].machineId === machineId &&
      !machineLogs[index + 1].isInUse
    ) {
      const nextTimestamp = new Date(machineLogs[index + 1].timestamp);
      const diffSeconds =
        (nextTimestamp.getTime() - timestamp.getTime()) / 1000;
      tempResults[machineId][date].totalSeconds += diffSeconds;
    }
  });

  const results: {
    [machineId: string]: {
      [date: string]: {
        activeTime: string;
        switchCount: number;
        datapoints: number;
      }; // Include datapoints in final results
    };
  } = {};
  for (const [machineId, dates] of Object.entries(tempResults)) {
    results[machineId] = {};
    for (const [date, data] of Object.entries(dates)) {
      const hours = Math.floor(data.totalSeconds / 3600);
      const minutes = Math.floor((data.totalSeconds % 3600) / 60);
      const seconds = Math.floor(data.totalSeconds % 60);
      const activeTime = `${hours}:${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
      results[machineId][date] = {
        activeTime,
        switchCount: data.switchCount,
        datapoints: data.datapoints,
      }; // Add datapoints to results
    }
  }

  // Build HTML content
  let html = `
     <!DOCTYPE html>
     <html>
     <head>
       <title>Machine Activity Summary</title>
       <style>
         body { font-family: Arial, sans-serif; }
         table { width: 100%; border-collapse: collapse; }
         th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
         th { background-color: #f2f2f2; }
       </style>
     </head>
     <body>
       <h1>Machine Active Times, Status Switch Counts, and Datapoints</h1>`;

  for (const [machineId, dates] of Object.entries(results)) {
    html += `<h2>Machine ID: ${machineId}</h2>`;
    html += `
       <table>
         <tr>
           <th>Date</th>
           <th>Active Time</th>
           <th>Status Switch Count</th>
           <th>Datapoints</th> <!-- New Datapoints Column -->
         </tr>`;

    for (const [date, data] of Object.entries(dates)) {
      html += `
         <tr>
           <td>${date}</td>
           <td>${data.activeTime}</td>
           <td>${data.switchCount}</td>
           <td>${data.datapoints}</td> <!-- Include Datapoints in each row -->
         </tr>`;
    }

    html += `</table><br>`;
  }

  html += `
     </body>
     </html>`;

  return c.html(html);
});

interface MachineLog {
  machineId: string;
  timestamp: Date;
  isInUse: boolean;
}

interface HourlyData {
  totalSeconds: number;
  switchCount: number;
  datapoints: number; // Added datapoints property
}

interface DailyData {
  [hour: string]: HourlyData;
}

interface MachineData {
  [date: string]: DailyData;
}

interface TempResults {
  [machineId: string]: MachineData;
}

const formatSeconds = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
};

app.get("/hourly", async (c) => {
  const startDate = new Date("2024-02-01T00:00:00Z");
  const machineLogs: MachineLog[] = await prisma.machineLog.findMany({
    where: {
      timestamp: {
        gt: startDate,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const tempResults: TempResults = {};

  machineLogs.forEach((log, index) => {
    const machineId = log.machineId;
    const timestamp = new Date(log.timestamp);
    const date = timestamp.toISOString().split("T")[0];
    const hour = timestamp.getHours().toString();

    if (!tempResults[machineId]) {
      tempResults[machineId] = {};
    }
    if (!tempResults[machineId][date]) {
      tempResults[machineId][date] = {};
    }
    if (!tempResults[machineId][date][hour]) {
      tempResults[machineId][date][hour] = {
        totalSeconds: 0,
        switchCount: 0,
        datapoints: 0,
      }; // Initialize datapoints
    }

    // Increment datapoints for each log
    tempResults[machineId][date][hour].datapoints += 1;

    // Count status switches
    if (index > 0) {
      const prevLog = machineLogs[index - 1];
      if (prevLog.machineId === machineId && prevLog.isInUse !== log.isInUse) {
        tempResults[machineId][date][hour].switchCount += 1;
      }
    }

    // Calculate active time
    if (
      log.isInUse &&
      index + 1 < machineLogs.length &&
      machineLogs[index + 1].machineId === machineId &&
      !machineLogs[index + 1].isInUse
    ) {
      const nextTimestamp = new Date(machineLogs[index + 1].timestamp);
      const diffSeconds =
        (nextTimestamp.getTime() - timestamp.getTime()) / 1000;
      tempResults[machineId][date][hour].totalSeconds += diffSeconds;
    }
  });

  // Transform tempResults to the desired output structure and format, including datapoints
  const results = Object.fromEntries(
    Object.entries(tempResults).map(([machineId, dates]) => [
      machineId,
      Object.fromEntries(
        Object.entries(dates).map(([date, hours]) => [
          date,
          Object.fromEntries(
            Object.entries(hours).map(([hour, data]) => [
              hour,
              {
                activeTime: formatSeconds(data.totalSeconds),
                switchCount: data.switchCount,
                datapoints: data.datapoints, // Include datapoints in the final results
              },
            ])
          ),
        ])
      ),
    ])
  );

  // Generate HTML content, including a column for datapoints
  let html =
    "<!DOCTYPE html><html><head><title>Hourly Active Times, Status Switches, and Datapoints</title><style>body { font-family: Arial, sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style></head><body><h1>Machine Hourly Active Times, Status Switch Counts, and Datapoints</h1>";

  for (const [machineId, dates] of Object.entries(results)) {
    html += `<h2>Machine ID: ${machineId}</h2>`;
    for (const [date, hours] of Object.entries(dates)) {
      html += `<h3>Date: ${date}</h3>`;
      html +=
        "<table><tr><th>Hour</th><th>Active Time</th><th>Status Switch Count</th><th>Datapoints</th></tr>"; // Add Datapoints header
      for (const [hour, data] of Object.entries(hours)) {
        html += `<tr><td>${hour}</td><td>${data.activeTime}</td><td>${data.switchCount}</td><td>${data.datapoints}</td></tr>`; // Include datapoints data
      }
      html += "</table><br>";
    }
  }

  html += "</body></html>";
  return c.html(html);
});

export default app;
