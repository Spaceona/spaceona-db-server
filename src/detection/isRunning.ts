import { SensorData } from "./SensorData";

// Constants
export const GYRO_Y_THRESHOLD = 0.5;
export const MIN_RUNNING_DURATION_MS = 1000;
export const DEBOUNCE_DURATION_MS = 35000;

interface RunningState {
  isRunning: boolean;
  debouncedIsRunning: boolean;
  lastDebounceTimestamp: number;
  lastTransitionTimestamp: number;
}

// Initialize states for multiple machines
let machinesState: Record<string, RunningState> = {};

function getInitialState(): RunningState {
  return {
    isRunning: false,
    debouncedIsRunning: false,
    lastDebounceTimestamp: 0,
    lastTransitionTimestamp: 0,
  };
}

export function checkMachineRunning(id: string, data: SensorData): boolean {
  // Initialize state for a new machine if not already present
  if (!machinesState[id]) {
    machinesState[id] = getInitialState();
  }

  const currentIsRunning = Math.abs(data.gyroscope.y) > GYRO_Y_THRESHOLD;
  let currentState = machinesState[id];
  const {
    isRunning,
    debouncedIsRunning,
    lastDebounceTimestamp,
    lastTransitionTimestamp,
  } = currentState;

  // Debounce logic
  if (currentIsRunning !== debouncedIsRunning) {
    const currentTime = data.timestamp;
    if (currentTime - lastDebounceTimestamp > DEBOUNCE_DURATION_MS) {
      currentState.debouncedIsRunning = currentIsRunning;
      currentState.lastDebounceTimestamp = currentTime;

      if (!isRunning && currentIsRunning) {
        currentState.lastTransitionTimestamp = currentTime;
      } else if (isRunning && !currentIsRunning) {
        // Machine potentially stopped running
      }
    }
  } else {
    currentState.lastDebounceTimestamp = data.timestamp;
  }

  // Check for minimum running duration
  if (debouncedIsRunning && !isRunning) {
    const currentTimestamp = data.timestamp;
    const duration = currentTimestamp - lastTransitionTimestamp;
    if (duration >= MIN_RUNNING_DURATION_MS) {
      currentState.isRunning = true;
    }
  } else if (!debouncedIsRunning && isRunning) {
    currentState.isRunning = false;
  }

  machinesState[id] = currentState; // Update the state for the current machine

  return currentState.isRunning;
}
