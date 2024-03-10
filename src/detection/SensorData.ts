// SensorData.ts
export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
}

export interface SensorData {
  timestamp: number;
  accelerometer: AccelerometerData;
  gyroscope: GyroscopeData;
}

export interface BodyData {
  accelerometer: AccelerometerData;
  gyroscope: GyroscopeData;
}
