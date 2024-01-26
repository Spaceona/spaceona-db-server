# Development Instructions

```
git clone <repo>
npm install
npm run dev
```

```
open http://localhost:3000
```

# Server Application Documentation

This documentation outlines the setup and functionality of a server application integrating Hono for HTTP request handling, Prisma for database interactions, and Firebase Admin for cloud database services. The application is designed to update machine statuses and log actions within a specified environment.

## Prerequisites

- Node.js environment
- `@hono/node-server` for serving the application
- `hono` for HTTP routes and request handling
- `@prisma/client` for database operations
- `firebase-admin` for Firebase cloud services
- Firebase project with Admin SDK setup
- Environment variable `AUTH_TOKEN` for authentication

## Routes

- GET /: Returns a simple text response, indicating the version of the application.
- POST /update/:school/:building/:type/:id/:status/:token: Handles updates for machine status within a specific school and building. Requires URL parameters for school, building, machine type, machine ID, status, and a token for authentication.

## Server Configuration

Configures the server port, either from an environment variable PORT or defaults to 3000.
Starts the server and listens for requests on the configured port.

```env
# Database Configuration
DATABASE_URL="file:./database.db"

# Authentication Token for Secure Endpoints
AUTH_TOKEN="your_auth_token_here"

# Path to Firebase Admin SDK Configuration File
GOOGLE_APPLICATION_CREDENTIALS="path_to_your_firebase_admin_sdk.json"

# Application Port (default: 3000)
PORT=3000
```

# Docker Instructions

```
docker build -t spaceona-server .
```

```
docker run -d --restart=always -v spaceona-data:/usr/src/app/ -p 80:3000 --name spaceona-db-server spaceona-server

```
