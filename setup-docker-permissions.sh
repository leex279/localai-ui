#!/bin/bash

# Setup script for Docker monitoring permissions
# This script helps configure the proper Docker group ID for container monitoring

echo "🐳 LocalAI UI Docker Monitoring Setup"
echo "======================================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running or not accessible."
    echo "   Please start Docker and run this script again."
    exit 1
fi

# Get the Docker group ID from the host
DOCKER_SOCKET_GID=$(stat -c '%g' /var/run/docker.sock 2>/dev/null)

if [ -z "$DOCKER_SOCKET_GID" ]; then
    echo "❌ Cannot determine Docker socket group ID."
    echo "   Make sure Docker is properly installed and running."
    exit 1
fi

echo "✅ Docker is running"
echo "📋 Docker socket group ID: $DOCKER_SOCKET_GID"

# Create or update .env file with the Docker group ID
ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    # Update existing .env file
    if grep -q "DOCKER_GROUP_ID" "$ENV_FILE"; then
        sed -i "s/DOCKER_GROUP_ID=.*/DOCKER_GROUP_ID=$DOCKER_SOCKET_GID/" "$ENV_FILE"
        echo "✅ Updated DOCKER_GROUP_ID in existing $ENV_FILE"
    else
        echo "DOCKER_GROUP_ID=$DOCKER_SOCKET_GID" >> "$ENV_FILE"
        echo "✅ Added DOCKER_GROUP_ID to existing $ENV_FILE"
    fi
else
    # Create new .env file
    echo "DOCKER_GROUP_ID=$DOCKER_SOCKET_GID" > "$ENV_FILE"
    echo "✅ Created $ENV_FILE with DOCKER_GROUP_ID"
fi

echo ""
echo "🚀 Setup Complete!"
echo ""
echo "The LocalAI UI container will now have access to the Docker socket."
echo "You can start the service with:"
echo "  docker-compose up --build"
echo ""
echo "Or if you're using the parent project:"
echo "  python start_services.py --profile [your-profile]"
echo ""
echo "Note: If you still encounter permission issues, you may need to:"
echo "1. Add your user to the docker group: sudo usermod -aG docker \$USER"
echo "2. Log out and back in, or restart your shell session"
echo "3. Make sure Docker Desktop is running (if on Windows/Mac)"