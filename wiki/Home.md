# ✒️ Quill — Fanfic Co-Writing Studio

> You direct the story. The AI writes the prose. Context cards remember everything.

Quill is a private, AI-powered fanfic co-writing studio built for writers who want full creative control over their stories — including pacing, tone, and content — without artificial limitations.

## What Makes Quill Different

| Problem | How Quill Solves It |
|---|---|
| AI forgets what happened 20 chapters ago | **Context cards** maintain a living memory of characters, relationships, plot threads, and story state |
| AI rushes to climactic scenes too quickly | **Pacing directives** enforce slow-burn, moderate, or fast pacing at the system prompt level |
| Hosted AI tools restrict creative freedom | **Pluggable LLM backend** — use any model you want, including unrestricted self-hosted ones |
| Chat history overflows the context window | Context cards carry the long-term memory, so only recent chat + cards are sent to the AI |
| Can't explore "what if" scenarios | **The Multiverse** lets you fork parallel timelines at any point |

## Core Concepts

### 🌿 The Multiverse (Branching Narratives)
Quill is built for exploration. Every message you receive is a node in a tree. You can:
- **Fork Timeline**: Create a new branch from any point in the history.
- **Lore Snapshots**: Every branch has its own independent world state. Changing a character's fate in one branch won't affect the others.
- **Tree Navigation**: Use the visual map to jump between parallel realities.

### 🃏 Context Cards (The Living Memory)
Every time the AI writes a scene, it also outputs structured updates to the story's memory — the **context cards**. These cards track:
- **Characters** — appearance, personality, emotional state
- **Relationships** — dynamics, tension levels, history
- **Plot Threads** — active storylines, foreshadowing
- **World** — setting details, rules, lore

The AI reads these cards before writing every response, ensuring it never forgets a scar, a secret, or a grudge.

### 🔥 Pacing & Tone Control
You aren't just giving the AI a prompt; you're setting a **Creative Profile**:
- **Pacing**: Force the AI to slow down and build subtext (Slow Burn) or cut straight to the action (Fast).
- **Tone**: Layer multiple emotional filters (e.g., *Gritty, Melancholic, Witty*).
- **Multi-Genre**: Tag your story with a blend of genres (e.g., *Romance + Fantasy + Mystery*).

---

## Documentation

- **[[Setup Guide]]** — Configuration for Ollama, Cloudflare, and Mobile.
- **[[Architecture]]** — How the Multiverse and Card Engine work under the hood.
- **[[Roadmap]]** — Our future plans for Portraits and Relationship Maps.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Platform** | PWA (Progressive Web App) | Installable on phone/desktop, works offline. |
| **Logic** | Vanilla HTML/CSS/JS | 100% browser-based. Zero build steps. |
| **Storage** | IndexedDB | Local-first. No data ever leaves your device. |
| **LLM Engine** | OpenAI-compatible API | Works with Ollama, LM Studio, Groq, OpenRouter, etc. |
