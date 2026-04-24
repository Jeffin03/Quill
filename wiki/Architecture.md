# Architecture

## System Overview (Serverless PWA)

Quill is a 100% client-side application. There is no backend server. Everything—from your stories to the card engine logic—runs directly in your browser.

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (UI)                          │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Story Tree  │  │   Chat Panel   │  │ Context Cards  │  │
│  │  (left)     │  │   (center)     │  │   (right)      │  │
│  └────────────┘  └────────────────┘  └────────────────┘  │
└───────────┬──────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────┐
│                  App Logic Layer                         │
│  ┌──────────────┐ ┌─────────────┐ ┌───────────────────┐  │
│  │ LLM Engine   │ │ Card Engine │ │  IndexedDB (DB)   │  │
│  │ (js/llm.js)  │ │ (js/cards.js)│ │  (js/db.js)       │  │
│  └──────────────┘ └─────────────┘ └───────────────────┘  │
└───────────┬──────────────────────────────────────────────┘
            │ HTTP (CORS via Tunnel or direct)
  ┌─────────▼──────────┐
  │    LLM Backend     │
  │ (Ollama / Groq /   │
  │  any OpenAI API)   │
  └────────────────────┘
```

## Project Structure

```
Quill/
├── docs/                       # The "Live" PWA directory (GitHub Pages)
│   ├── index.html              # Main App Shell
│   ├── sw.js                   # Service Worker (Offline Support)
│   ├── manifest.json           # PWA Metadata
│   ├── css/
│   │   └── style.css           # Core Design System
│   └── js/
│       ├── app.js              # Main App Orchestrator
│       ├── db.js               # IndexedDB Wrapper (QuillDB)
│       ├── api.js              # Client-side API Logic (QuillAPI)
│       ├── llm.js              # LLM Connector & Streaming Logic
│       ├── cards.js            # Card UI & Processing
│       ├── qrScanner.js        # QR Setup Tool
│       └── ...                 # Other UI modules
├── wiki/                       # Documentation
├── start-llm.sh                # Local LLM Tunneling Tool
└── README.md                   # Project Overview
```

## Data Persistence (IndexedDB)

All story data is stored locally in your browser's **IndexedDB** using a custom wrapper `QuillDB`. This means:
- **Privacy**: Your stories never leave your device unless you connect an LLM.
- **Offline**: You can open the app and read/write stories without an internet connection.
- **Backups**: Use the **Export Story** feature (JSON) to save your work to your computer.

## The Card Engine (Client-Side)

The card engine now runs entirely in the browser. It follows this lifecycle:

1. **Prompt Construction**: Assembles the system prompt from IndexedDB data (settings + active cards).
2. **Streaming Request**: Sends a POST request to the configured LLM API (Ollama, etc.).
3. **Real-time Parsing**: As the text streams in, the engine looks for the `---CARDS---` delimiter.
4. **Card Integration**: Once the stream ends, the engine parses the JSON block and updates the IndexedDB record for the story.
5. **UI Sync**: The Context Cards panel pulses to show where updates occurred.

## LLM Connectivity

Since browsers have strict security (CORS), connecting to a local LLM (like Ollama) from a public website (`github.io`) requires:
1. **CORS Headers**: Ollama must be started with `OLLAMA_ORIGINS="*"`.
2. **Tunneling**: A tool like `cloudflared` is used to provide a secure HTTPS endpoint for the browser to talk to.

Quill provides `start-llm.sh` to automate this entire process, including a QR code to quickly sync your mobile phone to your computer's GPU.
