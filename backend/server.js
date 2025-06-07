import express from 'express';
import { writeFile, mkdir, readFile, access, constants } from 'fs/promises';
import { dirname, join } from 'path';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create directories if they don't exist
async function ensureDirectoryExists(filePath) {
  const dir = dirname(filePath);
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Check if file exists and is readable
async function checkFileAccess(filePath) {
  try {
    await access(filePath, constants.F_OK | constants.R_OK);
    return true;
  } catch (error) {
    console.error(`File access check failed for ${filePath}:`, error.code);
    return false;
  }
}

// List directory contents
app.get('/api/list-dir/:path(*)', async (req, res) => {
  try {
    const requestedPath = req.params.path;
    const fullPath = join('/app', requestedPath);
    console.log(`[DEBUG] Listing directory: ${fullPath}`);
    
    const { readdir } = await import('fs/promises');
    const files = await readdir(fullPath, { withFileTypes: true });
    
    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: join(requestedPath, file.name)
    }));
    
    console.log(`[DEBUG] Found ${fileList.length} files/directories in ${fullPath}`);
    res.json(fileList);
  } catch (error) {
    console.error(`[ERROR] Error listing directory:`, error);
    res.status(500).json({ 
      error: 'Failed to list directory',
      details: error.message,
      path: req.params.path
    });
  }
});

// Serve files from input directory
app.get('/api/files/input/*', async (req, res) => {
  try {
    const requestPath = req.path;
    const filePath = requestPath.replace('/api/files/input/', '/app/input/');
    console.log(`[DEBUG] Request path: ${requestPath}`);
    console.log(`[DEBUG] Reading file: ${filePath}`);
    
    // Check if file exists before attempting to read
    const fileExists = await checkFileAccess(filePath);
    if (!fileExists) {
      console.error(`[ERROR] File does not exist or is not readable: ${filePath}`);
      return res.status(404).json({
        error: 'File not found or not readable',
        path: filePath
      });
    }
    
    const content = await readFile(filePath, 'utf8');
    console.log(`[DEBUG] File content length: ${content.length} bytes`);
    console.log(`[DEBUG] First 100 chars: ${content.substring(0, 100)}...`);
    
    res.type('text/plain').send(content);
  } catch (error) {
    console.error(`[ERROR] Error reading file:`, error);
    res.status(500).json({ 
      error: 'Failed to read file',
      details: error.message,
      code: error.code,
      path: req.path
    });
  }
});

// Save compose file
app.post('/api/save-compose', async (req, res) => {
  try {
    const { content } = req.body;
    console.log(`[DEBUG] Save compose request received. Content length: ${content ? content.length : 0} bytes`);
    
    if (!content) {
      console.error(`[ERROR] No content provided for save compose`);
      return res.status(400).json({ error: 'No content provided' });
    }
    
    const outputPath = '/app/output/docker-compose.yml';
    console.log(`[DEBUG] Saving compose file to: ${outputPath}`);
    
    await ensureDirectoryExists(outputPath);
    await writeFile(outputPath, content, 'utf8');
    
    console.log(`[DEBUG] File saved successfully: ${outputPath}`);
    res.json({ success: true, path: outputPath });
  } catch (error) {
    console.error('[ERROR] Error saving compose file:', error);
    res.status(500).json({ 
      error: 'Failed to save compose file', 
      details: error.message,
      code: error.code
    });
  }
});

// Save env file
app.post('/api/save-env', async (req, res) => {
  try {
    const { content, path } = req.body;
    console.log(`[DEBUG] Save env request received. Content length: ${content ? content.length : 0} bytes`);
    
    if (!content) {
      console.error(`[ERROR] No content provided for save env`);
      return res.status(400).json({ error: 'No content provided' });
    }
    
    const outputPath = path || '/app/output/.env';
    console.log(`[DEBUG] Saving env file to: ${outputPath}`);
    
    await ensureDirectoryExists(outputPath);
    await writeFile(outputPath, content, 'utf8');
    
    console.log(`[DEBUG] Env file saved successfully: ${outputPath}`);
    res.json({ success: true, path: outputPath });
  } catch (error) {
    console.error('[ERROR] Error saving env file:', error);
    res.status(500).json({ 
      error: 'Failed to save env file', 
      details: error.message,
      code: error.code
    });
  }
});

// Get custom services configuration
app.get('/api/custom-services', async (req, res) => {
  try {
    console.log(`[DEBUG] Get custom services config request received`);
    
    const sharedPath = '/app/shared/custom_services.json';
    
    // Check if custom services file exists
    const fileExists = await checkFileAccess(sharedPath);
    if (!fileExists) {
      console.log(`[DEBUG] Custom services file not found, returning default config`);
      // Return a default configuration if file doesn't exist
      const defaultConfig = {
        version: "1.0",
        description: "Configuration file for customizing which services to start in the local AI stack",
        services: {},
        profiles: {
          cpu: { description: "CPU-only mode for Ollama", default: true },
          "gpu-nvidia": { description: "NVIDIA GPU support for Ollama", default: false },
          "gpu-amd": { description: "AMD GPU support for Ollama with ROCm", default: false },
          none: { description: "No local Ollama (for external instances)", default: false }
        },
        environments: {
          private: { description: "Development mode with all ports exposed", default: true },
          public: { description: "Production mode with only ports 80/443 exposed", default: false }
        }
      };
      return res.json(defaultConfig);
    }
    
    const content = await readFile(sharedPath, 'utf8');
    const config = JSON.parse(content);
    
    console.log(`[DEBUG] Custom services config loaded successfully`);
    res.json(config);
  } catch (error) {
    console.error('[ERROR] Error loading custom services config:', error);
    res.status(500).json({ 
      error: 'Failed to load custom services config', 
      details: error.message,
      code: error.code
    });
  }
});

// Save custom services configuration
app.post('/api/custom-services', async (req, res) => {
  try {
    const { config } = req.body;
    console.log(`[DEBUG] Save services config request received`);
    
    if (!config) {
      console.error(`[ERROR] No config provided for save services config`);
      return res.status(400).json({ error: 'No config provided' });
    }
    
    // Save to both output directory and shared directory (where start_services.py expects it)
    const outputPath = '/app/output/custom_services.json';
    const sharedPath = '/app/shared/custom_services.json';
    
    console.log(`[DEBUG] Saving services config to: ${outputPath} and ${sharedPath}`);
    
    const configJson = JSON.stringify(config, null, 2);
    
    await ensureDirectoryExists(outputPath);
    await writeFile(outputPath, configJson, 'utf8');
    
    // Also save to shared directory so start_services.py can access it
    await ensureDirectoryExists(sharedPath);
    await writeFile(sharedPath, configJson, 'utf8');
    
    console.log(`[DEBUG] Services config saved successfully`);
    res.json({ success: true, paths: [outputPath, sharedPath] });
  } catch (error) {
    console.error('[ERROR] Error saving services config:', error);
    res.status(500).json({ 
      error: 'Failed to save services config', 
      details: error.message,
      code: error.code
    });
  }
});

// Get service status (placeholder for future Docker integration)
app.get('/api/service-status', async (req, res) => {
  try {
    console.log(`[DEBUG] Service status request received`);
    
    // For now, return mock data. In the future, this would integrate with Docker API
    const mockStatus = [
      { id: 'n8n', name: 'n8n', status: 'stopped', health: 'unknown' },
      { id: 'ollama-cpu', name: 'Ollama (CPU)', status: 'stopped', health: 'unknown' },
      { id: 'open-webui', name: 'Open WebUI', status: 'stopped', health: 'unknown' },
      { id: 'flowise', name: 'Flowise', status: 'stopped', health: 'unknown' }
    ];
    
    res.json(mockStatus);
  } catch (error) {
    console.error('[ERROR] Error getting service status:', error);
    res.status(500).json({ 
      error: 'Failed to get service status', 
      details: error.message
    });
  }
});

// Start services (placeholder for future integration with start_services.py)
app.post('/api/start-services', async (req, res) => {
  try {
    const { serviceIds, profile, environment } = req.body;
    console.log(`[DEBUG] Start services request: ${JSON.stringify({ serviceIds, profile, environment })}`);
    
    // For now, just acknowledge the request
    // In the future, this would call start_services.py with the --services flag
    res.json({ 
      success: true, 
      message: 'Service start request received (not implemented yet)',
      serviceIds,
      profile,
      environment
    });
  } catch (error) {
    console.error('[ERROR] Error starting services:', error);
    res.status(500).json({ 
      error: 'Failed to start services', 
      details: error.message
    });
  }
});

// Stop services (placeholder for future integration)
app.post('/api/stop-services', async (req, res) => {
  try {
    const { serviceIds } = req.body;
    console.log(`[DEBUG] Stop services request: ${JSON.stringify({ serviceIds })}`);
    
    // For now, just acknowledge the request
    res.json({ 
      success: true, 
      message: 'Service stop request received (not implemented yet)',
      serviceIds
    });
  } catch (error) {
    console.error('[ERROR] Error stopping services:', error);
    res.status(500).json({ 
      error: 'Failed to stop services', 
      details: error.message
    });
  }
});

// Legacy endpoint for backward compatibility
app.post('/api/save-services-config', async (req, res) => {
  // Redirect to the new endpoint
  const { config } = req.body;
  req.body = { config };
  req.url = '/api/custom-services';
  req.method = 'POST';
  return app._router.handle(req, res);
});

// Add a route to check server status and volume mounts
app.get('/api/status', async (req, res) => {
  try {
    console.log(`[DEBUG] Status check requested`);
    
    // Check input directory
    const inputPath = '/app/input';
    let inputStatus;
    try {
      await access(inputPath, constants.F_OK | constants.R_OK);
      const { readdir } = await import('fs/promises');
      const inputFiles = await readdir(inputPath);
      inputStatus = {
        accessible: true,
        files: inputFiles
      };
      console.log(`[DEBUG] Input directory accessible. Files: ${inputFiles.join(', ')}`);
    } catch (error) {
      inputStatus = {
        accessible: false,
        error: error.message,
        code: error.code
      };
      console.error(`[ERROR] Input directory not accessible:`, error);
    }
    
    // Check output directory
    const outputPath = '/app/output';
    let outputStatus;
    try {
      await access(outputPath, constants.F_OK | constants.R_OK | constants.W_OK);
      outputStatus = { 
        accessible: true,
        writable: true
      };
      console.log(`[DEBUG] Output directory accessible and writable`);
    } catch (error) {
      outputStatus = {
        accessible: false,
        error: error.message,
        code: error.code
      };
      console.error(`[ERROR] Output directory not accessible:`, error);
    }
    
    // Check specific files
    const composeFilePath = '/app/input/docker-compose.yml';
    let composeFileStatus;
    try {
      await access(composeFilePath, constants.F_OK | constants.R_OK);
      const stats = await import('fs/promises').then(fs => fs.stat(composeFilePath));
      composeFileStatus = {
        exists: true,
        size: stats.size,
        isFile: stats.isFile()
      };
      console.log(`[DEBUG] docker-compose.yml exists. Size: ${stats.size} bytes`);
    } catch (error) {
      composeFileStatus = {
        exists: false,
        error: error.message,
        code: error.code
      };
      console.error(`[ERROR] docker-compose.yml not accessible:`, error);
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        API_URL: process.env.VITE_API_URL
      },
      volumes: {
        input: inputStatus,
        output: outputStatus
      },
      files: {
        dockerCompose: composeFileStatus
      }
    });
  } catch (error) {
    console.error('[ERROR] Status check failed:', error);
    res.status(500).json({ error: 'Status check failed', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[INFO] Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`[INFO] Serving files from /app/input and saving to /app/output`);
  
  // Log all environment variables for debugging
  console.log('[DEBUG] Environment variables:');
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('VITE_') || key === 'PORT' || key === 'NODE_ENV') {
      console.log(`[DEBUG] ${key}: ${value}`);
    }
  }
});