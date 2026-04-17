# Roadmap

## Current: Phase 1 — MVP ✅

The foundation. A fully functional co-writing studio.

- [x] Express.js backend with OpenAI-compatible LLM connector
- [x] Streaming chat via Server-Sent Events (SSE)
- [x] Context card engine with automatic extraction from AI responses
- [x] Three-panel workspace (story tree, chat, context cards)
- [x] Story CRUD with JSON file persistence
- [x] Inline card editing (view + edit cards directly)
- [x] Manual card creation and deletion
- [x] Pacing directives (slow-burn, moderate, fast, natural)
- [x] LLM settings persistence (survives server restarts)
- [x] Dark theme with warm amber accents
- [x] Responsive panel collapse for focused writing mode
- [x] Story list landing page

---

## Phase 2 — Branching & Multiverse 🌿

> Fork the story at any point. Explore "what if" scenarios. Live in the multiverse.

### Branching System
- [ ] **Branch from any scene** — right-click or button on a tree node → "Create Branch"
- [ ] **Card snapshots** — each branch stores a frozen copy of context cards at the branch point, evolving independently from that point
- [ ] **Branch labels** — user-named branches (e.g., "Dark MC Arc", "Forgiveness Route", "What If He Stayed")
- [ ] **Branch switching** — click a branch in the tree to switch context and continue writing in that timeline
- [ ] **Branch comparison** — side-by-side view of how two timelines diverged

### Visual Story Tree
- [ ] **Tree graph visualization** — horizontal or vertical graph showing diverging timelines with connecting lines
- [ ] **Node previews** — hover over a node to see a preview of that scene
- [ ] **Branch color coding** — different branches get different colors for visual distinction
- [ ] **Collapse/expand branches** — manage complex trees without visual overload

### Data Model Changes
```json
{
  "tree": {
    "rootNodeId": "node-1",
    "nodes": {
      "node-1": {
        "id": "node-1",
        "parentId": null,
        "children": ["node-2"],
        "label": "Chapter 1 - The Meeting",
        "messageRange": [0, 5],
        "cardSnapshot": [ /* cards at this point */ ],
        "createdAt": "timestamp"
      },
      "node-2": {
        "id": "node-2",
        "parentId": "node-1",
        "children": ["node-3", "node-4"],
        "label": "The Argument",
        "messageRange": [6, 10],
        "cardSnapshot": [ /* ... */ ]
      },
      "node-3": {
        "id": "node-3",
        "parentId": "node-2",
        "children": [],
        "label": "Branch: MC Forgives",
        "messageRange": [11, 18],
        "cardSnapshot": [ /* ... */ ]
      },
      "node-4": {
        "id": "node-4",
        "parentId": "node-2",
        "children": [],
        "label": "Branch: MC Snaps",
        "messageRange": [11, 15],
        "cardSnapshot": [ /* ... */ ]
      }
    },
    "activeNodeId": "node-3"
  }
}
```

---

## Phase 3 — Polish & Power Features ✨

> Make it feel premium. Add the tools that power users need.

### Pacing Controls
- [ ] **Visual pacing slider** — drag to set the current story phase (setup → rising tension → climax → falling action → resolution)
- [ ] **Per-scene pacing override** — temporarily change pacing for a specific scene without changing the global setting
- [ ] **Tension meter** — visual indicator of current tension level based on card data

### Writing Tools
- [ ] **Tone presets** — saveable tone configurations (e.g., "angsty slow burn", "chaotic comedy", "melancholic thriller")
- [ ] **Character voice profiles** — define how each character speaks (formal, slang, poetic) and the AI stays consistent
- [ ] **Scene templates** — pre-built scene structures (confrontation, confession, fight scene, etc.) as starting points
- [ ] **Word count tracking** — per scene, per chapter, total story

### Story Export
- [ ] **Export to Markdown** — clean markdown file with chapter headers
- [ ] **Export to EPUB** — proper e-book format for reading on devices
- [ ] **Export to plain text** — simple text file
- [ ] **Export cards** — export the story bible (all cards) as a reference document

### Character Gallery
- [ ] **Visual character browser** — grid of character cards with portraits
- [ ] **Relationship map** — interactive graph showing connections between characters
- [ ] **Character arc timeline** — visual timeline of a character's emotional/narrative journey

### Quality of Life
- [ ] **Keyboard shortcuts** — Ctrl+Enter to send, Ctrl+/ for focused mode, etc.
- [ ] **Search within stories** — search across all messages and cards
- [ ] **Undo/redo** — undo the last AI response and regenerate
- [ ] **Regenerate** — regenerate the last response with different parameters
- [ ] **Settings page** — full settings panel with theme customization, writing preferences, and LLM config
- [ ] **Context window management** — automatic summarization of old messages when approaching token limits
- [ ] **Multiple AI personas** — different writing styles for different types of scenes

---

## Stretch Goals 🌟

These are ideas that would be amazing but are further out:

- **Collaborative writing** — multiple users directing the same story in real-time
- **AI illustration** — auto-generate scene illustrations using image generation models
- **Voice narration** — text-to-speech for the story using character-specific voices
- **Mobile app** — responsive PWA or native app for writing on the go
- **Plugin system** — let users create custom card types, pacing modes, and export formats
- **Fine-tuned models** — train a model specifically on high-quality fanfic for better prose
