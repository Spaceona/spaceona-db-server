// Import necessary modules
import * as fs from "fs";
import { parse } from "papaparse";
import { SensorData, AccelerometerData, GyroscopeData } from "./SensorData";

// Function to read CSV from a file and parse it
export function getMockSensorData(filePath: string): Promise<SensorData[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, csvString) => {
      if (err) {
        reject(err);
        return;
      }

      // Parse the CSV
      parse(csvString, {
        header: true,
        dynamicTyping: true, // Automatically converts numeric fields to numbers
        complete: (result: { data: any[] }) => {
          // Map parsed CSV rows to SensorData structure
          const sensorDataArray: SensorData[] = result.data.map((row: any) => ({
            timestamp: row.timestamp, // Add the timestamp property
            accelerometer: {
              x: row.accel_x,
              y: row.accel_y,
              z: row.accel_z,
            } as AccelerometerData,
            gyroscope: {
              x: row.gyro_x,
              y: row.gyro_y,
              z: row.gyro_z,
            } as GyroscopeData,
          }));

          resolve(sensorDataArray);
        },
        error: (error: any) => {
          reject(error);
        },
      });
    });
  });
}
