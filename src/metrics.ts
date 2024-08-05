import { Hono } from "hono";
import { prisma } from ".";
import { authMiddleware } from "./auth";

const app = new Hono();

app.use("*",authMiddleware);

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

interface Session {
  start: Date;
  end: Date;
  machineId: string;
  duration: number;
}

// Helper function to format session start and end times
function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString();
}

// Helper function to calculate and format session duration in minutes
function formatSessionDuration(duration: number): string {
  return `${(duration / (1000 * 60)).toFixed(0)} minutes`;
}

app.get("/hourly", async (c) => {
  const hours: number = Number(c.req.query("hours")) || 24;

  const oneMonthAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  const machineLogs: MachineLog[] = await prisma.machineLog.findMany({
    where: {
      timestamp: {
        gt: oneMonthAgo,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const sessions: Session[] = [];
  let sessionStart: MachineLog | null = null;

  machineLogs.forEach((log) => {
    if (!sessionStart && log.isInUse) {
      sessionStart = log;
    } else if (sessionStart && !log.isInUse) {
      sessions.push({
        start: sessionStart.timestamp,
        end: log.timestamp,
        machineId: sessionStart.machineId,
        duration: log.timestamp.getTime() - sessionStart.timestamp.getTime(),
      });
      sessionStart = null;
    }
  });

  // Group sessions by day and then by machineId
  const sessionsByDayAndMachine: Record<
    string,
    Record<string, Session[]>
  > = sessions.reduce((acc, session) => {
    const startDate = session.start.toLocaleDateString();
    if (!acc[startDate]) {
      acc[startDate] = {};
    }
    if (!acc[startDate][session.machineId]) {
      acc[startDate][session.machineId] = [];
    }
    acc[startDate][session.machineId].push(session);
    return acc;
  }, {} as Record<string, Record<string, Session[]>>);

  // Generate HTML with Tailwind CSS
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hourly Machine Usage</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
      <div class="max-w-6xl mx-auto py-8">
        <h1 class="text-3xl font-bold text-center mb-6">Machine Sessions Over the Last ${hours} Hours</h1>
        ${Object.entries(sessionsByDayAndMachine)
          .map(
            ([date, machines]) => `
            <div class="mb-8">
              <h2 class="text-xl font-semibold mb-4">${date}</h2>
              ${Object.entries(machines)
                .map(
                  ([machineId, sessions]) => `
                  <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-4">
                    <div class="px-4 py-5 sm:px-6 border-b">
                      <h3 class="text-lg leading-6 font-medium text-gray-900">Machine ${machineId}</h3>
                    </div>
                    <ul class="divide-y divide-gray-200">
                      ${sessions
                        .map(
                          (session) => `
                          <li class="px-4 py-4 sm:px-6">
                            In use from ${formatSessionTime(
                              session.start
                            )} to ${formatSessionTime(
                            session.end
                          )} - Duration: ${formatSessionDuration(
                            session.duration
                          )}
                          </li>
                        `
                        )
                        .join("")}
                    </ul>
                  </div>
                `
                )
                .join("")}
            </div>
          `
          )
          .join("")}
      </div>
    </body>
    </html>
  `;

  return c.html(html);
});

app.get("/:id", async (c) => {
  const { id } = c.req.param();

  const hours: number = Number(c.req.query("hours")) || 6;

  const timeCutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const machineLogs = await prisma.machineLog.findMany({
    where: {
      machineId: id,
      timestamp: {
        gte: timeCutoff,
      },
    },
    orderBy: {
      timestamp: "asc",
    },
    select: {
      timestamp: true,
      isInUse: true,
    },
  });

  // Prepare data for the graph
  const labels = machineLogs.map((log) => log.timestamp.toISOString());
  const data = machineLogs.map((log) => (log.isInUse ? 1 : 0));

  // Generate HTML with embedded JavaScript
  const htmlContent = `
    <html>
      <head>
        <title>Machine Usage Graph</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold text-center mb-4">Machine Usage Graph</h1>
          <h2 class="text-xl text-center mb-8">Machine ID: ${id}</h2>
          <div class="bg-white p-6 rounded-lg shadow">
            <canvas id="usageGraph"></canvas>
          </div>
        </div>
        <script>
          var ctx = document.getElementById('usageGraph').getContext('2d');
          var usageGraph = new Chart(ctx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(labels)},
              datasets: [{
                label: 'Machine Usage',
                data: ${JSON.stringify(data)},
                borderColor: 'rgb(59, 130, 246)', // Tailwind's blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.5)', // Light blue background
                borderWidth: 2,
                tension: 0.1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  return c.html(htmlContent);
});

export default app;
