# Changelog

All notable changes to the Quill SvelteKit rewrite will be documented in this file.

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- SvelteKit 2 + Vite 8 + TypeScript 6 project scaffolding
- Svelte 5 runes mode forced in `vite.config.ts`
- Tailwind CSS v4 with CSS-first config (`@theme inline` in `theme.css`)
- ESLint 10 + Prettier 3 with svelte and tailwind plugins
- Domain types in `src/lib/types.ts`: Story, Message, ContextCard, Branch, LLMSettings, StorySettings, WorkspacePanel
- Dark theme design tokens with amber/gold primary palette (`src/lib/styles/theme.css`)
- Google Fonts: EB Garamond (prose), Inter (UI), Roboto Mono (code)
- Global styles: manuscript typography class, custom scrollbars, cursor blink animation, fade-slide-in animation
- Root layout with CSS pipeline and favicon
- Utility functions in `src/lib/utils.ts`: uuid, formatTime, formatTimeShort, proseToHtml, escapeHtml, debounce, cardTypeIcon, cardTypeLabel, truncate
- `TODO.md` migration task tracker
- `CHANGELOG.md` for tracking changes

### Fixed
- Font `@import` ordering in `layout.css` — moved before `@import 'tailwindcss'` to fix PostCSS error
