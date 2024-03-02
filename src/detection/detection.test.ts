// update.test.ts

import { simulateMachineState } from "./simulation";

const { getMockSensorData } = require("./mockdata");

describe("Dummy Test Suite", () => {
  test("True should be true", () => {
    expect(true).toBe(true);
  });

  test("False should be false", () => {
    expect(false).toBe(false);
  });
});

describe("Detection Test Suite", () => {
  test("Dummy test", () => {
    expect(true).toBe(true);
  });

  //test that the mock sensor data is being read correctly, check that the length is more than 500
  test("Mock Sensor Data Loaded", async () => {
    const data = await getMockSensorData("./src/detection/testdata2.csv");
    expect(data.length).toBeGreaterThan(500);
  });

  test("Simulate Machine State", async () => {
    await getMockSensorData("./src/detection/testdata2.csv").then(
      simulateMachineState
    );
  });
});
