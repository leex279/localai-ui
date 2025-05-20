FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies with clean environment
RUN npm install && \
    cd backend && \
    npm install

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Create a non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Start both frontend and backend
CMD cd backend && node server.js & cd /app && npm run preview