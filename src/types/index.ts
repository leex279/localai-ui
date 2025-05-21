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