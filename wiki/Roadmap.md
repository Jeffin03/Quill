# Roadmap

## Phase 1 — MVP ✅
The foundation. A functional local co-writing studio.
- [x] Express.js backend (Original architecture)
- [x] Streaming chat via SSE
- [x] Context card engine logic
- [x] Story CRUD

## Phase 2 — UX & Mobile ✅
Making the core experience robust.
- [x] Inline Editing of prose and directions
- [x] Timeline Rewind / Pruning
- [x] Auto Premise Setup (Smart card extraction)
- [x] Mobile Responsiveness (Sliding drawers)

## Phase 3 — Serverless PWA Migration ✅
> Decoupled from Node.js. 100% static, installable Progressive Web App.
- [x] **Delete Backend:** Server-side logic moved to client.
- [x] **IndexedDB Storage:** Native browser-side persistence.
- [x] **GitHub Pages Hosting:** Static site deployment.
- [x] **Tunneling Stack:** `start-llm.sh` for local LLM exposure.
- [x] **QR Setup:** Camera-based API configuration for mobile.
- [x] **Offline Mode:** Asset caching via Service Worker.

## Phase 4 — Branching & Multiverse (Current Target) 🌿
> Fork the story at any point. Explore "what if" scenarios.
- [ ] **Visual Story Tree:** Interactive graph showing diverging timelines.
- [ ] **Scene Branching:** "Create Branch" from any historical node.
- [ ] **Card Snapshots:** Each branch retains its own independent memory state.
- [ ] **Multiverse Navigation:** Seamlessly jump between parallel timelines.

## Phase 5 — Power Features & Polish ✨
> Premium tools for power writers.
- [ ] **Export to EPUB/PDF:** Professional formatting for your finished stories.
- [ ] **Character Portraits:** AI-generated or uploaded images for character cards.
- [ ] **Relationship Visualization:** Interactive connection graph.
- [ ] **Smart Context Pruning:** Automatic summarization for infinite long-form stories.
- [ ] **Keyboard Shortcuts:** Pro-workflow optimizations.
