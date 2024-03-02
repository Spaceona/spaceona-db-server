import { SensorData } from "./SensorData";

// Updated constants for threshold, minimum duration, and debounce duration
const GYRO_Y_THRESHOLD = 0.5; // Lowered threshold to capture more active states
const MIN_RUNNING_DURATION_MS = 1000; // Minimum duration to consider the machine running
const DEBOUNCE_DURATION_MS = 15000; // 15 seconds to reduce sensitivity to mid-cycle changes

// Function to simulate and interpret the sensor data
export async function simulateMachineState(sensorDataArray: SensorData[]) {
  let isRunning = false;
  let runningTimeMs = 0;
  let transitions = 0;
  let lastTransitionTimestamp = sensorDataArray[0]?.timestamp || 0;
  let debouncedIsRunning = isRunning;
  let lastDebounceTimestamp = lastTransitionTimestamp;

  let maxGyroY = 0;
  let maxAccMagnitude = 0;
  let totalGyroY = 0;
  let totalAccMagnitude = 0;
  let dataPoints = 0;

  let gyroYValues: number[] = [];
  let accMagnitudes: number[] = [];

  sensorDataArray.forEach((data, index) => {
    const currentIsRunning = Math.abs(data.gyroscope.y) > GYRO_Y_THRESHOLD;
    const gyroY = Math.abs(data.gyroscope.y);
    const accMagnitude = Math.sqrt(
      (data.accelerometer.x - 1) ** 2 +
        data.accelerometer.y ** 2 +
        data.accelerometer.z ** 2
    );

    maxGyroY = Math.max(maxGyroY, gyroY);
    maxAccMagnitude = Math.max(maxAccMagnitude, accMagnitude);
    totalGyroY += gyroY;
    totalAccMagnitude += accMagnitude;
    dataPoints++;

    gyroYValues.push(gyroY);
    accMagnitudes.push(accMagnitude);

    // Debounce logic
    if (currentIsRunning !== debouncedIsRunning) {
      const currentTime = data.timestamp;
      if (currentTime - lastDebounceTimestamp > DEBOUNCE_DURATION_MS) {
        debouncedIsRunning = currentIsRunning;
        lastDebounceTimestamp = currentTime;
      }
    } else {
      lastDebounceTimestamp = data.timestamp;
    }

    if (debouncedIsRunning !== isRunning) {
      const currentTimestamp = data.timestamp;
      const duration = currentTimestamp - lastTransitionTimestamp;

      // Update running time and transitions if it was running
      if (isRunning && duration >= MIN_RUNNING_DURATION_MS) {
        runningTimeMs += duration;
        transitions++;
      }

      // Update the state and timestamp for the next transition
      isRunning = debouncedIsRunning;
      lastTransitionTimestamp = currentTimestamp;
    }
  });

  const totalTimeMs =
    sensorDataArray[sensorDataArray.length - 1].timestamp -
    sensorDataArray[0].timestamp;
  const runningPercentage = (runningTimeMs / totalTimeMs) * 100;
  const averageGyroY = totalGyroY / dataPoints;
  const averageAccMagnitude = totalAccMagnitude / dataPoints;

  // Convert times from milliseconds to hours and minutes
  const convertToHoursMinutes = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return { hours, minutes };
  };

  const totalDuration = convertToHoursMinutes(totalTimeMs);
  const runningDuration = convertToHoursMinutes(runningTimeMs);

  // Calculate percentiles
  const gyroY25th = calculatePercentile(gyroYValues, 25);
  const gyroY50th = calculatePercentile(gyroYValues, 50); // Median
  const gyroY75th = calculatePercentile(gyroYValues, 75);

  const accMag25th = calculatePercentile(accMagnitudes, 25);
  const accMag50th = calculatePercentile(accMagnitudes, 50); // Median
  const accMag75th = calculatePercentile(accMagnitudes, 75);

  console.log(
    `Total Monitoring Time: ${totalDuration.hours} hours and ${totalDuration.minutes} minutes`
  );
  console.log(
    `Machine Running Time: ${runningDuration.hours} hours and ${
      runningDuration.minutes
    } minutes (${runningPercentage.toFixed(2)}%)`
  );
  console.log(`Number of Transitions: ${transitions}`);
  console.log(`Max Gyro Y: ${maxGyroY.toFixed(2)}`);
  console.log(`Max Accelerometer Magnitude: ${maxAccMagnitude.toFixed(2)}`);
  console.log(`Average Gyro Y: ${averageGyroY.toFixed(2)}`);
  console.log(
    `Average Accelerometer Magnitude: ${averageAccMagnitude.toFixed(2)}`
  );
  console.log(`Total Data Points Analyzed: ${dataPoints}`);
  console.log(`25th Percentile Gyro Y: ${gyroY25th.toFixed(2)}`);
  console.log(`Median Gyro Y: ${gyroY50th.toFixed(2)}`);
  console.log(`75th Percentile Gyro Y: ${gyroY75th.toFixed(2)}`);
  console.log(
    `25th Percentile Accelerometer Magnitude: ${accMag25th.toFixed(2)}`
  );
  console.log(`Median Accelerometer Magnitude: ${accMag50th.toFixed(2)}`);
  console.log(
    `75th Percentile Accelerometer Magnitude: ${accMag75th.toFixed(2)}`
  );
}

// Function to calculate percentiles (assuming you have this implemented)
function calculatePercentile(values: number[], percentile: number) {
  values.sort((a, b) => a - b);
  const index = (percentile / 100) * (values.length - 1);
  if (Math.floor(index) === index) {
    return values[index];
  } else {
    const lower = values[Math.floor(index)];
    const upper = values[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
  }
}
