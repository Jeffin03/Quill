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

---

## 🧭 The Quill Philosophy

Quill is designed as a **Private Creative Sandbox**. We recognize the ongoing ethical debate regarding AI and the creative arts. Our mission is to provide a safe, unrestricted space for personal storytelling, not to displace human authors.

- **Personal Indulgence, Not Replacement**: Quill is for your own "Internal Multiverse." It is a tool for personal entertainment and brainstorming, much like a private game. It is not intended for the mass-production of content to compete with human-authored works in the creative market.
- **Collaborative Muse**: We view the AI as a co-writing partner that helps you explore your own ideas faster, acting as a sounding board rather than a replacement for your creative voice.
- **Privacy First**: Because your work stays on your device, Quill is a judgment-free space to explore your imagination without your ideas being harvested for training or cloud storage.
- **Respect the Community**: We believe in the irreplaceable value of human-authored fiction. We encourage users to use Quill for their own fulfillment and to be transparent and respectful when interacting with the broader creative community.

---

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
