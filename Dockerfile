FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci
RUN cd backend && npm ci

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start both frontend and backend
CMD cd backend && node server.js & cd /app && npm run preview