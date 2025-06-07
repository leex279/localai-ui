import React from 'react';
import { ServiceDefinition, ServicesState } from '../types';
import ServiceCard from './ServiceCard';

interface ServiceSelectorProps {
  services: ServiceDefinition[];
  state: ServicesState;
  onToggle: (id: string, selected: boolean) => void;
}

export default function ServiceSelector({ services, state, onToggle }: ServiceSelectorProps) {
  // Group services by category
  const categories = {
    ai: services.filter(s => s.category === 'ai'),
    database: services.filter(s => s.category === 'database'),
    infrastructure: services.filter(s => s.category === 'infrastructure'),
    utility: services.filter(s => s.category === 'utility')
  };
  
  const categoryTitles = {
    ai: 'AI & Machine Learning',
    database: 'Databases & Storage',
    infrastructure: 'Infrastructure',
    utility: 'Utilities & Tools'
  };
  
  // Get the count of selected services for each category
  const getSelectedCount = (category: string) => {
    return services
      .filter(s => s.category === category)
      .filter(s => state[s.id]?.selected)
      .length;
  };

  return (
    <div className="space-y-6">
      {(Object.keys(categories) as Array<keyof typeof categories>).map(category => {
        if (categories[category].length === 0) return null;
        
        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {categoryTitles[category]}
              </h2>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {getSelectedCount(category)}/{categories[category].length} selected
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {categories[category].map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  state={state}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}