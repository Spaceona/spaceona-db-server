# Use Node.js version 16 as the parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of your application's code
COPY . .

# If you're using Prisma, generate the Prisma client
RUN npx prisma generate

RUN npx prisma db push

# Compile TypeScript to JavaScript
RUN npm run build

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define environment variable
ENV NODE_ENV=production

# Run the compiled app when the container launches
CMD ["node", "dist/index.js"]
