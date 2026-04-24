# Setup Guide

## 1. Quick Launch (Public Web)

The fastest way to use Quill is through the live web app:
**👉 [Launch Quill](https://jeff-m-2024.github.io/quill/)**

Since Quill is a PWA (Progressive Web App), you can install it on your device:
- **Phone**: Open in Safari/Chrome → "Add to Home Screen"
- **Desktop**: Open in Chrome/Edge → Click the "Install" icon in the address bar.

## 2. Setting Up your LLM

Quill requires an OpenAI-compatible API to generate text. You can use local models (free/private) or cloud services.

### Local LLM Setup (The "Uncensored" Method)
To use local models (like Ollama) with the public web app, you must expose them through a secure tunnel.

#### On Arch/Linux:
1.  **Install tools**:
    ```bash
    yay -S cloudflared qrencode
    ```
2.  **Start the tunnel stack**:
    ```bash
    cd Quill
    bash start-llm.sh
    ```
3.  **Scan the QR**: Open Quill on your phone, go to **Settings (⚙)**, tap the 📷 icon, and scan the terminal.

#### Manual Config (Other OS):
If you can't run the script, manually set your Ollama origins and start a tunnel:
- Set `OLLAMA_ORIGINS="*"` and `OLLAMA_HOST="0.0.0.0"`
- Run `cloudflared tunnel --url http://localhost:11434`
- Copy the `trycloudflare.com/v1` URL into Quill settings.

### Cloud LLM Providers
You can also use fast cloud providers. Just enter the URL and your API Key in Quill settings:

| Provider | API URL | Model Example |
|---|---|---|
| **OpenRouter** | `https://openrouter.ai/api/v1` | `meta-llama/llama-3-8b-instruct:free` |
| **Groq** | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| **Together** | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |

## 3. Data & Privacy

- **Stories**: All your stories are stored in **IndexedDB** in your browser. They never leave your device.
- **Import/Export**: Use the **💾 Export** button on a story card to download a backup JSON file. You can import this file on any other browser or device.
- **Clearing Data**: If you clear your browser cache/site data, your stories will be lost. **Always export important work!**

## 4. Mobile Writing

Quill is optimized for mobile:
- **Left Panel**: Swipe or tap the top-left icon to see your story tree.
- **Right Panel**: Swipe or tap the top-right icon to view context cards.
- **QR Setup**: Use the camera icon in settings to avoid typing tunnel URLs.

## 5. Recommended Models for Fanfic

- **Llama 3.2 3B (Abliterated)**: Fast, decent prose, excellent for local 8GB RAM setups.
- **Llama 3.1 70B**: Best overall prose quality (use via Groq or OpenRouter).
- **MythoMax-13B**: A classic favorite for creative fiction and roleplay.
