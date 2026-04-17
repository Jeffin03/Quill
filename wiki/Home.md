# ✒️ Quill — Fanfic Co-Writing Studio

> You direct the story. The AI writes the prose. Context cards remember everything.

Quill is a self-hosted, AI-powered fanfic co-writing studio built for writers who want full creative control over their stories — including pacing, tone, and content — without artificial limitations.

## What Makes Quill Different

| Problem | How Quill Solves It |
|---|---|
| AI forgets what happened 20 chapters ago | **Context cards** maintain a living memory of characters, relationships, plot threads, and story state |
| AI rushes to climactic scenes too quickly | **Pacing directives** enforce slow-burn, moderate, or fast pacing at the system prompt level |
| Hosted AI tools censor explicit content | **Pluggable LLM backend** — use any model you want, including uncensored self-hosted ones |
| Chat history overflows the context window | Context cards carry the long-term memory, so only recent chat + cards are sent to the AI |
| Can't explore "what if" scenarios | **Branching timelines** let you fork the story at any point *(Phase 2)* |

## Core Concepts

### 🎬 You Are the Director
You don't write the prose — you *direct* it. You set the scene, describe what should happen, and the AI writes the actual narrative. Think of it like being a film director giving instructions to a screenwriter.

### 🃏 Context Cards
Every time the AI writes a scene, it also outputs structured updates to the story's memory — the **context cards**. These cards track:

- **Characters** — appearance, personality, emotional state, arc position
- **Relationships** — dynamics, tension levels, history between characters
- **Plot Threads** — active storylines, foreshadowing, resolved threads
- **World** — setting details, rules, lore
- **Story Arc** — overall structure, current act/phase

You can view and edit these cards at any time to steer the story.

### 🔥 Pacing Control
When you create a story, you set the pacing:

| Pacing | Behavior |
|---|---|
| **Slow Burn** 🔥 | Build tension through proximity, subtext, almost-touches. Do NOT rush. Make the reader ache. |
| **Moderate** ⚡ | Balance between buildup and progression. Key moments happen when groundwork is laid. |
| **Fast** 🚀 | Keep momentum high. Cut to the action. Sharp dialogue, quick escalation. |
| **Natural** 🌊 | Let the story flow organically. Some scenes breathe, others punch. |

The pacing directive is injected into the system prompt so the AI respects it consistently.

## Pages

- **[[Architecture]]** — System design, data models, how the card engine works
- **[[Setup Guide]]** — Installation and LLM configuration for different providers
- **[[Roadmap]]** — Planned features for Phase 2 (branching) and Phase 3 (polish)

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Backend** | Node.js + Express 5 | Lightweight, no build tools, `npm start` and go |
| **Frontend** | Vanilla HTML/CSS/JS | Zero build step, no framework overhead |
| **LLM Connector** | OpenAI-compatible API | Universal standard — works with Colab, Ollama, LM Studio, vLLM, OpenRouter, etc. |
| **Storage** | JSON files on disk | Simple, portable, no database to configure |
| **Fonts** | Inter (UI) + Lora (prose) | Clean UI typography with a book-like feel for the story |

## Quick Start

```bash
git clone <your-repo-url>
cd Quill
npm install
cp .env.example .env    # Configure your LLM endpoint
npm start               # Open http://localhost:3000
```
