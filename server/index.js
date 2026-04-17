import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { ensureDataDir } from './services/storyManager.js';
import storiesRouter from './routes/stories.js';
import cardsRouter from './routes/cards.js';
import configRouter, { loadSavedConfig } from './routes/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/stories', storiesRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/config', configRouter);

// SPA fallback — serve index.html for non-API routes
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// Start server
async function start() {
  await ensureDataDir();
  await loadSavedConfig();

  app.listen(config.port, () => {
    console.log('');
    console.log('  ✒️  Quill is running');
    console.log(`  📍 http://localhost:${config.port}`);
    console.log(`  🤖 LLM: ${config.llm.apiUrl} (model: ${config.llm.model})`);
    console.log('');
  });
}

start().catch(console.error);
