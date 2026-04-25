# ✒️ Quill — Fanfic Studio

A 100% serverless, client-side fanfic co-writing studio powered by AI. You direct the story, the AI writes the prose, and a **context card engine** maintains the story's living memory—all running directly in your browser.

## 🚀 Live Demo
**[Launch Quill on GitHub Pages](https://jeffin03.github.io/Quill/)**

## ✨ Features

- **🌿 The Multiverse** — Branch your story from any point. Create parallel timelines with independent world states and "lore snapshots."
- **🃏 Context Cards** — The AI automatically tracks characters, relationships, and plot threads. It populates its own "memory" as you write.
- **🛡️ 100% Private & Serverless** — No backend required. Your stories stay in your browser (IndexedDB). No data ever leaves your device.
- **📲 Installable PWA** — Add Quill to your phone or desktop for an app-like experience.
- **🤖 Smart LLM Integration** — 
    - **Model History**: Switch between your 10 most recent models with one click.
    - **Live Status**: Visual heartbeat showing if your AI is online/offline.
    - **Any Provider**: Connects to any local or remote model (Ollama, LM Studio, Groq, etc.).
- **🎭 Multi-Genre Control** — Tag stories with multiple genres and custom tones (e.g., *Romance + Fantasy*, Tone: *Dark, Melancholic*).

## 🛠 Quick Start (Local Development)

```bash
# Clone and open
git clone https://github.com/jeffin03/Quill.git
cd Quill

# Run a local web server (or just open index.html in /docs)
npx serve docs
```
Open `http://localhost:3000` in your browser.

## 🤖 Connecting your LLM

Quill works with any OpenAI-compatible API. To use your local models (like Ollama) with the live web app:

1.  **Start the LLM Stack**:
    ```bash
    bash start-llm.sh
    ```
2.  **Scan the QR Code**: Open Quill on your phone, go to **Settings (⚙)**, tap the camera icon, and scan the terminal.
3.  **Indulge!** Your local GPU is now powering your private fanfic studio.

## 📚 Documentation (Wiki)

- **[Architecture](./wiki/Architecture.md)** — IndexedDB and Card Engine logic.
- **[Setup Guide](./wiki/Setup-Guide.md)** — How to use Ollama, Cloudflare Tunnels, and Mobile.
- **[Roadmap](./wiki/Roadmap.md)** — Our future plans (Portraits & Relationship Mapping).

## License
MIT
