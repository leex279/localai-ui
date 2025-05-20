import React, { useState, useEffect } from 'react';
import { ServiceDefinition, ServicesState, EnvVariable } from './types';
import { initializeServiceState, updateServiceState } from './utils/dependencyResolver';
import { generateComposeFile } from './utils/composeFileGenerator';
import { loadConfig, loadServicesFromReference } from './config';
import { loadEnvFile, saveEnvFile } from './utils/envFileHandler';
import ServiceSelector from './components/ServiceSelector';
import ComposeFilePreview from './components/ComposeFilePreview';
import DependencyGraph from './components/DependencyGraph';
import EnvConfigurator from './components/EnvConfigurator';
import Header from './components/Header';
import Navigation from './components/Navigation';

function App() {
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [serviceState, setServiceState] = useState<ServicesState>({});
  const [yamlContent, setYamlContent] = useState<string>('');
  const [showGraph, setShowGraph] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'env'>('compose');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const loadedConfig = await loadConfig();
        setConfig(loadedConfig);
        
        // Load services
        const loadedServices = await loadServicesFromReference(loadedConfig.referenceComposeFile);
        setServices(loadedServices);
        setServiceState(initializeServiceState(loadedServices));
        
        // Load environment variables from the reference file
        const loadedEnvVars = await loadEnvFile(loadedConfig.referenceEnvFile);
        setEnvVariables(loadedEnvVars);
      } catch (err) {
        setError('Failed to load configuration');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadInitialData();
  }, []);
  
  // Generate the compose file whenever service state changes
  useEffect(() => {
    const yaml = generateComposeFile(services, serviceState);
    setYamlContent(yaml);
  }, [serviceState, services]);
  
  // Handle service toggling
  const handleToggleService = (serviceId: string, selected: boolean) => {
    const newState = updateServiceState(services, serviceState, serviceId, selected);
    setServiceState(newState);
  };
  
  // Handle downloading the compose file
  const handleDownload = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle saving env variables
  const handleSaveEnv = async () => {
    try {
      await saveEnvFile(envVariables, config.outputPath);
    } catch (error) {
      console.error('Failed to save env file:', error);
    }
  };
  
  // Calculate selected services count
  const selectedCount = Object.values(serviceState).filter(s => s.selected).length;
  const totalCount = services.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            {activeTab === 'compose' 
              ? 'Select the services you need for your Docker environment. Our intelligent system will automatically handle dependencies and generate a production-ready compose file for you.'
              : 'Configure your environment variables. These settings will be saved to your .env file.'}
          </p>
        </div>

        {activeTab === 'compose' ? (
          <div className="flex flex-col md:flex-row items-start gap-8">
            {/* Left Column - Service Selector */}
            <div className="w-full md:w-1/2 space-y-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Services</h2>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedCount}/{totalCount} selected
                  </div>
                </div>
                
                <div className="mb-4">
                  <button
                    onClick={() => setShowGraph(!showGraph)}
                    className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                  >
                    {showGraph ? 'Hide Dependency Graph' : 'Show Dependency Graph'}
                  </button>
                </div>
                
                {showGraph && (
                  <DependencyGraph 
                    services={services} 
                    state={serviceState} 
                  />
                )}
                
                <ServiceSelector
                  services={services}
                  state={serviceState}
                  onToggle={handleToggleService}
                />
              </div>
            </div>
            
            {/* Right Column - YAML Preview */}
            <div className="w-full md:w-1/2">
              <ComposeFilePreview 
                yamlContent={yamlContent}
                onDownload={handleDownload}
              />
            </div>
          </div>
        ) : (
          <EnvConfigurator
            variables={envVariables}
            onChange={setEnvVariables}
            onSave={handleSaveEnv}
          />
        )}
      </main>
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Docker Compose Configurator - Generate customized Docker configurations</p>
        </div>
      </footer>
    </div>
  );
}

export default App;