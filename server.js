import express from 'express';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/save-compose', async (req, res) => {
  try {
    const { content } = req.body;
    const outputPath = join(process.cwd(), 'output', 'docker-compose-custom.yml');
    
    await writeFile(outputPath, content, 'utf8');
    
    res.json({ success: true, path: outputPath });
  } catch (error) {
    console.error('Error saving compose file:', error);
    res.status(500).json({ error: 'Failed to save compose file' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`File server running on port ${PORT}`);
});