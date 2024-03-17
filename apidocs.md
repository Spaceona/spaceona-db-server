# Spaceona Web Server API Documentation

Welcome to the Spaceona Web Server API! This document outlines the available API endpoints, their purposes, and how to use them.

## API Root

All API endpoints are rooted at `api.spaceona.com`.

### Get Server Status

- **Endpoint**: `GET /`
- **Description**: Check the status of the server.

## Authentication

All API requests require authentication via a token passed as a query parameter. Replace `TOKEN` with your actual authentication token.

Example: `?token=TOKEN`

## Endpoints

### Get Dump by Machine ID

- **Endpoint**: `GET /dump/:machineid`
- **Description**: Retrieve a dump of data for a specified machine.
- **Parameters**:
  - `:machineid` - The unique identifier for the machine.
- **Query Parameters**:
  - `token` - Your authentication token.

### Get Metrics by Machine ID

- **Endpoint**: `GET /metrics/:machineid`
- **Description**: Fetch metrics for a specific machine.
- **Parameters**:
  - `:machineid` - The unique identifier for the machine.
- **Query Parameters**:
  - `token` - Your authentication token.

### Get Hourly Metrics

- **Endpoint**: `GET /metrics/hourly`
- **Description**: Retrieve metrics on an hourly basis for all machines.
- **Query Parameters**:
  - `token` - Your authentication token.

### Get All Metrics

- **Endpoint**: `GET /metrics`
- **Description**: Fetch all available metrics.
- **Query Parameters**:
  - `token` - Your authentication token.

### Update Sensor Data

- **Endpoint**: `POST /update/:school/:building/:type/:id/:status`
- **Description**: Update the sensor data for a specific device.
- **Parameters**:
  - `:school` - The school identifier.
  - `:building` - The building identifier within the school.
  - `:type` - The type of sensor or device.
  - `:id` - The unique identifier for the device.
  - `:status` - The status of the device.
- **Query Parameters**:
  - `token` - Your authentication token.
- **Body**: JSON containing sensor data.
  Example:
  ```json
  {
    "accelerometer": {
      "z": 0.9594727,
      "y": -0.000092685547,
      "x": -0.1003418
    },
    "gyroscope": {
      "z": 0.1068702,
      "y": -0.7251908,
      "x": -1.282443
    }
  }
  ```

## Utility Functions

### Get Machine ID String

This example function constructs a machine ID string from various components.

- **Function**:
  ```javascript
  function getMachineIDString({ school, building, type, id }) {
    return `${school}-${building}-${type}-${id}`;
  }
  ```
