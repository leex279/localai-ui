import express from 'express';
import { writeFile, mkdir, readFile } from 'fs/promises';
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

// Serve files from input directory
app.get('/api/files/input/*', async (req, res) => {
  try {
    const filePath = req.path.replace('/api/files/input/', '/app/input/');
    console.log(`Reading file: ${filePath}`);
    
    const content = await readFile(filePath, 'utf8');
    console.log(`File content length: ${content.length} bytes`);
    
    res.type('text/plain').send(content);
  } catch (error) {
    console.error(`Error reading file:`, error);
    res.status(500).json({ 
      error: 'Failed to read file',
      details: error.message,
      path: req.path
    });
  }
});

// Save compose file
app.post('/api/save-compose', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }
    
    const outputPath = '/app/output/docker-compose.yml';
    await ensureDirectoryExists(outputPath);
    await writeFile(outputPath, content, 'utf8');
    
    console.log(`File saved: ${outputPath}`);
    res.json({ success: true, path: outputPath });
  } catch (error) {
    console.error('Error saving compose file:', error);
    res.status(500).json({ error: 'Failed to save compose file', details: error.message });
  }
});

// Save env file
app.post('/api/save-env', async (req, res) => {
  try {
    const { content, path } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }
    
    const outputPath = path || '/app/output/.env';
    await ensureDirectoryExists(outputPath);
    await writeFile(outputPath, content, 'utf8');
    
    console.log(`Env file saved: ${outputPath}`);
    res.json({ success: true, path: outputPath });
  } catch (error) {
    console.error('Error saving env file:', error);
    res.status(500).json({ error: 'Failed to save env file', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving files from /app/input and saving to /app/output`);
});