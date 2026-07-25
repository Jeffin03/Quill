# Comic Section — Implementation Plan

## Providers (all free)
- **Prompt engineering**: OpenRouter free text models (existing key)
- **Image generation**: NVIDIA NIM (free, 40 RPM) or LM Studio (local)
- No backend — all client-side, same pattern as existing code

## Data layer (reusable in Svelte)
### `js/db.js` — new IndexedDB stores
- `characters`: id, storyId, name, description, referenceImage (base64), stylePrompt
- `comics`: id, storyId, title, artStyle, panels[ {id, sceneDescription, dialogue, prompt, imageBase64, aspectRatio, characterIds, order} ]

### `js/api.js` — new CRUD methods (thin wrappers over db)
- Characters: listCharacters, createCharacter, updateCharacter, deleteCharacter
- Comics: listComics, getComic, saveComic, deleteComic, savePanel, deletePanel

### `js/imageGen.js` — pure logic, reusable
- `generateImage({ prompt, aspectRatio, referenceImages })` → base64
- `generateNIM(prompt, options)` → POST to `integrate.api.nvidia.com/v1/genai/...`
- `generateLMStudio(prompt, options)` → POST to `localhost:1234/v1/images/generations`
- No DOM, no globals except QuillDB

## UI layer (docs/-only, rewritten in Svelte)
### `js/comic.js` — QuillComic
- Comic workspace view, panel grid (vertical manhwa scroll), scene editor sidebar
- Generation flow: scene → OpenRouter free model → prompt → NIM → panel
### `js/characterDesign.js` — QuillCharacterDesign
- Character modal: name, description, image upload, auto style prompt
- Character list in comic sidebar
### `css/comic.css` — panel grid, speech bubbles, character cards
### `index.html` — comic view div + character/panel modals + nav button

## Integration
- `app.js`: "Comic" nav button, showView('comic-view'), modal bindings
- Settings modal: new "Image Generation" section (provider, NIM key, art style)
- `sw.js`: cache new assets

## Migration to quill-svelte (future)
- Copy `db.ts`, `api.ts`, `imageGen.ts` → `src/lib/services/` (TypeScript conversion)
- Rewrite `comic.js`, `characterDesign.js` as Svelte 5 components
- CSS → Tailwind v4 classes using existing design tokens
