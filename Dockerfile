# Stage 1: Build Stage
FROM node:18 AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to utilize Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema file
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of your application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production Stage
FROM node:18-slim AS production

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy Prisma schema and generated Prisma client from builder stage
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Importantly, ensure the .prisma/client directory is also copied over
COPY --from=builder /usr/src/app/node_modules/.prisma/client /usr/src/app/node_modules/.prisma/client

# Copy built code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Your application's default command, assuming the entry point is dist/index.js
CMD ["node", "dist/index.js"]
