# 🏗️ Architecture

Quill is a **Local-First, Serverless PWA**. There is no traditional backend; the entire application logic and database live inside your browser.

## 1. System Overview


```text
┌──────────────────────────────────────────────────────────┐
│                     Browser (UI)                         │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Story Tree │  │   Chat Panel   │  │ Context Cards  │  │
│  │  (left)    │  │   (center)     │  │   (right)      │  │
│  └────────────┘  └────────────────┘  └────────────────┘  │
└───────────┬──────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────┐
│                  App Logic Layer                         │
│  ┌──────────────┐ ┌─────────────┐ ┌───────────────────┐  │
│  │ LLM Engine   │ │ Card Engine │ │  IndexedDB (DB)   │  │
│  │ (js/api.js)  │ │(js/cardEng.js)│ │  (js/db.js)     │  │
│  └──────────────┘ └─────────────┘ └───────────────────┘  │
└───────────┬──────────────────────────────────────────────┘
            │ HTTP (CORS via Tunnel or direct)
  ┌─────────▼──────────┐
  │    LLM Backend     │
  │ (Ollama / Groq /   │
  │  any OpenAI API)   │
  └────────────────────┘
```

---

## 2. Project Structure

```text
Quill/
├── docs/                 # The PWA (Public Web App)
│   ├── css/              # Stylesheets (Modern Vanilla CSS)
│   ├── js/               # Application Logic
│   │   ├── app.js        # Main Controller & UI Orchestrator
│   │   ├── api.js        # LLM Connector (OpenAI-Compatible)
│   │   ├── db.js         # IndexedDB Storage Layer
│   │   ├── chat.js       # Chat Rendering & Message Logic
│   │   ├── cards.js      # Context Card Rendering
│   │   ├── tree.js       # Multiverse Tree Visualization
│   │   ├── cardEngine.js # AI Parsing & JSON Repair
│   │   ├── utils.js      # UUIDs, Formatting, & Helpers
│   │   └── storyList.js  # Home Screen Story Management
│   └── index.html        # Main Entry Point & Modals
├── wiki/                 # Project Documentation
├── start-llm.sh          # Local LLM Tunnel Script (Bash)
└── README.md             # Project Overview
```

---

## 3. Data Layers

### 💾 Storage (IndexedDB)
Quill uses **IndexedDB** for persistence, making it "Local-First."
- **Persistence**: Your stories survive browser refreshes and device reboots.
- **Privacy**: No story data is ever sent to a central server.
- **Portability**: Users can export their entire database as a JSON file.

### 🌿 The Multiverse (Branching)
The story is not a list; it is a **Directed Acyclic Graph (DAG)**.
- **Nodes**: Each message contains its content, a `parentId`, and a `cardSnapshot`.
- **Active Path**: The UI calculates the timeline by traversing from the current `activeBranchId` back to the root.
- **Independent State**: Switching branches instantly restores the `cardSnapshot` to the sidebar, allowing "What If" scenarios to have their own consistent history.

### 🃏 The Card Engine (Knowledge)
The `cardEngine.js` acts as the "Brain" of the memory system:
- **Extraction**: Post-processes AI responses to find `[[[QUILL_CARDS_START]]]` blocks.
- **Deep Repair**: Uses a heuristic repair system to fix malformed JSON (single quotes, missing braces, trailing commas) common in smaller LLMs.
- **Injection**: Injects current cards into the System Prompt to maintain long-term character/plot consistency.

---

## 4. Connectivity Layer
- **Unified API**: All LLM requests are routed through a single OpenAI-compatible interface in `api.js`.
- **Secure Tunneling**: For local-to-web access, `cloudflared` provides an HTTPS bridge, solving CORS and Mixed Content issues automatically.
- **Heartbeat**: A 15-second "Heartbeat" monitors the LLM status to provide real-time UI feedback.
