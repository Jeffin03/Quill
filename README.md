# ✒️ Quill — Fanfic Studio

A 100% serverless, client-side fanfic co-writing studio powered by AI. You direct the story, the AI writes the prose, and a **context card engine** maintains the story's living memory—all running directly in your browser.

## 🚀 Live Demo
**[Launch Quill on GitHub Pages](https://jeff-m-2024.github.io/quill/)**

## ✨ Features

- **100% Serverless** — No backend required. Your stories stay in your browser (IndexedDB).
- **Installable PWA** — Add Quill to your phone or desktop for an app-like experience.
- **Context Cards** — The AI automatically tracks characters, relationships, and plot threads.
- **Auto Premise Setup** — Instantly generate starting cards from an existing prologue.
- **Mobile-Friendly** — Fully responsive design with QR-based LLM setup.
- **Pluggable LLM** — Connects to any local or remote model (Ollama, LM Studio, Groq, etc.).
- **Uncensored Freedom** — Tunnel your local uncensored models to the web app for private, unlimited writing.

## 🛠 Quick Start (Local Development)

```bash
# Clone and open
git clone <your-repo-url>
cd Quill

# Run a local web server
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
3.  **Write!** Your local GPU is now powering your private, public-facing fanfic studio.

## 📚 Documentation (Wiki)

- **[Architecture](./wiki/Architecture.md)** — IndexedDB and Card Engine logic.
- **[Setup Guide](./wiki/Setup-Guide.md)** — How to use Ollama, Cloudflare Tunnels, and Mobile.
- **[Roadmap](./wiki/Roadmap.md)** — The plan for Phase 4: Branching/Multiverse.

## 🌿 The Multiverse (In Progress)

Quill is evolving into a tool for branching narratives.
- **Branching** from any point in the story tree.
- **Snapshots** for independent timeline memories.
- **Visual Story Trees** to navigate parallel universes.

## License
MIT
