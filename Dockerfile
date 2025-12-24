# Bleeding-edge Node.js (Version 25)
FROM node:25-alpine

# Goes to the app directory (cd /app)
WORKDIR /app

# Copy package.json / package-lock.json for installation of dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application into the container
COPY . .

# Set environment variables
ENV PORT=9000

# Expose the port to developers
EXPOSE 9000

# Run the application
CMD ["node", "src/index.js"]


