# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (UI)                          │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Story Tree  │  │   Chat Panel   │  │ Context Cards  │  │
│  │  (left)     │  │   (center)     │  │   (right)      │  │
│  └────────────┘  └────────────────┘  └────────────────┘  │
└─────────────────────────┬────────────────────────────────┘
                          │ REST API + SSE (streaming)
┌─────────────────────────┴────────────────────────────────┐
│                   Express.js Backend                      │
│  ┌──────────────┐ ┌─────────────┐ ┌───────────────────┐  │
│  │ LLM Service  │ │ Card Engine │ │  Story Manager    │  │
│  └──────────────┘ └─────────────┘ └───────────────────┘  │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP (OpenAI-compatible)
                ┌─────────┴──────────┐
                │    LLM Backend     │
                │ (Colab / Ollama /  │
                │  any provider)     │
                └────────────────────┘
```

## Project Structure

```
Quill/
├── server/
│   ├── index.js                # Express server entry point
│   ├── config.js               # Environment config loader
│   ├── routes/
│   │   ├── stories.js          # Story CRUD + SSE chat endpoint
│   │   ├── cards.js            # Context card CRUD
│   │   └── config.js           # Runtime LLM config (persists to disk)
│   └── services/
│       ├── llm.js              # OpenAI-compatible API connector (streaming + non-streaming)
│       ├── promptBuilder.js    # Assembles system prompts from cards + settings
│       ├── cardEngine.js       # Parses card updates from LLM responses
│       └── storyManager.js     # Story persistence (JSON files)
├── public/
│   ├── index.html              # SPA shell with two views
│   ├── css/
│   │   ├── style.css           # Core design system + layout
│   │   ├── chat.css            # Chat panel styles
│   │   ├── cards.css           # Context card styles
│   │   └── tree.css            # Story tree styles
│   └── js/
│       ├── app.js              # Main orchestrator
│       ├── api.js              # API client (fetch + SSE)
│       ├── chat.js             # Chat rendering + streaming
│       ├── cards.js            # Card rendering + editing
│       ├── tree.js             # Story timeline
│       ├── storyList.js        # Landing page story grid
│       └── utils.js            # Shared utilities
├── data/
│   ├── stories/                # Story JSON files
│   └── config.json             # Persisted LLM settings (auto-generated)
├── package.json
├── .env.example
└── .gitignore
```

---

## Data Models

### Story

Each story is stored as a single JSON file in `data/stories/`.

```json
{
  "id": "uuid-v4",
  "title": "The Convenience Store",
  "createdAt": "2026-04-17T18:50:05.794Z",
  "updatedAt": "2026-04-17T19:30:00.000Z",
  "settings": {
    "genre": "dark romance",
    "pacing": "slow-burn",
    "tone": "atmospheric, tense"
  },
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "Set the scene in a dimly lit convenience store at 2am. Rain outside.",
      "timestamp": "2026-04-17T19:00:00.000Z"
    },
    {
      "id": "msg-uuid",
      "role": "assistant",
      "content": "The fluorescent lights flickered overhead...",
      "timestamp": "2026-04-17T19:00:15.000Z"
    }
  ],
  "cards": [],
  "tree": {
    "rootNodeId": null,
    "nodes": {},
    "activeNodeId": null
  }
}
```

### Context Card

```json
{
  "id": "card-uuid",
  "type": "character",
  "title": "Satoru Gojo",
  "fields": {
    "appearance": "Tall, white hair, blue eyes, wearing a black hoodie",
    "personality": "Cocky exterior, deeply caring underneath",
    "emotional_state": "Guarded but curious about MC",
    "arc_position": "Pre-vulnerability reveal"
  },
  "lastUpdated": "2026-04-17T19:30:00.000Z"
}
```

**Card types:**

| Type | Icon | Tracks |
|---|---|---|
| `character` | 👤 | Appearance, personality, emotional state, role, arc position |
| `relationship` | 💞 | Dynamic between characters, tension level, history |
| `plot` | 📖 | Active/resolved/foreshadowed storylines |
| `world` | 🌍 | Setting details, rules, lore, AU specifics |
| `arc` | 📐 | Overall story structure, current act/phase |

Cards are flexible key-value — the AI decides what fields are relevant per card. This keeps them adaptable across genres and stories.

---

## How the Card Engine Works

The card engine is the core innovation that gives Quill long-term memory. Here's the flow:

### 1. User Sends a Direction

```
"Have them run into each other at the convenience store.
 It's raining. Make it awkward — they haven't talked since the argument."
```

### 2. Prompt Builder Assembles the System Prompt

The system prompt includes:
- The AI's role and writing style instructions
- Story settings (genre, tone)
- **Pacing directive** (the detailed slow-burn/fast/etc. instructions)
- **All current context cards**, formatted for the AI to read
- Rules for writing and card updates
- Recent message history (last 30 messages)

### 3. AI Writes Prose + Card Updates

The AI's response contains two parts:

```
The fluorescent lights flickered overhead, casting a sickly glow
across the rows of instant ramen and energy drinks...

[800 words of prose]

---CARDS---
[
  {"action": "update", "id": "card-satoru", "fields": {
    "emotional_state": "conflicted — wanted to speak but couldn't"
  }},
  {"action": "update", "id": "card-relationship", "fields": {
    "tension_level": "high — charged silence",
    "history": "He held the umbrella out. She didn't take it."
  }}
]
---END CARDS---
```

### 4. Card Engine Processes the Response

1. **`stripCardBlock()`** — extracts the prose (everything before `---CARDS---`)
2. **`parseCardUpdates()`** — parses the JSON array of card operations
3. **`applyCardUpdates()`** — merges creates/updates/deletes into the card collection

### 5. Streaming to the Frontend

The response is streamed to the browser via **Server-Sent Events (SSE)**:

- Prose chunks are sent in real-time as `{type: "chunk", content: "..."}`
- When `---CARDS---` is detected in the stream, prose streaming stops
- The final event `{type: "done", prose: "...", cards: [...]}` delivers the cleaned prose and updated cards
- The frontend never sees the raw card JSON — only the prose and the parsed card objects

```
Client                    Server                    LLM
  │                         │                        │
  │── POST /chat ──────────>│── stream request ─────>│
  │                         │                        │
  │<── SSE: chunk "The..." ─│<── delta "The..."  ────│
  │<── SSE: chunk "flu..." ─│<── delta "flu..."  ────│
  │          ...            │          ...           │
  │     (cards detected     │<── delta "---CARDS-" ──│
  │      stop streaming)    │<── delta "--\n[{..." ──│
  │                         │<── [DONE]  ────────────│
  │                         │                        │
  │                         │── parse cards          │
  │                         │── update story         │
  │                         │── save to disk         │
  │                         │                        │
  │<── SSE: done {prose,    │                        │
  │     cards} ─────────────│                        │
```

---

## API Endpoints

### Stories

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stories` | List all stories (metadata only) |
| `POST` | `/api/stories` | Create a new story |
| `GET` | `/api/stories/:id` | Get full story with messages and cards |
| `PUT` | `/api/stories/:id` | Update story metadata (title, settings) |
| `DELETE` | `/api/stories/:id` | Delete a story |
| `POST` | `/api/stories/:id/chat` | Send a direction, receive AI prose via SSE stream |

### Cards

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/cards/:storyId` | Get all cards for a story |
| `POST` | `/api/cards/:storyId` | Manually create a card |
| `PUT` | `/api/cards/:storyId/:cardId` | Update a card |
| `DELETE` | `/api/cards/:storyId/:cardId` | Delete a card |

### Config

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/config` | Get current LLM configuration |
| `PUT` | `/api/config` | Update LLM config (persists to `data/config.json`) |

---

## Frontend Architecture

The frontend is a single-page application with two views:

### Story List View (Landing)
- Displays existing stories as cards in a grid
- "New Story" button opens a modal for story creation (title, genre, pacing, tone)
- "Settings" button opens the LLM configuration modal

### Workspace View (Three-Panel Layout)

```
┌──────────┬────────────────────────┬──────────────────┐
│          │                        │                  │
│  Story   │       Chat Panel       │  Context Cards   │
│  Tree    │                        │                  │
│          │  ┌──────────────────┐  │  ┌────────────┐  │
│  1. ●    │  │ Director: "Set   │  │  │ 👤 Satoru  │  │
│  2. ●    │  │ the scene..."    │  │  │ mood: wary │  │
│  3. ●    │  ├──────────────────┤  │  ├────────────┤  │
│  4. ●    │  │ Quill: "The      │  │  │ 💞 S ↔ MC  │  │
│           │  │ fluorescent..."  │  │  │ tension: ▲ │  │
│          │  └──────────────────┘  │  └────────────┘  │
│          │                        │                  │
│          │  ┌──────────────────┐  │                  │
│          │  │ Direct the scene │  │                  │
│          │  └──────────────────┘  │                  │
└──────────┴────────────────────────┴──────────────────┘
```

- **Story Tree** (left, collapsible) — vertical timeline of scenes, click to scroll to that point
- **Chat** (center) — user directions + AI prose, streaming display, textarea with auto-resize
- **Context Cards** (right, collapsible) — grouped by type, inline editing, pulse animation on updates

Both side panels can be collapsed for a focused writing mode using the toggle buttons in the header.

### Design System

- **Theme**: Dark, immersive — built for late-night writing sessions
- **Colors**: Deep charcoal backgrounds with warm amber/gold accents
- **Typography**: Inter for UI, Lora for prose (gives fiction a book feel)
- **Animations**: Fade-in for messages, pulse glow for card updates, slide-in for new cards
- **Card colors**: Type-based left border accents (blue=character, pink=relationship, purple=plot, green=world, amber=arc)
