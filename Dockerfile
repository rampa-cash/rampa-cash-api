FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for better performance
RUN apk add --no-cache libc6-compat curl bash python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (this is what Railway needs)
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/ || exit 1

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "start:prod"]
