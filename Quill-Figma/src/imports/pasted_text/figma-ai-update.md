# Figma AI — Incremental Design Update

## Context
This updates the existing Quill Figma design. The original prompt (`quill-novel-writer-ui.md`) generated the current mockups. Now we need to add missing features from the production app and replace all emoji icons with Lucide icons.

The current design has: StoryListView, StoryWorkspace (WritingArea, InstructionPanel, ContextCardsPanel, StoryTreePanel), and 5 modals (Story, LLMSettings, AddCard, AutoGenerate, DeleteSegment).

## High Priority: Replace All Emoji with Lucide Icons

Every emoji used as an icon must be replaced with the corresponding Lucide icon component. The icon library (`lucide-react`) is already installed and used in `Modals.tsx` (imports `X`, `Plus`, `Trash2`, `Wand2`, `Camera`).

### Complete Emoji → Lucide Mapping

| Usage | Emoji | Lucide Icon |
|---|---|---|
| App logo / brand | ✒️ | `Feather` |
| New story / add | + | `Plus` |
| Import story | 📂 | `FolderOpen` |
| Settings / gear | ⚙ | `Settings` |
| Back navigation | ← | `ArrowLeft` |
| Story tree panel | 🌿 | `GitBranch` |
| Context cards panel | 🃏 | `Layers` |
| Scenes timeline | 🎨 | `Image` |
| Character tab | 👤 | `User` |
| Relationship card | 💞 | `Heart` |
| Plot card | 📖 | `BookOpen` |
| World card | 🌍 | `Globe` |
| Arc card | 📐 | `Ruler` |
| Auto-generate cards | ⚡ | `Zap` |
| Delete / remove | 🗑️ / × | `Trash2` / `X` |
| Edit / pencil | ✏️ | `Pencil` |
| Branch / fork | 🌿 | `ForkRight` |
| Visualize scene | 🎨 | `ImagePlus` |
| Generate magic / AI | ✨ | `Wand2` |
| QR scan | 📷 | `Camera` / `Scan` |
| Save / export | 💾 | `Save` |
| Close | × | `X` |
| Send arrow | → (SVG) | `Send` |
| Stop square | █ (SVG) | `Square` |
| Warning | ⚠️ | `AlertTriangle` |
| Empty state | 📖 | `BookOpen` |
| Error / status | ● | `Circle` |
| Genre pills | 🔥⚡🚀🌊 | `Flame`, `Zap`, `Rocket`, `Waves` |
| Info / hint | 💡 | `Lightbulb` |
| Connection status | ● | `Wifi` / `WifiOff` |
| Sync / loading | ↻ | `RefreshCw` / `Loader2` |
| Search / browse | 🔍 | `Search` |
| Drag handle | ⋮⋮ | `GripVertical` |
| Mobile menu | ☰ | `Menu` |
| Minimize / collapse | ▼ | `ChevronDown` |
| Expand | ▶ | `ChevronRight` |

## Features to Add

### 1. Comic / Image Generation System

**New modal: ComicModal**
- Title input field → creates a comic project
- Buttons: Cancel, Create

**New modal: PanelModal**
- Hidden ID field (for edit mode)
- Scene Description textarea
- Dialogue / Caption input
- Character checkboxes (dynamically populated from characters list)
- Image Prompt textarea + Generate Image button (`ImagePlus` icon)
- Image preview area (`<img>` with aspect-ratio 3:4)
- Buttons: Cancel, Save Panel

**New view: ComicWorkspace** (replaces the 3-panel layout when in comic mode)
- Header with back button, comic title, settings
- Sidebar: character list for this comic
- Main area: vertical panel grid, each panel at 3:4 ratio showing:
  - Generated image or empty state
  - Speech bubble overlay (positioned top or bottom)
  - Hover-revealed action buttons: Edit (`Pencil`), Generate (`ImagePlus`), Delete (`Trash2`)
- Empty state: "Add panels to generate your comic"
- FAB button: Add Panel

Add a toggle/entry point in the StoryWorkspace header to switch between "Write" and "Comic" modes.

### 2. Character Design System

**New modal: CharacterModal**
- Hidden ID field
- Name input
- Description textarea (4 rows)
- Reference Image file input + image preview
- Style Prompt textarea (3 rows) + Generate button (`Wand2` icon)
- Helper text: "This prompt is injected into every panel image for character consistency"
- Buttons: Cancel, Save Character

**Characters tab** in the right sidebar (add alongside Cards tab):
- Tab button: `User` icon + "Characters"
- Content: list of character cards, each showing:
  - Avatar (image or initial letter fallback)
  - Name (bold)
  - Description preview (truncated, 1 line)
  - Edit button (`Pencil`), Delete button (`Trash2`)
- Empty state: "No characters yet. Create one to add a style prompt for visualizations."
- Bottom button: "+ Add Character" (`UserPlus`)

### 3. Full Settings / API Manager (replaces current LLMSettingsModal)

**Replace the simple LLMSettingsModal with two views:**

**Overview view** (default):
- Active Connections list — each connection card shows:
  - Provider label + icon (OpenRouter, NVIDIA NIM, LM Studio, Ollama, ComfyUI)
  - Model name
  - Capability badges (Text / Image)
  - Status dot (online/offline via API ping)
  - Edit button, Delete button, QR Scan button
- Feature Routing section — 4 dropdown rows:
  - Story Generation → routes to any text-capable entry
  - Card Extraction → routes to any text-capable entry
  - Style Prompts → routes to any text-capable entry
  - Image Generation → routes to any image-capable entry
  - Each dropdown has "Auto" option (uses first available)
- Defaults section:
  - Max Tokens (number input, 256–8192)
  - Temperature (number input, 0–2, step 0.05)
  - Default Art Style (text input)
- Pipeline section:
  - "Uncensored rewrite" toggle switch — description: "Story generation → remote API → rewrite uncensored via local LLM. Requires one remote + one local text connection."
  - "Sanitize requests for gated APIs" toggle — description: "Replaces trigger terms with placeholders before sending to OpenRouter/NVIDIA NIM. Restored in response."
- Warning banner: "Everything is stored in your browser. Export backups regularly!"

**Stepper view** (4-step wizard for adding/editing a connection):
- Step progress indicator with 4 steps numbered
- Step 1 — Provider: selectable cards grid (5 providers):
  - OpenRouter (cloud, text, free models)
  - NVIDIA NIM (cloud, image, FLUX/SDXL)
  - LM Studio (local, text, GUI app)
  - Ollama (local, text, CLI)
  - ComfyUI (local, image, workflows)
- Step 2 — Credentials: varies by provider. For local: Host & Port input + QR scan button. For cloud: API Key (password). Label field always visible.
- Step 3 — Model: text input with autocomplete datalist. Auto-fetches model list from provider. Status indicator.
- Step 4 — Assign: checkboxes for Story Generation, Card Extraction, Style Prompts, Image Generation. Recommended assignments highlighted.
- Navigation: Back / Next buttons

### 4. Visual Timeline / Scenes Tab

Add a **Scenes tab** in the left sidebar (alongside Timeline / Tree tab):
- Tab button: `Image` icon + "Scenes"
- Content: grid of scene cards, each showing:
  - Generated image (base64 PNG)
  - Text snippet of the message
  - Delete button (`Trash2`)
- Empty state: "No scenes visualized yet."

Entry point in the workspace header: toggle button (`ImagePlus` icon) to switch the left panel to scenes tab.

### 5. Message Action Buttons

Add hover-revealed action buttons to each narrative passage in the WritingArea:
- `ImagePlus` — Visualize (generate scene image)
- `ForkRight` — Branch (fork timeline from here)
- `Pencil` — Edit (inline edit mode)
- `Trash2` — Delete/Rewind (opens DeleteSegmentModal)

### 6. Inline Edit Mode

When Edit is clicked, replace the passage content with:
- Textarea pre-filled with current content
- Save button (`Save`) + Cancel button (`X`)
- On save: close textarea, show updated content

### 7. Visual Timeline in Scenes Tab

Each scene card shows:
- Generated image (placeholder or actual base64)
- Message text preview (2 lines, truncated)
- Delete button on hover

### 8. Home Page Connection Status

Add a persistent status badge on the Story List View:
- Pill-shaped, shows: `Wifi` or `WifiOff` icon + "LLM: Online" / "LLM: Offline" / "LLM: Not Configured"
- Clickable — opens Settings modal
- Animated pulse when online, static when offline

### 9. Export / Import Story Buttons

On each story card in the grid:
- `Download` icon button — exports story as JSON file
- `Trash2` icon button — deletes story with confirmation

On the Story List View header:
- `FolderOpen` icon + "Import" button — opens file picker for `.json` files

## Layout Adjustments

### Right Sidebar: Add Characters Tab
Current right sidebar has only "Cards". Change to:
- Tab 1: `Layers` icon + "Cards"
- Tab 2: `User` icon + "Characters"

### Settings Modal: Replace with Full API Manager
Current design has a simple LLMSettingsModal. Replace with the two-view layout described above (overview + stepper).

## Design Constants (Keep From Current Design)

- Dark theme: background `#0c0c11`, foreground `#e6e0d4`
- Primary accent: amber/gold `#c8922a`
- Fonts: EB Garamond (manuscript), Inter (UI)
- Card type colors: character `#7aa2f7`, relationship `#f7768e`, plot `#bb9af7`, world `#9ece6a`, arc `#e0af68`
- shadcn/ui components: Button, Input, Textarea, Dialog, Switch, Select, Tabs, Badge, Card, ScrollArea
- Modal style: rounded-2xl, `bg-[#18181f]`, backdrop-blur overlay
- Mobile: bottom tab bar (Write / Cards / Tree), panels slide in as drawers