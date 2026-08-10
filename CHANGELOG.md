# Changelog

All notable changes to Quill will be documented in this file.

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.1] - 2026-08-10

### Added

- PWA install banner — prompts users to add Quill to their home screen

### Fixed

- Mobile viewport auto-zoom on input focus (iOS/Android) — added `maximum-scale=1` and `viewport-fit=cover`
- Layout glitching on mobile browsers with dynamic chrome — replaced `h-screen`/`min-h-screen` with `100dvh` across all full-screen containers
- InstructionPanel compact textarea height conflict causing layout thrashing
- Continuous scroll glitching — removed overly aggressive `overscroll-behavior: none` on html/body and `touch-action: manipulation` on all elements that were fighting browser native scroll
- Modal interaction issues — same root cause as scroll glitching
- FAB and bottom tab bar hidden behind home indicator on modern phones — added `env(safe-area-inset-bottom)` padding
- Modal height units updated from `vh` to `dvh` for consistent sizing on mobile

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
