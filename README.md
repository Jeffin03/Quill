# Quill

An AI-powered fanfic co-writing studio. You direct the story, the AI writes the prose.

## Features

- **AI story generation** — streaming, multi-provider (OpenRouter, NVIDIA NIM, LM Studio, Ollama, ComfyUI)
- **Branching narratives** — fork timelines from any message, switch between branches, rewind
- **Context cards** — character, relationship, plot, world, arc tracking with auto-extraction
- **Comic creation** — vertical manhwa-scroll panel grid with speech bubbles and image generation
- **Scene visualization** — generate images for any passage using NIM or ComfyUI
- **Content sanitization** — gated API support with uncensored rewrite pipeline
- **PWA** — installable, offline-capable

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## LLM Setup

Quill needs an OpenAI-compatible API. Options:

1. **Local** — Run [Ollama](https://ollama.ai) or [LM Studio](https://lmstudio.ai), then use the `start-llm.sh` script to start the server and optionally expose it via Cloudflare tunnel:

   ```bash
   ./start-llm.sh
   ```

2. **Cloud** — Add an OpenRouter or NVIDIA NIM connection in Settings → API Manager.

## Build

```bash
npm run build
npm run preview
```

## Deployment

Push to `main` to deploy to GitHub Pages via GitHub Actions. The workflow builds the static site and deploys it to `https://<username>.github.io/Quill/`.

## Tech Stack

- [SvelteKit 2](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [TypeScript 6](https://www.typescriptlang.org)
- [Lucide Icons](https://lucide.dev)
- IndexedDB for local storage

## License

MIT
