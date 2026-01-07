# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy dist from build stage
COPY --from=build /app/dist ./dist

# Default to port 8080 if PORT env var not set
ENV PORT=8080

EXPOSE 8080

# Use exec form to avoid shell issues
CMD ["sh", "-c", "serve -s dist -p $PORT"]
