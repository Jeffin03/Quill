import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runtimeConfig } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '..', '..', 'data', 'config.json');

const router = Router();

/**
 * Load saved config from disk and merge into runtimeConfig.
 * Called once on server startup.
 */
export async function loadSavedConfig() {
  try {
    const data = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
    if (data.apiUrl) runtimeConfig.apiUrl = data.apiUrl;
    if (data.model) runtimeConfig.model = data.model;
    if (data.apiKey) runtimeConfig.apiKey = data.apiKey;
    if (data.maxTokens) runtimeConfig.maxTokens = data.maxTokens;
    if (data.temperature !== undefined) runtimeConfig.temperature = data.temperature;
    console.log('  📂 Loaded saved LLM config from data/config.json');
  } catch {
    // No saved config yet — use .env defaults
  }
}

/**
 * Persist current config to disk.
 */
async function saveConfig() {
  const data = {
    apiUrl: runtimeConfig.apiUrl,
    model: runtimeConfig.model,
    apiKey: runtimeConfig.apiKey,
    maxTokens: runtimeConfig.maxTokens,
    temperature: runtimeConfig.temperature,
  };
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2));
}

// Get current LLM configuration
router.get('/', (req, res) => {
  res.json({
    apiUrl: runtimeConfig.apiUrl,
    model: runtimeConfig.model,
    maxTokens: runtimeConfig.maxTokens,
    temperature: runtimeConfig.temperature,
    // Don't expose the API key
    hasApiKey: !!runtimeConfig.apiKey,
  });
});

// Update LLM configuration at runtime (persists to disk)
router.put('/', async (req, res) => {
  const { apiUrl, model, apiKey, maxTokens, temperature } = req.body;

  if (apiUrl !== undefined) runtimeConfig.apiUrl = apiUrl;
  if (model !== undefined) runtimeConfig.model = model;
  if (apiKey !== undefined) runtimeConfig.apiKey = apiKey;
  if (maxTokens !== undefined) runtimeConfig.maxTokens = parseInt(maxTokens);
  if (temperature !== undefined) runtimeConfig.temperature = parseFloat(temperature);

  // Persist so it survives restarts
  await saveConfig();

  res.json({
    apiUrl: runtimeConfig.apiUrl,
    model: runtimeConfig.model,
    maxTokens: runtimeConfig.maxTokens,
    temperature: runtimeConfig.temperature,
    hasApiKey: !!runtimeConfig.apiKey,
  });
});

export default router;
