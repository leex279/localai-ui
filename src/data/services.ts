import { ServiceDefinition } from '../types';

// Service definitions based on the docker-compose.yml file
export const services: ServiceDefinition[] = [
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Workflow automation tool for connecting various services and APIs',
    category: 'utility',
    dependencies: ['postgres'],
    required: false,
    image: 'n8nio/n8n:latest',
    ports: ['5678:5678'],
    originalConfig: {
      container_name: 'n8n',
      restart: 'unless-stopped',
      ports: ['5678:5678'],
      volumes: ['n8n_storage:/home/node/.n8n', './n8n/backup:/backup', './shared:/data/shared'],
      depends_on: {
        'n8n-import': {
          condition: 'service_completed_successfully'
        }
      }
    }
  },
  {
    id: 'flowise',
    name: 'Flowise',
    description: 'Low-code UI for building LLM applications and workflows',
    category: 'ai',
    dependencies: [],
    required: false,
    image: 'flowiseai/flowise',
    ports: ['3001:3001'],
    originalConfig: {
      image: 'flowiseai/flowise',
      restart: 'unless-stopped',
      container_name: 'flowise',
      environment: [
        'PORT=3001',
        'FLOWISE_USERNAME=${FLOWISE_USERNAME}',
        'FLOWISE_PASSWORD=${FLOWISE_PASSWORD}'
      ],
      ports: ['3001:3001'],
      extra_hosts: ['host.docker.internal:host-gateway'],
      volumes: ['~/.flowise:/root/.flowise'],
      entrypoint: '/bin/sh -c "sleep 3; flowise start"'
    }
  },
  {
    id: 'open-webui',
    name: 'Open WebUI',
    description: 'Web interface for LLM interactions',
    category: 'ai',
    dependencies: ['ollama-cpu'],
    required: false,
    image: 'ghcr.io/open-webui/open-webui:main',
    ports: ['3000:8080'],
    originalConfig: {
      image: 'ghcr.io/open-webui/open-webui:main',
      restart: 'unless-stopped',
      container_name: 'open-webui',
      ports: ['3000:8080'],
      extra_hosts: ['host.docker.internal:host-gateway'],
      volumes: ['open-webui:/app/backend/data']
    }
  },
  {
    id: 'ollama-cpu',
    name: 'Ollama (CPU)',
    description: 'Run LLMs locally on CPU',
    category: 'ai',
    dependencies: [],
    required: false,
    image: 'ollama/ollama:latest',
    ports: ['11434:11434'],
    originalConfig: {
      image: 'ollama/ollama:latest',
      container_name: 'ollama',
      restart: 'unless-stopped',
      ports: ['11434:11434'],
      environment: ['OLLAMA_CONTEXT_LENGTH=8192'],
      volumes: ['ollama_storage:/root/.ollama']
    }
  },
  {
    id: 'qdrant',
    name: 'Qdrant',
    description: 'Vector database for AI embeddings and semantic search',
    category: 'database',
    dependencies: [],
    required: false,
    image: 'qdrant/qdrant',
    ports: ['6333:6333'],
    originalConfig: {
      image: 'qdrant/qdrant',
      container_name: 'qdrant',
      restart: 'unless-stopped',
      ports: ['6333:6333'],
      volumes: ['qdrant_storage:/qdrant/storage']
    }
  },
  {
    id: 'caddy',
    name: 'Caddy',
    description: 'Web server and reverse proxy with automatic HTTPS',
    category: 'infrastructure',
    dependencies: [],
    required: false,
    image: 'docker.io/library/caddy:2-alpine',
    originalConfig: {
      container_name: 'caddy',
      image: 'docker.io/library/caddy:2-alpine',
      network_mode: 'host',
      restart: 'unless-stopped',
      volumes: [
        './Caddyfile:/etc/caddy/Caddyfile:ro',
        'caddy-data:/data:rw',
        'caddy-config:/config:rw'
      ],
      environment: [
        'N8N_HOSTNAME=${N8N_HOSTNAME:-":8001"}',
        'WEBUI_HOSTNAME=${WEBUI_HOSTNAME:-":8002"}',
        'FLOWISE_HOSTNAME=${FLOWISE_HOSTNAME:-":8003"}',
        'OLLAMA_HOSTNAME=${OLLAMA_HOSTNAME:-":8004"}',
        'SUPABASE_HOSTNAME=${SUPABASE_HOSTNAME:-":8005"}',
        'SEARXNG_HOSTNAME=${SEARXNG_HOSTNAME:-":8006"}',
        'LANGFUSE_HOSTNAME=${LANGFUSE_HOSTNAME:-":8007"}',
        'LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-internal}'
      ],
      cap_drop: ['ALL'],
      cap_add: ['NET_BIND_SERVICE']
    }
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Relational database for storing application data',
    category: 'database',
    dependencies: [],
    required: false,
    image: 'postgres:latest',
    ports: ['5433:5432'],
    originalConfig: {
      image: 'postgres:${POSTGRES_VERSION:-latest}',
      restart: 'unless-stopped',
      healthcheck: {
        test: ['CMD-SHELL', 'pg_isready -U postgres'],
        interval: '3s',
        timeout: '3s',
        retries: 10
      },
      environment: [
        'POSTGRES_USER=postgres',
        'POSTGRES_PASSWORD=${POSTGRES_PASSWORD}',
        'POSTGRES_DB=postgres'
      ],
      ports: ['127.0.0.1:5433:5432'],
      volumes: ['langfuse_postgres_data:/var/lib/postgresql/data']
    }
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data structure store used as a database, cache, and message broker',
    category: 'database',
    dependencies: [],
    required: false,
    image: 'docker.io/valkey/valkey:8-alpine',
    originalConfig: {
      container_name: 'redis',
      image: 'docker.io/valkey/valkey:8-alpine',
      command: 'valkey-server --save 30 1 --loglevel warning',
      restart: 'unless-stopped',
      volumes: ['valkey-data:/data'],
      cap_drop: ['ALL'],
      cap_add: ['SETGID', 'SETUID', 'DAC_OVERRIDE'],
      healthcheck: {
        test: ['CMD', 'redis-cli', 'ping'],
        interval: '3s',
        timeout: '10s',
        retries: 10
      }
    }
  },
  {
    id: 'langfuse-web',
    name: 'Langfuse Web',
    description: 'Open source LLM observability and analytics platform',
    category: 'ai',
    dependencies: ['langfuse-worker', 'postgres', 'minio', 'redis', 'clickhouse'],
    required: false,
    image: 'langfuse/langfuse:3',
    ports: ['3002:3000'],
    originalConfig: {
      image: 'langfuse/langfuse:3',
      restart: 'always',
      ports: ['3002:3000'],
      environment: [
        'NEXTAUTH_URL=http://localhost:3002',
        'NEXTAUTH_SECRET=${NEXTAUTH_SECRET}'
      ]
    }
  },
  {
    id: 'langfuse-worker',
    name: 'Langfuse Worker',
    description: 'Background worker for Langfuse',
    category: 'ai',
    dependencies: ['postgres', 'minio', 'redis', 'clickhouse'],
    required: false,
    image: 'langfuse/langfuse-worker:3',
    ports: ['3030:3030'],
    originalConfig: {
      image: 'langfuse/langfuse-worker:3',
      restart: 'always',
      ports: ['127.0.0.1:3030:3030']
    }
  },
  {
    id: 'clickhouse',
    name: 'ClickHouse',
    description: 'Column-oriented database management system for analytics',
    category: 'database',
    dependencies: [],
    required: false,
    image: 'clickhouse/clickhouse-server',
    ports: ['8123:8123', '9000:9000'],
    originalConfig: {
      image: 'clickhouse/clickhouse-server',
      restart: 'always',
      user: '101:101',
      environment: [
        'CLICKHOUSE_DB=default',
        'CLICKHOUSE_USER=clickhouse',
        'CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}'
      ],
      volumes: [
        'langfuse_clickhouse_data:/var/lib/clickhouse',
        'langfuse_clickhouse_logs:/var/log/clickhouse-server'
      ],
      ports: ['127.0.0.1:8123:8123', '127.0.0.1:9000:9000'],
      healthcheck: {
        test: 'wget --no-verbose --tries=1 --spider http://localhost:8123/ping || exit 1',
        interval: '5s',
        timeout: '5s',
        retries: 10,
        start_period: '1s'
      }
    }
  },
  {
    id: 'minio',
    name: 'MinIO',
    description: 'High-performance object storage compatible with Amazon S3',
    category: 'database',
    dependencies: [],
    required: false,
    image: 'minio/minio',
    ports: ['9090:9000', '9091:9001'],
    originalConfig: {
      image: 'minio/minio',
      restart: 'always',
      entrypoint: 'sh',
      command: '-c \'mkdir -p /data/langfuse && minio server --address ":9000" --console-address ":9001" /data\'',
      environment: [
        'MINIO_ROOT_USER=minio',
        'MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}'
      ],
      ports: ['9090:9000', '127.0.0.1:9091:9001'],
      volumes: ['langfuse_minio_data:/data'],
      healthcheck: {
        test: ['CMD', 'mc', 'ready', 'local'],
        interval: '1s',
        timeout: '5s',
        retries: 5,
        start_period: '1s'
      }
    }
  },
  {
    id: 'searxng',
    name: 'SearXNG',
    description: 'Privacy-respecting metasearch engine',
    category: 'utility',
    dependencies: [],
    required: false,
    image: 'docker.io/searxng/searxng:latest',
    ports: ['8080:8080'],
    originalConfig: {
      container_name: 'searxng',
      image: 'docker.io/searxng/searxng:latest',
      restart: 'unless-stopped',
      ports: ['8080:8080'],
      volumes: ['./searxng:/etc/searxng:rw'],
      environment: [
        'SEARXNG_BASE_URL=https://${SEARXNG_HOSTNAME:-localhost}/',
        'UWSGI_WORKERS=${SEARXNG_UWSGI_WORKERS:-4}',
        'UWSGI_THREADS=${SEARXNG_UWSGI_THREADS:-4}'
      ],
      cap_drop: ['ALL'],
      cap_add: ['CHOWN', 'SETGID', 'SETUID']
    }
  }
];