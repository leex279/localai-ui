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

# Create directories with proper permissions
RUN mkdir -p /app/output && \
    chown -R node:node /app

# Switch to node user (built into node image)
USER node

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start both frontend and backend
CMD cd backend && node server.js & cd /app && npm run preview