FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY backend/*.json ./backend/

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
    chmod -R 777 /app/output

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start both frontend and backend
CMD node backend/server.js & npm run preview