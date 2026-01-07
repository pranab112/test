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

# Install dos2unix to fix line endings and express for server
RUN apk add --no-cache dos2unix && npm install express@4.18.2

# Copy built dist from build stage
COPY --from=build /app/dist ./dist

# Copy server.js
COPY server.js ./

# Create a startup wrapper that fixes line endings then runs the server
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'if [ -f ./scripts/start.sh ]; then dos2unix ./scripts/start.sh 2>/dev/null || true; fi' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variable for PORT
ENV PORT=8080

# Expose port
EXPOSE 8080

# Use our wrapper script
CMD ["/app/start.sh"]
