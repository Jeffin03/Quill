# 🛠️ Setup Guide

Quill is a client-side studio that connects to your AI "brain" via an API. This guide covers how to configure your LLM, whether it's running on your own computer or in the cloud.

## 1. Installation & PWA
Quill is a **Progressive Web App**. You don't need an app store; you "install" it directly from your browser:
- **Phone**: Open `https://jeffin03.github.io/Quill/` in Safari/Chrome → "Add to Home Screen".
- **Desktop**: Open in Chrome/Edge → Click the "Install" icon in the address bar.


### System Requirements for Local Tunneling
If you want to use your local PC's models on your phone or via the public web app, you'll need these packages to run the `start-llm.sh` script:

- **`cloudflared`**: The tunnel engine.
- **`qrencode`**: To generate the QR code in your terminal.

**Install on Arch Linux:** `yay -S cloudflared qrencode`  
**Install on Ubuntu/Debian:** `sudo apt install cloudflared qrencode`

---

## 2. LLM Provider Setup
Quill works with any backend that exposes an OpenAI-compatible `/v1` endpoint.

### Ollama (Local - Recommended)
The best way to run models for private, unrestricted writing.

1.  **Install**: `curl -fsSL https://ollama.com/install.sh | sh`
2.  **Pull Models**:
    - `ollama pull dolphin-llama3` (Recommended for creative freedom)
    - `ollama pull hf.co/mradermacher/Llama-3.2-3B-Instruct-Abliterated-GGUF`
3.  **Tunnel for Web Access**:
    If you are using the public web app, you must expose your local Ollama via a secure tunnel:
    ```bash
    bash start-llm.sh
    ```
    Scan the **QR Code** in the terminal using the 📷 button in Quill's settings.

**Quill settings:**
- **URL**: `https://your-tunnel-url/v1` (or scan QR)
- **Model**: `dolphin-llama3`

---

### LM Studio (Local GUI)
1.  Download [LM Studio](https://lmstudio.ai/).
2.  Go to the **Local Server** tab and start the server.
3.  Ensure "CORS" is enabled in LM Studio settings.

**Quill settings:**
- **URL**: `http://localhost:1234/v1` (If using the web app, you must tunnel this port).
- **Model**: (Auto-detected)

---

### Groq (Cloud - Blazing Fast)
1.  Sign up at [groq.com](https://groq.com/) and get an API key.
2.  **Quill settings**:
    - **URL**: `https://api.groq.com/openai/v1`
    - **Model**: `llama-3.3-70b-versatile`
    - **API Key**: `gsk_xxxx...`

---

### OpenRouter (Cloud - Multiple Models)
Access dozens of models through one API, including free ones.
1.  Sign up at [openrouter.ai](https://openrouter.ai/).
2.  **Quill settings**:
    - **URL**: `https://openrouter.ai/api/v1`
    - **Model**: `mistralai/mistral-7b-instruct:free`
    - **API Key**: `sk-or-v1-xxxx...`

---

## 3. In-App Features

### 🧠 Smart Model History
You don't need to type model names every time.
- **Double-click** the Model field in settings to see your last 10 used models.
- Quill automatically remembers every model you successfully save.

### ❤️ Live Connection Status
- **Green Pill (Online)**: Your AI is reachable.
- **Red Pill (Offline)**: Quill cannot reach the API. Check your internet or tunnel.
- **Shortcut**: Click the status indicator on the home screen to jump straight to settings.

---

## 4. Recommended Models for Writing

| Model | Size | Best For |
|---|---|---|
| **Dolphin-Llama3** | 8B | Fast, unrestricted, follows complex creative directions. |
| **Llama-3.2-Abliterated** | 3B | Extremely fast, perfect for mobile and creative freedom. |
| **Llama-3-70B** (Groq) | 70B | Elite prose quality and high intelligence. |
| **Mythomax-13B** | 13B | Specifically tuned for story-telling and roleplay. |

---

## 5. Data & Backups
Unlike traditional apps, **Quill is local-first**.
- **Storage**: Your stories and settings live in your browser's **IndexedDB**.
- **Backup**: Use the **"Export JSON"** button inside a story frequently.
- **Cloud Sync**: To move a story to another device, export the JSON and use the **"Import"** button on the new device's home screen.

> ⚠️ **Warning**: Clearing your browser cache or "Site Data" will delete your stories. Always keep backups of your favorite timelines!

---

## 6. Privacy & Security

Quill is designed to be a private sanctuary for your writing. Here is how we handle your data:

### Local Storage
Your stories never leave your device. They are stored in your browser's **IndexedDB**. We do not have a database, we do not have accounts, and we cannot "see" your stories.

### The Cloudflare Tunnel (`start-llm.sh`)
If you use the tunnel to connect your phone to your PC:
- **How it works**: It creates a secure bridge so the web app can talk to your local model.
- **Privacy**: Prompts and responses pass through Cloudflare's secure network. While they do not store this data, they act as a proxy.
- **Is it required?**: No. If you only write on the same computer that runs the model, you can connect directly via `localhost` and skip the tunnel entirely.

### QR Scanning
The QR scanner is a local utility. It parses the URL and model name from the code and saves them directly to your device's settings. **No data is sent to any server during the scanning process.**

### LLM Traffic
When you generate prose, your story's context is sent to your **chosen LLM endpoint**. 
- If you use **Ollama/LM Studio**, your data stays on your hardware.
- If you use **Groq/OpenRouter/OpenAI**, your data is subject to their respective privacy policies.
