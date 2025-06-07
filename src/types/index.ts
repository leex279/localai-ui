export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'database' | 'infrastructure' | 'utility';
  dependencies: string[];
  required: boolean;
  image?: string;
  ports?: string[];
  environment?: string[];
  volumes?: string[];
  originalConfig: any;
}

// Custom services configuration structure
export interface CustomServiceConfig {
  enabled: boolean;
  required: boolean;
  description: string;
  category: string;
  dependencies: string[];
  profiles?: {
    [profile: string]: string;
  };
  pull_services?: {
    [profile: string]: string;
  };
  external_compose?: boolean;
  compose_path?: string;
}

export interface CustomServicesJson {
  version: string;
  description: string;
  services: {
    [category: string]: {
      [serviceId: string]: CustomServiceConfig;
    };
  };
  profiles: {
    [profile: string]: {
      description: string;
      default: boolean;
    };
  };
  environments: {
    [environment: string]: {
      description: string;
      default: boolean;
    };
  };
}

export interface ServiceState {
  selected: boolean;
  required: boolean;
  dependencyOf: string[];
}

export interface ServicesState {
  [key: string]: ServiceState;
}

export interface EnvVariable {
  key: string;
  value: string;
  description?: string;
  required: boolean;
}

export interface EnvConfig {
  variables: EnvVariable[];
}

export interface ComposeIncludes {
  [path: string]: boolean;
}

export interface ServiceStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  health?: 'healthy' | 'unhealthy' | 'starting';
}

export interface ServiceOrchestrationAPI {
  getCustomServices(): Promise<CustomServicesJson>;
  updateCustomServices(config: CustomServicesJson): Promise<void>;
  getServiceStatus(): Promise<ServiceStatus[]>;
  startServices(serviceIds: string[], profile: string, environment: string): Promise<void>;
  stopServices(serviceIds: string[]): Promise<void>;
}