import { ServiceDefinition, ServicesState } from '../types';
import * as yaml from 'js-yaml';

// Generate a docker-compose.yml file based on selected services
export function generateComposeFile(
  services: ServiceDefinition[],
  state: ServicesState
): string {
  const selectedServices = services.filter(service => state[service.id]?.selected);
  
  // Create volumes object
  const volumes: Record<string, null> = {};
  
  // Build the compose file structure
  const composeFile = {
    version: '3',
    services: {},
    volumes: {}
  };
  
  // Add all selected services
  for (const service of selectedServices) {
    // Clone the original config to avoid modifying it
    composeFile.services[service.id] = JSON.parse(JSON.stringify(service.originalConfig));
    
    // Extract volume names from the service configuration
    if (service.originalConfig.volumes) {
      for (const volume of service.originalConfig.volumes) {
        // Extract volume name (part before the colon if it's not a path)
        const volumeParts = volume.split(':');
        if (!volumeParts[0].startsWith('.') && !volumeParts[0].startsWith('/')) {
          volumes[volumeParts[0]] = null;
        }
      }
    }
  }
  
  // Add all required volumes
  composeFile.volumes = volumes;
  
  try {
    return yaml.dump(composeFile, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  } catch (error) {
    console.error('Error generating YAML:', error);
    return '';
  }
}

// Validate compose file
export function validateComposeFile(yamlContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;
  
  if (!yamlContent || yamlContent.trim() === '') {
    valid = false;
    errors.push('Empty compose file');
    return { valid, errors };
  }
  
  try {
    const parsed = yaml.load(yamlContent);
    if (!parsed || typeof parsed !== 'object') {
      valid = false;
      errors.push('Invalid YAML structure');
    } else {
      const typedParsed = parsed as { services?: Record<string, unknown> };
      if (!typedParsed.services || Object.keys(typedParsed.services).length === 0) {
        valid = false;
        errors.push('No services defined');
      }
    }
  } catch (error) {
    valid = false;
    errors.push(`YAML parsing error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return { valid, errors };
}