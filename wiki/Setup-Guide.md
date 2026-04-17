# Setup Guide

## Prerequisites

- **Node.js** v18+ (tested with v25)
- **npm** v8+
- An LLM backend that exposes an OpenAI-compatible API

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Quill

# Install dependencies
npm install

# Create your config file
cp .env.example .env
```

## Configuration

### Option 1: Edit the `.env` file (recommended for first setup)

```env
# LLM API endpoint (must be OpenAI-compatible)
LLM_API_URL=http://localhost:11434/v1

# Model name (depends on your provider)
LLM_MODEL=mistral

# API key (leave empty if not needed)
LLM_API_KEY=

# Generation settings
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.85

# Server port
PORT=3000
```

### Option 2: Use the in-app Settings modal

Click the ⚙ button in the app to configure the LLM at runtime. These settings are saved to `data/config.json` and persist across restarts.

---

## LLM Provider Setup

Quill works with any backend that exposes an OpenAI-compatible `/v1/chat/completions` endpoint. Here are specific instructions for popular options:

### Ollama (Local)

The easiest way to run a local model.

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull mistral        # Good general purpose
ollama pull llama3         # Meta's latest
ollama pull dolphin-mistral # Uncensored variant

# Ollama serves automatically on install
```

**Quill settings:**
```
API URL:  http://localhost:11434/v1
Model:    mistral (or whichever you pulled)
API Key:  (leave empty)
```

---

### Google Colab (Free GPU)

Run a model on Colab's free GPU and connect to it remotely. This is ideal if your local machine can't run large models.

#### Using text-generation-webui

1. Open the [text-generation-webui Colab notebook](https://github.com/oobabooga/text-generation-webui#google-colab-notebook)
2. Run all cells — it will download and start the model
3. Enable the **OpenAI-compatible API** extension in the UI
4. Copy the public URL (it will look like `https://xxxxx.gradio.live`)

**Quill settings:**
```
API URL:  https://xxxxx.gradio.live/v1
Model:    (whatever model you loaded)
API Key:  (leave empty)
```

#### Using vLLM

1. Create a new Colab notebook with a GPU runtime
2. Install and run vLLM:

```python
!pip install vllm

from vllm import LLM, SamplingParams
from vllm.entrypoints.openai.api_server import run_server

# This starts an OpenAI-compatible server
!python -m vllm.entrypoints.openai.api_server \
    --model mistralai/Mistral-7B-Instruct-v0.2 \
    --port 8000
```

3. Use a tunnel (ngrok or localtunnel) to expose the port

**Quill settings:**
```
API URL:  https://your-tunnel-url/v1
Model:    mistralai/Mistral-7B-Instruct-v0.2
API Key:  (leave empty)
```

---

### LM Studio (Local, GUI)

A desktop app for running local models with a nice UI.

1. Download [LM Studio](https://lmstudio.ai/)
2. Download a model from the in-app browser
3. Go to the **Local Server** tab and start the server

**Quill settings:**
```
API URL:  http://localhost:1234/v1
Model:    (auto-detected by LM Studio)
API Key:  (leave empty)
```

---

### OpenRouter (Cloud, Multiple Models)

An aggregator that gives you access to many models through one API. Some models have free tiers.

1. Sign up at [openrouter.ai](https://openrouter.ai/)
2. Get your API key from the dashboard

**Quill settings:**
```
API URL:  https://openrouter.ai/api/v1
Model:    mistralai/mistral-7b-instruct:free
API Key:  sk-or-v1-xxxxx
```

**Free models available on OpenRouter:**
- `mistralai/mistral-7b-instruct:free`
- `meta-llama/llama-3-8b-instruct:free`
- `google/gemma-7b-it:free`

> ⚠️ Free models have rate limits. Paid models give better quality and speed.

---

### Together.ai (Cloud)

1. Sign up at [together.ai](https://together.ai/) (free credits on signup)
2. Get your API key

**Quill settings:**
```
API URL:  https://api.together.xyz/v1
Model:    meta-llama/Llama-3-70b-chat-hf
API Key:  your-together-api-key
```

---

### Groq (Cloud, Very Fast)

1. Sign up at [groq.com](https://groq.com/) (free tier available)
2. Get your API key

**Quill settings:**
```
API URL:  https://api.groq.com/openai/v1
Model:    llama-3.3-70b-versatile
API Key:  gsk_xxxxx
```

> ⚠️ Groq has content policies that may filter explicit content.

---

## Running Quill

```bash
# Standard start
npm start

# Development mode (auto-restart on file changes)
npm run dev
```

Open `http://localhost:3000` in your browser.

## Recommended Models for Fanfic Writing

| Model | Size | Best For | Censored? |
|---|---|---|---|
| `Mistral-7B-Instruct` | 7B | Good baseline, fast | Lightly filtered |
| `Llama-3-70B` | 70B | Excellent prose quality | Moderate filtering |
| `Dolphin-Mistral` | 7B | Uncensored variant | No |
| `Mythomax-13B` | 13B | Creative/fiction focused | No |
| `Nous-Hermes-2-Mixtral` | 8x7B | High quality, creative | Lightly filtered |

> For the best experience, use the largest model your setup can handle. Larger models produce better prose, more consistent characters, and respect pacing directives more reliably.

## Data & Backups

- **Stories** are saved as JSON files in `data/stories/`
- **LLM config** is saved in `data/config.json`
- To **backup**: copy the entire `data/` directory
- To **share a story**: send the `.json` file — the recipient drops it into their `data/stories/`
- To **reset**: delete `data/stories/*.json` and `data/config.json`
