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
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing...');
  
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setLoadingStatus('Loading configuration...');
        
        console.log('[DEBUG] App starting, window.location:', window.location.toString());
        
        const loadedConfig = await loadConfig();
        
        // Fix API URL for Docker if needed
        if (window.location.hostname !== 'localhost') {
          loadedConfig.apiBaseUrl = loadedConfig.apiBaseUrl.replace('localhost', window.location.hostname);
        }
        
        setConfig(loadedConfig);
        console.log('[DEBUG] Config loaded with API URL:', loadedConfig.apiBaseUrl);
        
        // Check server status
        setLoadingStatus('Checking server connectivity...');
        try {
          const statusResponse = await fetch(`${loadedConfig.apiBaseUrl}/api/status`);
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            console.log('[DEBUG] Server status:', status);
            
            if (!status.volumes.input.accessible) {
              throw new Error('Input volume is not accessible: ' + status.volumes.input.error);
            }
            
            if (!status.files.dockerCompose.exists) {
              throw new Error('docker-compose.yml not found: ' + status.files.dockerCompose.error);
            }
          } else {
            console.error('[ERROR] Server status check failed:', statusResponse.statusText);
          }
        } catch (statusError) {
          console.error('[ERROR] Error checking server status:', statusError);
          // Continue anyway, we'll try to load the services directly
        }
        
        // Load services
        setLoadingStatus('Loading services...');
        try {
          const loadedServices = await loadServicesFromReference(loadedConfig.referenceComposeFile);
          console.log(`[DEBUG] Loaded ${loadedServices.length} services`);
          setServices(loadedServices);
          setServiceState(initializeServiceState(loadedServices));
        } catch (servicesError) {
          console.error('[ERROR] Failed to load services:', servicesError);
          throw new Error(`Failed to load services: ${servicesError.message}`);
        }
        
        // Load environment variables from the reference file
        setLoadingStatus('Loading environment variables...');
        try {
          const loadedEnvVars = await loadEnvFile(loadedConfig.referenceEnvFile);
          setEnvVariables(loadedEnvVars);
          console.log(`[DEBUG] Loaded ${loadedEnvVars.length} environment variables`);
        } catch (envError) {
          console.error('[ERROR] Failed to load env file, using default empty array:', envError);
          setEnvVariables([]);
        }
      } catch (err) {
        console.error('[ERROR] Failed to load configuration:', err);
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
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
  const handleSaveEnv = async (variables: EnvVariable[]) => {
    try {
      setEnvVariables(variables);
      await saveEnvFile(variables, config.outputPath);
    } catch (error) {
      console.error('[ERROR] Failed to save env file:', error);
    }
  };
  
  // Manual retry loading
  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if the docker-compose.yml file exists directly
      const loadedConfig = await loadConfig();
      console.log('[DEBUG] Retry: Checking server status...');
      
      const statusResponse = await fetch(`${loadedConfig.apiBaseUrl}/api/status`);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('[DEBUG] Retry: Server status:', status);
      }
      
      // Try to load services again
      console.log('[DEBUG] Retry: Loading services...');
      const loadedServices = await loadServicesFromReference(loadedConfig.referenceComposeFile);
      console.log(`[DEBUG] Retry: Loaded ${loadedServices.length} services`);
      setServices(loadedServices);
      setServiceState(initializeServiceState(loadedServices));
      
      // Try to load environment variables again
      console.log('[DEBUG] Retry: Loading environment variables...');
      const loadedEnvVars = await loadEnvFile(loadedConfig.referenceEnvFile);
      setEnvVariables(loadedEnvVars);
    } catch (err) {
      console.error('[ERROR] Retry failed:', err);
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate selected services count
  const selectedCount = Object.values(serviceState).filter(s => s.selected).length;
  const totalCount = services.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400 flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <div className="text-lg">{loadingStatus}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400 max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Error Loading Configuration</h2>
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
            {error}
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Please check that the Docker container has proper access to the mounted files.
          </div>
          <button 
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Retry Loading
          </button>
        </div>
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