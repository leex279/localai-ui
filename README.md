# Docker Compose Configurator

The Docker Compose Configurator is a web-based tool for easily creating and customizing Docker Compose configurations tailored to your needs. This application helps you build production-ready Docker Compose files by selecting only the services you need, with automatic dependency resolution and environment variable management.

![Docker Compose Configurator Screenshot](https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260)

## Features

- ✅ Visual service selection with dependency management
- ✅ Automatic detection and inclusion of required dependencies
- ✅ Interactive dependency visualization graph
- ✅ Environment variable configuration with category support
- ✅ Real-time YAML preview and validation
- ✅ Easy export to file or direct save to disk
- ✅ Support for AI services, databases, infrastructure, and utility containers

## Use Cases

- **Development Environments**: Quickly set up developer environments with tools like Supabase, LLM services, and database containers
- **Production Deployments**: Create optimized production configurations by excluding unnecessary services
- **Learning Docker**: Visualize container dependencies and understand Docker Compose configuration
- **Multi-Component Systems**: Manage complex systems with multiple interrelated services

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Running with Docker

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/docker-compose-configurator.git
   cd docker-compose-configurator
   ```

2. Place your reference docker-compose.yml and .env files in the input directory:
   ```bash
   cp your-docker-compose.yml input/docker-compose.yml
   cp your-env-file input/env
   ```

3. Start the application:
   ```bash
   docker compose up --build
   ```

4. Access the web interface at http://localhost:3000

### Usage Instructions

1. In the **Docker Compose** tab:
   - Select the services you want to include in your configuration
   - View the dependency graph to understand relationships between services
   - See the generated YAML update in real-time
   - Download or save the compose file to disk

2. In the **Environment Variables** tab:
   - Configure required and optional environment variables
   - Variables are grouped by category for easier management
   - Save your environment configuration to an .env file

3. Find your generated files in the `output` directory:
   - `docker-compose.yml`: Your customized compose file
   - `.env`: Your environment configuration

## Architecture

The application consists of:

- **Frontend**: React application with Tailwind CSS for the user interface
- **Backend**: Express.js server for file operations and API endpoints
- **Docker**: Containerized environment for running the entire stack

### Key Components

- **Service Selector**: Allows selection of services with dependency tracking
- **Dependency Graph**: Visual representation of service relationships
- **YAML Preview**: Real-time preview and validation of the Docker Compose file
- **Environment Configurator**: Form-based editor for environment variables

## Development

### Project Structure

```
docker-compose-configurator/
├── backend/                  # Express.js backend
│   ├── server.js             # API endpoints and file handling
│   └── package.json          # Backend dependencies
├── src/
│   ├── components/           # React components
│   ├── config/               # Application configuration
│   ├── utils/                # Utility functions
│   └── App.tsx               # Main application component
├── public/                   # Static assets
├── input/                    # Input directory for reference files (mounted)
├── output/                   # Output directory for generated files (mounted)
├── Dockerfile                # Container definition
└── docker-compose.yml        # Service configuration for development
```

### Running Locally for Development

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. Start the backend:
   ```bash
   npm run start:backend
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

## Troubleshooting

### File Access Issues

If you encounter problems with file access:

1. Ensure your input directory contains the necessary files:
   - `docker-compose.yml`: Reference Docker Compose file
   - `env`: Reference environment variable file

2. Check permissions on your input and output directories:
   ```bash
   chmod -R 755 input
   chmod -R 777 output
   ```

3. Verify Docker volume mounts in your docker-compose.yml:
   ```yaml
   volumes:
     - ./input:/app/input:ro
     - ./output:/app/output
   ```

### Server Connectivity Issues

If the frontend cannot connect to the backend:

1. Confirm the backend is running (check logs with `docker-compose logs`)
2. Verify the API URL in `public/config.json` matches your environment
3. Check for CORS issues in the developer console

## License

MIT License

## Acknowledgments

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [js-yaml](https://github.com/nodeca/js-yaml)