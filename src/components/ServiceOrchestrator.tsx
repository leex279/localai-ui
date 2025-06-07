import React, { useState, useEffect } from 'react';
import { CustomServicesJson, ServiceStatus } from '../types';
import { 
  serviceOrchestration, 
  flattenCustomServices, 
  updateServiceInCustomConfig,
  getServicesByCategory,
  getEnabledServices,
  resolveDependencies
} from '../utils/serviceOrchestration';

interface ServiceOrchestratorProps {
  className?: string;
}

export const ServiceOrchestrator: React.FC<ServiceOrchestratorProps> = ({ className = '' }) => {
  const [customServices, setCustomServices] = useState<CustomServicesJson | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('cpu');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCustomServices();
    loadServiceStatus();
  }, []);

  const loadCustomServices = async () => {
    try {
      setLoading(true);
      const config = await serviceOrchestration.getCustomServices();
      setCustomServices(config);
      
      // Set default profile and environment from config
      const defaultProfile = Object.entries(config.profiles || {}).find(([, p]) => p.default)?.[0] || 'cpu';
      const defaultEnvironment = Object.entries(config.environments || {}).find(([, e]) => e.default)?.[0] || 'private';
      setSelectedProfile(defaultProfile);
      setSelectedEnvironment(defaultEnvironment);
    } catch (err) {
      setError(`Failed to load services configuration: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceStatus = async () => {
    try {
      const status = await serviceOrchestration.getServiceStatus();
      setServiceStatus(status);
    } catch (err) {
      console.warn('Failed to load service status:', err);
    }
  };

  const handleServiceToggle = (serviceId: string, enabled: boolean) => {
    if (!customServices) return;

    const updatedConfig = updateServiceInCustomConfig(customServices, serviceId, { enabled });
    setCustomServices(updatedConfig);
  };

  const handleSaveConfiguration = async () => {
    if (!customServices) return;

    try {
      setLoading(true);
      await serviceOrchestration.updateCustomServices(customServices);
      setSaveMessage('Configuration saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setError(`Failed to save configuration: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartServices = async () => {
    if (!customServices) return;

    try {
      setLoading(true);
      const enabledServices = getEnabledServices(customServices, selectedProfile);
      const resolvedServices = resolveDependencies(customServices, enabledServices);
      
      await serviceOrchestration.startServices(resolvedServices, selectedProfile, selectedEnvironment);
      setSaveMessage('Services start request sent!');
      setTimeout(() => setSaveMessage(null), 3000);
      
      // Refresh service status
      await loadServiceStatus();
    } catch (err) {
      setError(`Failed to start services: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopServices = async () => {
    if (!customServices) return;

    try {
      setLoading(true);
      const enabledServices = getEnabledServices(customServices, selectedProfile);
      await serviceOrchestration.stopServices(enabledServices);
      setSaveMessage('Services stop request sent!');
      setTimeout(() => setSaveMessage(null), 3000);
      
      // Refresh service status
      await loadServiceStatus();
    } catch (err) {
      setError(`Failed to stop services: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !customServices) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!customServices) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-red-600">Failed to load services configuration</div>
      </div>
    );
  }

  const servicesByCategory = getServicesByCategory(customServices);
  const enabledServiceCount = flattenCustomServices(customServices).filter(s => s.enabled).length;

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Orchestrator</h2>
        <p className="text-gray-600">
          Configure which services to start in your local AI stack. 
          Currently {enabledServiceCount} services are enabled.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-900 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {saveMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {saveMessage}
        </div>
      )}

      {/* Profile and Environment Selection */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GPU Profile
          </label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(customServices.profiles || {}).map(([profile, config]) => (
              <option key={profile} value={profile}>
                {profile.toUpperCase()} - {config.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Environment
          </label>
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(customServices.environments || {}).map(([env, config]) => (
              <option key={env} value={env}>
                {env.charAt(0).toUpperCase() + env.slice(1)} - {config.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Services by Category */}
      <div className="space-y-6">
        {Object.entries(servicesByCategory).map(([category, services]) => (
          <div key={category} className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize">
              {category.replace('_', ' ')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((service) => {
                const status = serviceStatus.find(s => s.id === service.id);
                return (
                  <div key={service.id} className="border border-gray-100 rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={service.enabled}
                          onChange={(e) => handleServiceToggle(service.id, e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="font-medium text-gray-900">{service.name}</span>
                      </div>
                      {status && (
                        <span className={`px-2 py-1 text-xs rounded ${
                          status.status === 'running' ? 'bg-green-100 text-green-800' :
                          status.status === 'stopped' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {status.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                    {service.dependencies.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Depends on: {service.dependencies.join(', ')}
                      </div>
                    )}
                    {service.profiles && selectedProfile && service.profiles[selectedProfile] && (
                      <div className="text-xs text-blue-600 mt-1">
                        Using: {service.profiles[selectedProfile]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handleSaveConfiguration}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
        
        <button
          onClick={handleStartServices}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Start Selected Services'}
        </button>
        
        <button
          onClick={handleStopServices}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Stopping...' : 'Stop Services'}
        </button>
        
        <button
          onClick={loadServiceStatus}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh Status
        </button>
      </div>

      {/* Service Count Summary */}
      <div className="mt-4 text-sm text-gray-600">
        {enabledServiceCount} of {flattenCustomServices(customServices).length} services enabled
      </div>
    </div>
  );
};