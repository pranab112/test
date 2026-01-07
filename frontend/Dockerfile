# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve@14.2.1

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port (Railway will set $PORT)
EXPOSE 8080

# Start the application
CMD ["sh", "-c", "serve -s dist -l $PORT"]
