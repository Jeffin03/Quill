import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000'),
  llm: {
    apiUrl: process.env.LLM_API_URL || 'http://localhost:5000/v1',
    model: process.env.LLM_MODEL || 'default',
    apiKey: process.env.LLM_API_KEY || '',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.85'),
  },
  dataDir: process.env.DATA_DIR || './data/stories',
};

// Mutable runtime config (can be updated via API)
export const runtimeConfig = { ...config.llm };

export default config;
