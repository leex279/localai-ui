import * as yaml from 'js-yaml';
import { ServiceDefinition } from '../types';

export interface Config {
  referenceComposeFile: string;
  referenceEnvFile: string;
  outputPath: string;
}

export const defaultConfig: Config = {
  referenceComposeFile: 'input/docker-compose.yml',
  referenceEnvFile: 'input/.env',
  outputPath: 'output'
};

export async function loadConfig(): Promise<Config> {
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    return { ...defaultConfig, ...config };
  } catch (error) {
    console.warn('Failed to load config.json, using default configuration:', error);
    return defaultConfig;
  }
}

export async function loadServicesFromReference(path: string): Promise<ServiceDefinition[]> {
  try {
    const response = await fetch(path);
    
    if (!response.ok) {
      throw new Error(`Failed to load docker-compose.yml: ${response.statusText}`);
    }
    
    const content = await response.text();
    const compose = yaml.load(content) as any;

    // Store the original compose configuration for later use
    const originalCompose = JSON.parse(JSON.stringify(compose));

    // Extract services from the compose file
    const services = Object.entries(compose.services || {}).map(([id, config]: [string, any]) => {
      // Handle service references (e.g., <<: *service-n8n)
      let serviceConfig = { ...config };
      if (config['<<']) {
        const refName = config['<<'].substring(1); // Remove * from reference
        const refConfig = compose[refName] || {};
        serviceConfig = { ...refConfig, ...config };
        delete serviceConfig['<<'];
      }

      // Get dependencies from depends_on
      const dependencies = serviceConfig.depends_on ? 
        (Array.isArray(serviceConfig.depends_on) ? 
          serviceConfig.depends_on : 
          Object.keys(serviceConfig.depends_on)
        ) : [];

      return {
        id,
        name: serviceConfig.container_name || id,
        description: serviceConfig.labels?.description || `${id} service`,
        category: determineCategory(id, serviceConfig),
        dependencies,
        required: serviceConfig.labels?.required === 'true',
        image: serviceConfig.image,
        ports: serviceConfig.ports,
        environment: serviceConfig.environment,
        volumes: serviceConfig.volumes,
        originalConfig: serviceConfig,
        originalCompose // Store the full compose file for reference
      };
    });

    return services;
  } catch (error) {
    console.error('Failed to load reference docker-compose.yml:', error);
    throw error;
  }
}

function determineCategory(id: string, config: any): 'ai' | 'database' | 'infrastructure' | 'utility' {
  // Determine category based on service name and configuration
  const name = id.toLowerCase();
  const image = (config.image || '').toLowerCase();

  if (name.includes('ollama') || name.includes('ai') || name.includes('langfuse') || 
      name.includes('flowise') || name.includes('webui')) {
    return 'ai';
  }

  if (name.includes('postgres') || name.includes('redis') || name.includes('minio') || 
      name.includes('clickhouse') || name.includes('qdrant')) {
    return 'database';
  }

  if (name.includes('caddy') || name.includes('nginx') || name.includes('traefik')) {
    return 'infrastructure';
  }

  return 'utility';
}