# 🏗️ Architecture

Quill is a **Local-First, Serverless PWA**. There is no traditional backend; the entire application logic and database live inside your browser.

## 1. Storage Layer (IndexedDB)
Quill uses the browser's **IndexedDB** via `db.js`.
- **Stories Store**: Stores story metadata, branches, and the message tree.
- **Settings Store**: Stores LLM configuration and model history.
- **Privacy**: No story data is ever sent to a server (except to your own LLM endpoint for generation).

## 2. The Multiverse Engine (Branching Narratives)
Unlike a linear chat app, Quill uses a **Tree Structure** for stories:
- **Nodes**: Every message is a node with a `parentId`.
- **Branches**: Forking a timeline creates a new child node from any point in the history.
- **Lineage**: The "active timeline" is calculated by traversing back from the current `activeBranchId` to the root.
- **Snapshots**: Every message stores a `cardSnapshot`. When you switch branches, the world state (cards) is instantly restored to that specific point in time.

## 3. The Card Engine (Living Memory)
The Card Engine (`cardEngine.js`) is responsible for story consistency:
- **Extraction**: It uses a specialized system prompt to force the AI to output structured JSON updates (create/update/delete) after every scene.
- **Deep Repair**: A robust parsing layer that can automatically fix common LLM formatting errors (single quotes, trailing commas, truncated JSON) to ensure the database never crashes.
- **Lore Integration**: Cards are injected back into the LLM's system prompt as a "Source of Truth," preventing the AI from forgetting details in long-running stories.

## 4. LLM Connectivity
- **Universal Provider**: `api.js` implements an OpenAI-compatible interface.
- **Heartbeat**: A background process (`app.js`) checks the API connection every 15 seconds to update the UI status.
- **Tunneling**: For local LLMs, we use `cloudflared` to provide a secure HTTPS tunnel so the web app can talk to your local GPU.

## 5. UI Architecture
- **Vanilla Components**: We use a custom, zero-dependency component system (e.g., `chat.js`, `cards.js`, `tree.js`).
- **Reactive State**: `app.js` acts as the central controller, managing the current story state and orchestrating panel updates.
