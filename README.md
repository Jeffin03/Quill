# ✒️ Quill

A fanfic co-writing studio powered by AI. You direct the story, the AI writes the prose, and a **context card engine** maintains the story's living memory.

## Features

- **Conversational co-writing** — chat-based interface where you direct and the AI writes
- **Context cards** — the AI automatically tracks characters, relationships, plot threads, and story state
- **Auto Premise Setup** — instantly generate your starting context cards from an existing prologue or premise
- **Editable timeline** — edit any past message to perfectly steer the narrative
- **Timeline Rewind** — easily prune the story tree and rewrite history from any point
- **Mobile-friendly** — fully responsive design with sliding side panels for writing on the go
- **Pacing control** — set slow-burn, moderate, or fast pacing and the AI respects it
- **Pluggable LLM** — works with any OpenAI-compatible API (Colab, Ollama, LM Studio, etc.)

## Quick Start

```bash
# Clone and install
git clone <your-repo-url>
cd Quill
npm install

# Configure your LLM endpoint
cp .env.example .env
# Edit .env with your LLM API URL

# Run
npm start
```

Open `http://localhost:3000` in your browser.

## LLM Setup

Quill works with any backend that exposes an OpenAI-compatible `/v1/chat/completions` endpoint:

- **Google Colab**: Run a model with text-generation-webui or vLLM, use the provided URL
- **Ollama**: `ollama serve` → set `LLM_API_URL=http://localhost:11434/v1`
- **LM Studio**: Start the server → set `LLM_API_URL=http://localhost:1234/v1`

## Documentation (Wiki)

Detailed guides are available in the [wiki](./wiki) directory:

- **[Architecture](./wiki/Architecture.md)** — How the card engine and SSE streaming work
- **[Setup Guide](./wiki/Setup-Guide.md)** — Step-by-step instructions for Ollama, Colab, Groq, etc.
- **[Roadmap](./wiki/Roadmap.md)** — The plan for Branching and future features

## 🌿 The Multiverse (Coming Soon)

Quill is designed for branching narratives. Soon you will be able to:
1. **Branch** from any point in the story tree.
2. **Snapshot** context cards so each timeline has its own independent memory.
3. **Visualize** your story tree to jump between parallel universes.

## License

MIT - Feel free to use, modify, and share!
