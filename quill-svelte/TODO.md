# TODO — Quill SvelteKit Migration

## Completed
- [x] Scaffolding (SvelteKit 2, Vite 8, Tailwind v4, TypeScript 6)
- [x] Domain types (src/lib/types.ts)
- [x] Design tokens & dark theme (src/lib/styles/theme.css)
- [x] Typography — EB Garamond, Inter, Roboto Mono
- [x] Global styles — manuscript class, scrollbars, animations
- [x] Root layout with CSS pipeline
- [x] CHANGELOG.md

## 1. Utilities
- [ ] src/lib/utils.ts — UUID, formatTime, formatTimeShort, proseToHtml, escapeHtml, debounce, cardTypeIcon, cardTypeLabel, truncate
- [ ] Install lucide-svelte and replace emoji/string icons with Lucide components (User, Heart, BookOpen, Globe, TrendingUp per Quill-Figma TYPE_CONFIG)

## 2. Storage Layer
- [ ] src/lib/services/db.ts — IndexedDB (stories + settings stores), listStories, getStory, saveStory, deleteStory, getConfig, saveConfig, exportStory, importStory

## 3. API Facade
- [ ] src/lib/services/api.ts — QuillAPI wrapper over db.ts, getBranchMessages (parentId traversal), buildSystemPrompt, card CRUD, story CRUD, streaming orchestration

## 4. LLM Service
- [ ] src/lib/services/llm.ts — streamChat (SSE + ReadableStream), chat (non-streaming), AbortController support, any OpenAI-compatible API

## 5. Card Engine
- [ ] src/lib/services/cardEngine.ts — parseCardUpdates, stripCardBlock, applyCardUpdates, generateCardsFromPremise, repairJson

## 6. State Management
- [ ] src/lib/stores/ — Svelte stores for current story, LLM config, panel visibility, streaming state, toast queue

## 7. UI Components
- [ ] StoryList — home screen, story grid cards, create/delete/export
- [ ] Workspace layout — 3-panel (tree | chat | cards), header, responsive
- [ ] ChatPanel — message rendering, streaming indicator, input textarea, send/stop, inline edit, branch/delete actions
- [ ] CardsPanel — cards grouped by type, inline edit, add/delete, syncing animation
- [ ] TreePanel — DAG visualization from messages, node dots + labels, branch switching, active path highlight
- [ ] Modals — new story, settings (LLM config), story settings, add card, magic cards, delete/rewind confirmation
- [ ] Toast notifications
- [ ] QR scanner (for tunnel URL)

## 8. Routing
- [ ] / — story list (home)
- [ ] /story/[id] — workspace view

## 9. Component CSS
- [ ] Layout styles (3-panel, header, story list grid)
- [ ] Chat styles (messages, bubbles, streaming, input)
- [ ] Cards styles (card groups, type borders, field editor)
- [ ] Tree styles (timeline, nodes, active state)
- [ ] Modal styles
- [ ] Mobile responsive styles

## 10. PWA
- [ ] Service worker (sw.js)
- [ ] Web app manifest (manifest.json)
- [ ] PWA icons
