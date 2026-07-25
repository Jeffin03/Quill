# AGENTS.md — Quill

## Repository layout

```
/                         Repository root (README, AGENTS.md)
├── docs/                 Original app (HTML/CSS/JS, fully functional)
├── Quill-Figma/          Figma design export (React + MUI + shadcn, reference only)
└── quill-svelte/         ACTIVE REWRITE — SvelteKit 2 + Tailwind CSS v4
```

- **Never edit `docs/` or `Quill-Figma/`** — they are references.
- All work goes in `quill-svelte/`.

## quill-svelte — commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | Typecheck via `svelte-check` (runs `svelte-kit sync` first) |
| `npm run lint` | Prettier check + ESLint |
| `npm run format` | Prettier write |

Node 20.19.0 (`.nvmrc`), `engine-strict=true` (`.npmrc`).

## Framework quirks

- **Svelte 5 runes mode** is forced for all project files via `vite.config.ts`. Every `.svelte` file uses `$state`, `$derived`, `$effect`, `$props()` — no `let count = 0` or `export let`.
- **Tailwind CSS v4** with CSS-first config — `@theme inline { ... }` in `theme.css`, no `tailwind.config.js`. Use `@import 'tailwindcss'` and `@variant`/`@theme` directives.
- **TypeScript 6**, strict mode.
- **Prettier**: tabs, single quotes, no trailing commas, 100 print width, plugins `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`. The `tailwindStylesheet` is `./src/routes/layout.css`.
- **`.vscode/settings.json`** maps `*.css` → `tailwindcss` language for syntax highlighting.

## Architecture (quill-svelte)

### Entrypoint
- `src/routes/+layout.svelte` — root layout, imports `layout.css` (fonts → Tailwind → theme → globals)
- `src/routes/+page.svelte` — home page (currently placeholder)
- Routes planned: `/` (story list), `/story/[id]` (workspace)

### Key source modules
- `src/lib/types.ts` — domain types: Story, Message, ContextCard, Branch, LLMSettings, StorySettings, WorkspacePanel
- `src/lib/utils.ts` — UUID, formatters, proseToHtml, escapeHtml, debounce, cardTypeIcon/label, truncate
- `src/lib/styles/theme.css` — dark theme CSS variables + `@theme inline` for Tailwind v4
- `src/lib/styles/globals.css` — `.manuscript` typography, scrollbars, animations
- `src/lib/styles/fonts.css` — Google Fonts import (EB Garamond, Inter, Roboto Mono)

### Service layer (TODO — not yet built)
The following modules need to be created following the patterns in `TODO.md`:
- `src/lib/services/db.ts` — IndexedDB wrapper
- `src/lib/services/api.ts` — QuillAPI facade over db.ts
- `src/lib/services/llm.ts` — LLM streaming (OpenAI-compatible)
- `src/lib/services/cardEngine.ts` — Context card parsing/updates
- `src/lib/stores/` — Svelte stores for state management
- `src/lib/utils.ts` — should install `lucide-svelte` and replace emoji string icons with Lucide components per the Figma TYPE_CONFIG

### Design tokens
- Dark-only theme with amber/gold primary (`#c8922a`)
- Colors referenced as CSS variables mapped via `@theme inline` — use Tailwind classes like `bg-background`, `text-foreground`, `text-primary`, `bg-muted`, `border-border`
- Fonts: EB Garamond (prose/manuscript), Inter (UI), Roboto Mono (code)
- `.manuscript` class on prose containers for serif typography

### Component tree (from Quill-Figma reference)
```
App
├── StoryListView        — story grid, create/delete/export/import
└── StoryWorkspace       — 3-panel layout
    ├── ContextCardsPanel — cards grouped by type (character, relationship, plot, world, arc)
    ├── StoryTreePanel   — DAG branch visualization
    ├── WritingArea      — message display + streaming indicator
    └── InstructionPanel — input textarea + generate/stop
```

### ContextCard types (shared between quill-svelte and Quill-Figma)
`'character' | 'relationship' | 'plot' | 'world' | 'arc'`

### LLM integration
- Any OpenAI-compatible API (Ollama, LM Studio, Groq, etc.)
- Streaming via SSE `data:` lines, AbortController for stop
- System prompt includes tone, genres, pacing, recent narrative context

## Figma reference (Quill-Figma/)
- React + Vite project using shadcn/ui + MUI + lucide-react
- Run with `npm run dev` in that directory
- Source of truth for component layout, responsive breakpoints, and visual design
- Types differ slightly from quill-svelte — use quill-svelte's `types.ts` as source of truth

## Original app (docs/)
- Fully functional PWA (sw.js, manifest.json)
- IndexedDB for storage, uses no backend
- Run with `npx serve docs`
- Consult for logic reference when building the service layer

### Comic/Image Gen modules (docs/ only)
- `js/db.js` — v2 migration adds `characters` + `comics` IndexedDB stores; config extended with image provider settings (NIM, LM Studio, art style)
- `js/api.js` — Character CRUD (`createCharacter`, `updateCharacter`, `deleteCharacter`, `listCharacters`) + Comic CRUD (`createComic`, `getComic`, `updateComic`, `deleteComic`, `listComics`, `addPanel`, `updatePanel`, `deletePanel`)
- `js/imageGen.js` — `QuillImageGen` module: NVIDIA NIM (curated model list), LM Studio image generation via OpenAI-compatible `/v1/images/generations`; `fetchFreeModels()` fetches OpenRouter free text models (filter by `pricing.prompt === '0'`)
- `js/characterDesign.js` — `QuillCharacterDesign` module: character CRUD UI (name, description, reference image, style prompt), style prompt generation via OpenRouter free LLM
- `js/comic.js` — `QuillComic` orchestrator: panel grid rendering, panel CRUD, image generation integration, prompt building (art style + character style prompts + scene description)
- `css/comic.css` — Manhwa panel styles (3:4 aspect ratio, speech bubbles, overlay actions), character cards, responsive sidebar layout

## PWA (future)
- Service worker and manifest planned to port from `docs/`
- PWA icons not yet created
