import { ServiceDefinition, ServicesState } from '../types';

// Recursively find all dependencies for a service
export function resolveDependencies(
  serviceId: string,
  services: ServiceDefinition[],
  currentState: ServicesState
): string[] {
  const service = services.find((s) => s.id === serviceId);
  if (!service) return [];

  const dependencies = [...service.dependencies];
  
  // Recursively check dependencies of dependencies
  for (const depId of service.dependencies) {
    const childDeps = resolveDependencies(depId, services, currentState);
    for (const childDep of childDeps) {
      if (!dependencies.includes(childDep)) {
        dependencies.push(childDep);
      }
    }
  }
  
  return dependencies;
}

// Update service state based on selections and dependencies
export function updateServiceState(
  services: ServiceDefinition[],
  currentState: ServicesState,
  serviceId: string,
  selected: boolean
): ServicesState {
  const newState = { ...currentState };
  
  // Update the selected service
  newState[serviceId] = {
    ...newState[serviceId],
    selected
  };

  // If we're selecting this service, make sure all its dependencies are also selected
  if (selected) {
    const dependencies = resolveDependencies(serviceId, services, newState);
    
    // Select all dependencies
    for (const depId of dependencies) {
      newState[depId] = {
        ...newState[depId],
        selected: true,
        dependencyOf: [...(newState[depId]?.dependencyOf || []), serviceId]
      };
    }
  } else {
    // If we're deselecting, we need to remove this service from dependencyOf lists
    for (const svcId in newState) {
      if (newState[svcId].dependencyOf.includes(serviceId)) {
        newState[svcId] = {
          ...newState[svcId],
          dependencyOf: newState[svcId].dependencyOf.filter(id => id !== serviceId)
        };
      }
    }
    
    // Check if any dependencies are no longer needed by any service
    for (const svcId in newState) {
      if (newState[svcId].dependencyOf.length === 0 && !newState[svcId].required) {
        // This dependency is no longer needed by any service and is not user-selected
        const isDependencyOfAnything = Object.keys(newState).some(
          id => newState[id].selected && services.find(s => s.id === id)?.dependencies.includes(svcId)
        );
        
        if (!isDependencyOfAnything && !newState[svcId].selected) {
          newState[svcId] = { ...newState[svcId], selected: false };
        }
      }
    }
  }
  
  return newState;
}

// Initialize service state with all services selected
export function initializeServiceState(services: ServiceDefinition[]): ServicesState {
  const state: ServicesState = {};
  
  // First, initialize all services as selected
  for (const service of services) {
    state[service.id] = {
      selected: true, // Set all services as selected initially
      required: service.required,
      dependencyOf: []
    };
  }
  
  // Then, process dependencies
  for (const service of services) {
    if (service.dependencies.length > 0) {
      for (const depId of service.dependencies) {
        if (state[depId]) {
          state[depId].dependencyOf = [...(state[depId].dependencyOf || []), service.id];
        }
      }
    }
  }
  
  return state;
}