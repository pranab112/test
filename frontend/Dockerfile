# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install express for the simple server
RUN npm install express@4.18.2

# Copy built dist from build stage
COPY --from=build /app/dist ./dist

# Copy server.js
COPY server.js ./

# Set environment variable for PORT
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run Node server directly
CMD ["node", "server.js"]
