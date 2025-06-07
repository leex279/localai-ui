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
    console.log('[DEBUG] Loading config.json from:', '/config.json');
    const response = await fetch('/config.json');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Failed to load config.json (${response.status}): ${errorText}`);
      throw new Error(`Failed to load config.json: ${response.statusText}`);
    }
    
    const config = await response.json();
    console.log('[DEBUG] Loaded config:', config);
    
    // Adjust API URL for Docker
    const finalConfig = { ...defaultConfig, ...config };
    if (window.location.hostname !== 'localhost') {
      finalConfig.apiBaseUrl = finalConfig.apiBaseUrl.replace('localhost', window.location.hostname);
      console.log(`[DEBUG] Adjusted API URL for Docker: ${finalConfig.apiBaseUrl}`);
    }
    
    return finalConfig;
  } catch (error) {
    console.warn('[WARN] Failed to load config.json, using default configuration:', error);
    console.log('[DEBUG] Default config:', defaultConfig);
    
    // Still adjust API URL for Docker in default config
    const finalConfig = { ...defaultConfig };
    if (window.location.hostname !== 'localhost') {
      finalConfig.apiBaseUrl = finalConfig.apiBaseUrl.replace('localhost', window.location.hostname);
      console.log(`[DEBUG] Adjusted default API URL for Docker: ${finalConfig.apiBaseUrl}`);
    }
    
    return finalConfig;
  }
}

export async function loadServicesFromReference(path: string): Promise<ServiceDefinition[]> {
  try {
    console.log(`[DEBUG] Loading docker-compose from: ${path}`);
    
    // Get the API base URL from config
    const config = await loadConfig();
    
    // Construct the full API URL
    const apiUrl = `${config.apiBaseUrl}${path}`;
    console.log(`[DEBUG] Actual fetch URL: ${apiUrl}`);
    
    // First try to check server status to see if files are accessible
    const statusUrl = `${config.apiBaseUrl}/api/status`;
    console.log(`[DEBUG] Checking server status at: ${statusUrl}`);
    
    try {
      const statusResponse = await fetch(statusUrl);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('[DEBUG] Server status:', status);
        
        if (status.files?.dockerCompose) {
          console.log(`[DEBUG] docker-compose.yml status:`, status.files.dockerCompose);
        }
      } else {
        console.error(`[ERROR] Failed to check server status: ${statusResponse.statusText}`);
      }
    } catch (statusError) {
      console.error('[ERROR] Error checking server status:', statusError);
    }
    
    // Now try to load the actual compose file
    console.log(`[DEBUG] Fetching compose file from: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Failed to load docker-compose.yml (${response.status}): ${errorText}`);
      throw new Error(`Failed to load docker-compose.yml (${response.status}): ${errorText}`);
    }
    
    const content = await response.text();
    console.log(`[DEBUG] Loaded docker-compose content length: ${content.length} bytes`);
    console.log(`[DEBUG] First 100 chars: ${content.substring(0, 100)}...`);
    
    // Validate the content is actually YAML
    if (!content || content.trim() === '') {
      console.error('[ERROR] Empty docker-compose file content');
      throw new Error('Empty docker-compose file content');
    }
    
    try {
      console.log('[DEBUG] Parsing YAML content...');
      const compose = yaml.load(content) as any;
      console.log('[DEBUG] Parsed docker-compose.yml:', compose ? 'success' : 'failed');

      if (!compose) {
        console.error('[ERROR] Failed to parse docker-compose.yml: empty result');
        throw new Error('Failed to parse docker-compose.yml: empty result');
      }

      console.log('[DEBUG] Compose file structure:');
      console.log('[DEBUG] - version:', compose.version);
      console.log('[DEBUG] - services:', Object.keys(compose.services || {}));
      console.log('[DEBUG] - volumes:', compose.volumes ? Object.keys(compose.volumes) : 'none');

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

      console.log(`[DEBUG] Extracted ${services.length} services from compose file`);
      return services;
    } catch (parseError) {
      console.error('[ERROR] YAML parsing error:', parseError);
      console.error('[ERROR] Content preview:', content.substring(0, 200));
      throw parseError;
    }
  } catch (error) {
    console.error('[ERROR] Failed to load reference docker-compose.yml:', error);
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