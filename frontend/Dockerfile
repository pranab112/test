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

# Install serve globally
RUN npm install -g serve@14.2.1

# Copy built dist from build stage
COPY --from=build /app/dist ./dist

# Set environment variable for PORT
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start serve with inline shell command to handle $PORT properly
CMD serve -s dist -p $PORT
