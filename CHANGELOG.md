# Changelog

All notable changes to Quill will be documented in this file.

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-08-03

### Added

- Full SvelteKit 2 rewrite (Svelte 5, TypeScript 6, Tailwind CSS v4)
- AI-assisted story generation with real-time streaming (SSE)
- Branching narrative (DAG) — fork, switch, and rewind timelines
- Message editing and deletion with descendant collection
- Context cards (5 types) — auto-extraction, auto-generation from premise
- Character reference images and AI style prompt generation
- Inline scene visualization per message
- Scenes visual timeline tab
- Comic creation — panel grid, speech bubbles, character sidebar, panel image generation
- Multi-provider LLM support (OpenRouter, NVIDIA NIM, LM Studio, Ollama, ComfyUI)
- Feature routing — assign providers to story, cards, prompts, image generation
- Automatic failover across text-capable endpoints
- Content sanitization and guardrail detection for gated APIs
- Uncensored rewrite pipeline (remote generate + local rewrite)
- QR code scanner for local server URLs
- Local model auto-discovery (Ollama, LM Studio)
- Connection status heartbeat (15s ping)
- Smart scrolling — auto-scrolls during streaming only when near bottom
- IndexedDB v3 schema — stories, settings, characters, comics stores
- Cascade delete — deleting a story removes associated characters and comics
- Story management — create, edit settings, delete, import/export JSON
- Export prose as plain text
- PWA — service worker, manifest, offline app shell
- Responsive mobile layout with bottom tab navigation
- Toast notification system (success/error/info)
- Dark-only theme with amber/gold primary palette
- QR scanner in API settings for local server URLs
- GitHub Actions deployment to GitHub Pages

### Removed

- Original docs/ HTML/CSS/JS app (fully superseded)
- Quill-Figma/ React export (reference only)
- wiki/ documentation (outdated)
