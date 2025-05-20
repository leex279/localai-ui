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
    const filePath = req.path.replace('/api/files/input/', '/app/input/');
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