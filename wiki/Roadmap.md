# Roadmap

## Phase 1 — MVP ✅

The foundation. A fully functional local co-writing studio.
- [x] Express.js backend with OpenAI-compatible LLM connector
- [x] Streaming chat via Server-Sent Events (SSE)
- [x] Context card engine with automatic extraction from AI responses
- [x] Story CRUD with JSON file persistence
- [x] Pacing directives (slow-burn, moderate, fast, natural)
- [x] Dark theme with warm amber accents

---

## Phase 2 — UX Enhancements & Mobile ✅

Making the core experience robust and usable on the go.
- [x] **Inline Editing:** Edit past prompts and AI responses directly in the chat to seamlessly steer the narrative.
- [x] **Timeline Rewind:** Truncate the story tree from any previous scene to branch off manually.
- [x] **Auto Premise Setup:** Paste a massive prologue/premise to have the LLM automatically extract the starting context cards.
- [x] **Smart Auto-Scroll:** Chat intelligently handles scrolling while the AI generates text.
- [x] **Mobile Responsiveness:** Sliding side-panel drawers and dynamic UI for phones.

---

## Phase 3 — Serverless PWA Migration (Next Target) 📱

> Decouple Quill from the Node.js backend. Turn it into a 100% static, installable Progressive Web App (PWA) that runs entirely in the browser and can be hosted for free on GitHub Pages.

### Architecture Shift
- [ ] **Delete Backend:** Remove the Express.js server completely.
- [ ] **Direct LLM Calls:** Rewrite the frontend to securely make API calls directly to external LLMs (OpenRouter/Groq) or a local Ollama instance via CORS.
- [ ] **IndexedDB Storage:** Replace Node.js file system saving with `localforage` or native IndexedDB to store stories permanently in the browser.
- [ ] **Import/Export Systems:** Create robust tools to download/backup story JSON files and import them to prevent data loss.

### PWA Integration
- [ ] **App Manifest:** Add `manifest.json` so users can "Install" Quill to their phone or desktop home screen.
- [ ] **Service Workers:** Cache the HTML/CSS/JS assets for instant loading.
- [ ] **Offline Mode:** Allow users to read stories, edit cards, and manage timelines even on an airplane without internet (AI generation disabled while offline).
- [ ] **Zero-Cost Deployment:** Ensure the entire `public/` directory can be dragged and dropped onto GitHub Pages or Vercel as a static site.

---

## Phase 4 — Branching & Multiverse 🌿

> Fork the story at any point. Explore "what if" scenarios. Live in the multiverse.

### Branching System
- [ ] **Branch from any scene:** "Create Branch" from a past node.
- [ ] **Card Snapshots:** Each branch remembers exactly what the context cards looked like at that moment, evolving independently.
- [ ] **Branch Switching:** Click a timeline path to switch contexts immediately.
- [ ] **Visual Story Tree:** An interactive graph showing diverging timelines with connecting lines.

---

## Phase 5 — Power Features & Polish ✨

> Make it feel premium. Add the tools that power users need.

### Writing Tools
- [ ] **Tone presets:** Saveable tone configurations (e.g., "angsty slow burn", "melancholic thriller").
- [ ] **Character voice profiles:** Define how characters speak so the AI stays consistent.
- [ ] **Pacing Controls:** Visual pacing slider and tension meter based on card data.

### Export & Gallery
- [ ] **Export to EPUB/Markdown:** Proper e-book formatting for offline reading.
- [ ] **Character Gallery:** Visual grid of character cards with portraits.
- [ ] **Relationship map:** Interactive graph showing connections between characters.

### Quality of Life
- [ ] **Keyboard shortcuts:** Ctrl+Enter to send, Ctrl+/ for focused mode.
- [ ] **Undo/Regenerate:** Instantly regenerate the last AI response with different parameters.
- [ ] **Context Window Management:** Automatic summarization of old messages when approaching LLM token limits.
