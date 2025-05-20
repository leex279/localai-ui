import * as yaml from 'js-yaml';
import { ServiceDefinition } from '../types';

export interface Config {
  referenceComposeFile: string;
  referenceEnvFile: string;
  outputPath: string;
  apiBaseUrl: string;
}

export const defaultConfig: Config = {
  referenceComposeFile: '/api/files/input/docker-compose.yml',
  referenceEnvFile: '/api/files/input/env',
  outputPath: '/app/output',
  apiBaseUrl: 'http://localhost:3001'
};

export async function loadConfig(): Promise<Config> {
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    console.log('Loaded config:', config);
    return { ...defaultConfig, ...config };
  } catch (error) {
    console.warn('Failed to load config.json, using default configuration:', error);
    return defaultConfig;
  }
}

export async function loadServicesFromReference(path: string): Promise<ServiceDefinition[]> {
  try {
    console.log(`Loading docker-compose from: ${path}`);
    // Use fetch with the API path
    const apiUrl = window.location.hostname === 'localhost' 
      ? path 
      : path.replace('localhost', window.location.hostname);
    
    console.log(`Actual fetch URL: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load docker-compose.yml (${response.status}): ${errorText}`);
    }
    
    const content = await response.text();
    console.log(`Loaded docker-compose content length: ${content.length} bytes`);
    
    // Validate the content is actually YAML
    if (!content || content.trim() === '') {
      throw new Error('Empty docker-compose file content');
    }
    
    try {
      const compose = yaml.load(content) as any;
      console.log('Parsed docker-compose.yml:', compose ? 'success' : 'failed');

      if (!compose) {
        throw new Error('Failed to parse docker-compose.yml: empty result');
      }

      // Store the original compose configuration for later use
      const originalCompose = JSON.parse(JSON.stringify(compose));

      // Extract services from the compose file
      const services = Object.entries(compose.services || {}).map(([id, config]: [string, any]) => {
        // Handle service references (e.g., <<: *service-n8n)
        let serviceConfig = { ...config };
        if (config['<<']) {
          const refName = config['<<'].substring(1); // Remove * from reference
          const refConfig = compose[`x-${refName}`] || {};
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
          originalCompose
        };
      });

      return services;
    } catch (parseError) {
      console.error('YAML parsing error:', parseError);
      console.error('Content preview:', content.substring(0, 200));
      throw parseError;
    }
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