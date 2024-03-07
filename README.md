## Spaceona DB Server

Version 1.1.4

# Development Instructions

```
git clone <repo>
npm install
npm run dev
```

```
open http://localhost:3000
```

### Testing Instructions

Make changes to isRunning.ts file. Use the command below to run the test suite.

```
npm run test
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

## Server Configuration

Configures the server port, either from an environment variable PORT or defaults to 3000.
Starts the server and listens for requests on the configured port.

```env
# Database Configuration
DATABASE_URL="file:./data/database.db"

# Authentication Token for Secure Endpoints
AUTH_TOKEN="your_auth_token_here"

# Path to Firebase Admin SDK Configuration File
GOOGLE_APPLICATION_CREDENTIALS="path_to_your_firebase_admin_sdk.json"

# Application Port (default: 3000)
PORT=3000
```

# Deployment

Make these folders:
`/var/lib/spaceona-db/logs`
`/var/lib/spaceona-db/data`

Copy files to current dir
One way to do it if you have a .tar.gz for exmaple: `mkdir spaceona-db-server && tar -zxvf ./spaceona-db-server.tar.gz -C spaceona-db-server`

then do
`chmod +x ./install.sh`
`./install.sh`
