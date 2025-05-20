import { ServiceDefinition, ServicesState } from '../types';
import * as yaml from 'js-yaml';

// Clean up unused resources from the compose configuration
function cleanUnusedResources(compose: any, selectedServices: string[]) {
  const usedVolumes = new Set<string>();
  const usedNetworks = new Set<string>();
  const usedXRefs = new Set<string>();

  // Check all remaining services for referenced volumes/networks/x-refs
  for (const [svcId, config] of Object.entries(compose.services)) {
    if (!selectedServices.includes(svcId)) continue;

    // Check volumes
    const svcConfig = config as any;
    if (svcConfig.volumes) {
      for (const mount of svcConfig.volumes) {
        const name = mount.split(':')[0];
        if (!name.startsWith('.') && !name.startsWith('/') && !name.startsWith('~')) {
          usedVolumes.add(name);
        }
      }
    }

    // Check networks
    if (svcConfig.networks) {
      if (Array.isArray(svcConfig.networks)) {
        svcConfig.networks.forEach((net: string) => usedNetworks.add(net));
      } else {
        Object.keys(svcConfig.networks).forEach(net => usedNetworks.add(net));
      }
    }

    // Check for x-ref usage
    const configStr = JSON.stringify(config);
    Object.keys(compose).forEach(key => {
      if (key.startsWith('x-') && configStr.includes(`*${key.substring(2)}`)) {
        usedXRefs.add(key);
      }
    });
  }

  // Remove unused volumes
  if (compose.volumes) {
    Object.keys(compose.volumes).forEach(vol => {
      if (!usedVolumes.has(vol)) {
        delete compose.volumes[vol];
      }
    });
    // Remove volumes section if empty
    if (Object.keys(compose.volumes).length === 0) {
      delete compose.volumes;
    }
  }

  // Remove unused networks
  if (compose.networks) {
    Object.keys(compose.networks).forEach(net => {
      if (!usedNetworks.has(net)) {
        delete compose.networks[net];
      }
    });
    // Remove networks section if empty
    if (Object.keys(compose.networks).length === 0) {
      delete compose.networks;
    }
  }

  // Remove unused x-refs
  Object.keys(compose).forEach(key => {
    if (key.startsWith('x-') && !usedXRefs.has(key)) {
      delete compose[key];
    }
  });

  return compose;
}

// Generate a docker-compose.yml file based on selected services
export function generateComposeFile(
  services: ServiceDefinition[],
  state: ServicesState
): string {
  const selectedServices = services.filter(service => state[service.id]?.selected);
  const selectedServiceIds = selectedServices.map(s => s.id);
  
  // Start with a base compose structure
  const composeFile: any = {
    version: '3',
    services: {}
  };
  
  // Add all selected services with their original configurations
  for (const service of selectedServices) {
    composeFile.services[service.id] = JSON.parse(JSON.stringify(service.originalConfig));
  }

  // Add all volumes from original config
  if (services[0]?.originalConfig?.volumes) {
    composeFile.volumes = JSON.parse(JSON.stringify(services[0].originalConfig.volumes));
  }

  // Add all x-refs from original config
  services.forEach(service => {
    if (service.originalConfig) {
      Object.entries(service.originalConfig).forEach(([key, value]) => {
        if (key.startsWith('x-')) {
          composeFile[key] = JSON.parse(JSON.stringify(value));
        }
      });
    }
  });

  // Clean up unused resources
  const cleanedCompose = cleanUnusedResources(composeFile, selectedServiceIds);
  
  try {
    return yaml.dump(cleanedCompose, {
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