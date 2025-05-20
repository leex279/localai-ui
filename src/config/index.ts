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

    if (!compose?.services) {
      throw new Error('Invalid docker-compose.yml: no services defined');
    }

    return Object.entries(compose.services).map(([id, config]: [string, any]) => ({
      id,
      name: config.container_name || id,
      description: config.labels?.description || `${id} service`,
      category: config.labels?.category || 'utility',
      dependencies: (config.depends_on ? 
        Array.isArray(config.depends_on) ? 
          config.depends_on : 
          Object.keys(config.depends_on)
        : []),
      required: config.labels?.required === 'true',
      image: config.image,
      ports: config.ports,
      environment: config.environment,
      volumes: config.volumes,
      originalConfig: config
    }));
  } catch (error) {
    console.error('Failed to load reference docker-compose.yml:', error);
    throw error;
  }
}