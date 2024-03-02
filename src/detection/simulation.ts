import { SensorData } from "./SensorData";
import * as fs from "fs";
import { checkMachineRunning } from "./isRunning"; // Import the checkIsRunning function

// Helper function for calculating percentiles
function calculatePercentile(values: number[], percentile: number) {
  values.sort((a, b) => a - b);
  const index = (percentile / 100) * (values.length - 1);
  return Math.floor(index) === index
    ? values[index]
    : values[Math.floor(index)] +
        (values[Math.ceil(index)] - values[Math.floor(index)]) *
          (index - Math.floor(index));
}

// Helper function to convert milliseconds to a more readable format (hours, minutes, seconds)
function formatDuration(ms: number): string {
  const seconds: number = Math.floor((ms / 1000) % 60);
  const minutes: number = Math.floor((ms / (1000 * 60)) % 60);
  const hours: number = Math.floor(ms / (1000 * 60 * 60));

  return `${hours > 0 ? hours + " hours, " : ""}${
    minutes > 0 ? minutes + " minutes, " : ""
  }${seconds} seconds`;
}

export async function simulateMachineState(sensorDataArray: SensorData[]) {
  let sessionLengths: number[] = [];
  let lastIsRunningState = false;
  let lastTransitionTimestamp = sensorDataArray[0]?.timestamp || 0;

  let maxGyroY = 0;
  let maxAccMagnitude = 0;
  let totalGyroY = 0;
  let totalAccMagnitude = 0;
  let dataPoints = 0;

  let gyroYValues: number[] = [];
  let accMagnitudes: number[] = [];

  sensorDataArray.forEach((data) => {
    const isRunning = checkMachineRunning("test", data);

    if (isRunning !== lastIsRunningState) {
      if (!isRunning) {
        // End of a running session
        const sessionLength = data.timestamp - lastTransitionTimestamp;
        sessionLengths.push(sessionLength);
      }
      lastTransitionTimestamp = data.timestamp;
    }

    lastIsRunningState = isRunning;

    const gyroY = Math.abs(data.gyroscope.y);
    const accMagnitude = Math.sqrt(
      Math.pow(data.accelerometer.x - 1, 2) +
        Math.pow(data.accelerometer.y, 2) +
        Math.pow(data.accelerometer.z, 2)
    );

    maxGyroY = Math.max(maxGyroY, gyroY);
    maxAccMagnitude = Math.max(maxAccMagnitude, accMagnitude);
    totalGyroY += gyroY;
    totalAccMagnitude += accMagnitude;
    dataPoints++;

    gyroYValues.push(gyroY);
    accMagnitudes.push(accMagnitude);
  });

  const totalTimeMs =
    sensorDataArray[sensorDataArray.length - 1].timestamp -
    sensorDataArray[0].timestamp;
  const runningTimeMs = sessionLengths.reduce((a, b) => a + b, 0);
  const runningPercentage = (runningTimeMs / totalTimeMs) * 100;
  const averageGyroY = totalGyroY / dataPoints;
  const averageAccMagnitude = totalAccMagnitude / dataPoints;

  // Calculate percentiles
  const gyroY25th = calculatePercentile(gyroYValues, 25);
  const gyroY50th = calculatePercentile(gyroYValues, 50);
  const gyroY75th = calculatePercentile(gyroYValues, 75);
  const accMag25th = calculatePercentile(accMagnitudes, 25);
  const accMag50th = calculatePercentile(accMagnitudes, 50);
  const accMag75th = calculatePercentile(accMagnitudes, 75);

  // Log output for debugging or analysis
  console.log(`Total Monitoring Time: ${formatDuration(totalTimeMs)}`);
  console.log(
    `Machine Running Time: ${formatDuration(
      runningTimeMs
    )} (${runningPercentage.toFixed(2)}%)`
  );
  console.log(`Max Gyro Y: ${maxGyroY.toFixed(2)}`);
  console.log(`Max Accelerometer Magnitude: ${maxAccMagnitude.toFixed(2)}`);
  console.log(`Average Gyro Y: ${averageGyroY.toFixed(2)}`);
  console.log(
    `Average Accelerometer Magnitude: ${averageAccMagnitude.toFixed(2)}`
  );
  console.log(`Gyro Y 25th Percentile: ${gyroY25th.toFixed(2)}`);
  console.log(`Gyro Y Median: ${gyroY50th.toFixed(2)}`);
  console.log(`Gyro Y 75th Percentile: ${gyroY75th.toFixed(2)}`);
  console.log(`Acc Magnitude 25th Percentile: ${accMag25th.toFixed(2)}`);
  console.log(`Acc Magnitude Median: ${accMag50th.toFixed(2)}`);
  console.log(`Acc Magnitude 75th Percentile: ${accMag75th.toFixed(2)}`);

  // Print session lengths
  console.log("Session Lengths:");
  sessionLengths.forEach((length, index) => {
    console.log(`Session ${index + 1}: ${formatDuration(length)}`);
  });

  // Return necessary data
  return {
    totalTimeMs,
    runningTimeMs,
    runningPercentage,
    maxGyroY,
    maxAccMagnitude,
    averageGyroY,
    averageAccMagnitude,
    gyroY25th,
    gyroY50th,
    gyroY75th,
    accMag25th,
    accMag50th,
    accMag75th,
    sessionLengths,
  };
}
