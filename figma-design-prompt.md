# Figma AI Design Prompt for Quill Novel Writer Interface

## Project Overview
Design a creative, modern UI for **Quill** - a fanfic co-writing studio where users direct AI-generated stories. The key requirement is to move away from a chat-like interface to a **novel writer format** with a dedicated instruction area for guiding the AI.

Quill is a **100% client-side, serverless application** that runs entirely in the browser. It uses IndexedDB for persistent storage and connects directly to any OpenAI-compatible LLM API (like Ollama, LM Studio, etc.) for AI-powered writing assistance. All data remains strictly on the user's device.

## Complete Screens & Features Reference
Based on the current implementation, here are all screens, modals, and features that the new design must accommodate:

### 📱 Screens (Views)

#### 1. **Story List View (Landing Page)**
- **Purpose**: Main dashboard showing all user stories
- **Key Elements**:
  - App logo and title ("Quill")
  - Tagline: "Your fanfic co-writing studio"
  - Primary action buttons: New Story (+), Import Story (📂), Settings (⚙)
  - LLM connection status indicator (showing Online/Offline/Not Configured)
  - Dynamic stories grid (card-based layout showing story titles and metadata)
  - Empty state view (when no stories exist)

#### 2. **Story Workspace View**
- **Purpose**: Main writing/editing interface for active stories
- **Layout**: Flexible panel-based design (current implementation uses three panels, but open to reimagining)
- **Must Support**:
  - Story title editing (inline, content-editable)
  - Story metadata display (genre badges, pacing indicator)
  - Multiple panel configurations (writing area, instruction area, reference panels)
  - Mobile-responsive behavior (panels that collapse/rearrange on small screens)

### ⚙️ Modals & Overlays

#### 1. **New Story Modal**
- Story title input (text field)
- Genre selection (multi-select checkboxes): Romance, Dark Romance, Fantasy, Thriller, Angst, Hurt/Comfort, Slice of Life, Action, Horror, Mystery, General Fiction
- Paternity selection (dropdown): Slow Burn, Moderate, Fast, Natural
- Tone input (text field, e.g., "atmospheric", "dramatic", "tender")
- Primary action: Create Story button
- Secondary action: Cancel button

#### 2. **Edit Story Settings Modal**
- Identical to New Story modal but pre-filled with current story's settings
- Primary action: Save Changes button
- Secondary action: Cancel button

#### 3. **LLM Settings Modal**
- API URL input field (with QR code scan button 📷)
- QR code reader overlay (appears when scan button clicked)
- Model input field (with recent history datalist)
- API key input (password field)
- Max tokens input (number field, range 256-8192)
- Temperature input (number field, range 0-2, step 0.05)
- Local storage warning banner
- Primary action: Save button
- Secondary action: Cancel button

#### 4. **Add Card Manual Modal**
- Card type dropdown: Character (👤), Relationship (💞), Plot (📖), World (🌍), Arc (📐)
- Card title input field
- Dynamic key-value fields editor (with + Add Field button)
- Primary action: Add Card button
- Secondary action: Cancel button

#### 5. **Auto Generate Cards Modal**
- Large text area for story premise/input
- Instructions: "Paste your story premise, prologue, or character ideas below. Quill will analyze it and automatically build your starting Context Cards."
- Primary action: Generate Cards button (visual prominence)
- Secondary action: Cancel button

#### 6. **Delete Message Modal**
- Confirmation message: "What would you like to do with this message?"
- Primary action buttons:
  - Delete Only (standard action)
  - Rewind to Here (special action that branches the narrative)
- Secondary action: Cancel button

### 🧩 Workspace Panels & Components (Current Implementation for Reference)

These represent the current UI structure that the design should reimagine for the novel writer format:

#### **Header/Top Bar**
- Navigation back to story list
- Editable story title display
- Story metadata badges (genre, pacing)
- Panel toggle controls (tree, cards)
- Story settings access
- LLM connection status indicator

#### **Writing Area** (Currently Chat Panel)
- Message display area (currently chat bubbles, to be reimagined as novel format)
- AI-generated content display
- Welcome state when no content exists
- Input area for user directions (currently textarea with send button)

#### **Reference Panels** (Currently Tree & Cards Panels)
- **Story Tree Panel**: Visualization of narrative branches and timeline
- **Context Cards Panel**: Display and management of AI-extracted story elements (characters, relationships, plot threads, world details, story arcs)
- Both panels Support:
  - Manual card creation
  - Auto-generation of cards from text
  - Collapsible/hideable on mobile
  - Touch-friendly interactions

### 📱 Mobile-Specific System Features
- Modal overlay system for panel management on small screens
- Intelligent panel collapsing (opening one panel hides the other on mobile)
- Touch-optimized controls and spacing
- Gesture considerations for panel navigation

### 🔧 Technical Persistence & PWA Features
- Service worker for offline functionality and caching
- Web app manifest for installability
- IndexedDB storage for all user data (stories, settings)
- Local-only data persistence (privacy-first approach)
- QR code system for easy mobile LLM configuration

## Core Requirements (Reiterated)
1. **Non-Chat Interface**: Eliminate chat bubbles, message lists, and conversational UI patterns
2. **Novel Writer Format**: Primary focus on a document-like writing/reading experience
3. **Instruction Area**: Dedicated space (separate from main text) for users to give AI directions on how the story should progress
4. **Mobile & Desktop**: Create designs for both screen sizes
5. **Feature Completeness**: All screens, modals, and features listed above must be accommodated in the new design
6. **Creative Freedom**: Encourage innovative approaches to presenting context cards, branching narratives, and AI collaboration

## Key Components to Include (Reimagined for Novel Writer)
- **Main Writing/Reading Area**: Novel-like display of story content (think manuscript, not chat log)
- **AI Instruction Panel**: Dedicated space for users to type/write directions for the AI (what should happen next, character actions, plot developments) - CLEARLY SEPARATED from main narrative
- **Context Cards Display**: Visual presentation of characters, relationships, plot threads, world details, and story arcs (explore innovative formats beyond lists/grids)
- **Branching/Narrative Tree Visualization**: Creative way to show story branches and timelines (consider timelines, node graphs, or other narrative flow visualizations)
- **AI Generation Controls**: Buttons/settings for triggering AI generation, stopping, adjusting parameters (should feel integrated, not disruptive)
- **Story Management**: New story, save, import/export, settings access (accessible but not overwhelming)
- **Navigation**: Between different views/stories if applicable (consider persistent access to story list)

## Mobile-Specific Considerations
- Adaptive layout for smaller screens
- Priority on writing/instruction areas as primary focus
- Collapsible, tabbed, or gesture-based interface for secondary panels (context cards, tree, settings)
- Touch-friendly controls with appropriate sizing and spacing
- Maintain ALL core functionality despite space constraints (no feature reduction)

## Desktop-Specific Considerations
- Utilize horizontal space effectively for multi-pane layouts
- Potential for dedicated writing area + instruction panel + sidebar(s) configuration
- Hover states, keyboard shortcuts consideration (e.g., Ctrl+Enter to send instruction)
- Larger canvas for more detailed visualizations of context and branching
- Consider split-screen or dual-pane layouts optimized for writing flow

## Style & Creativity Guidance
- **Modern & Clean**: Contemporary aesthetic that enhances focus and creativity
- **Inspiring & Motivating**: Design should encourage writing and storytelling (think writer's retreat, not software interface)
- **Clear Hierarchy**: Make it instantly obvious what is main content vs. instructional vs. reference material
- **Innovative Visualization**: Think beyond traditional lists/tables for context cards and branching
  - Consider timelines, mind maps, character relationship diagrams, world-building mood boards
  - Explore card-like displays that are more visual and less data-grid oriented
  - Consider how to show narrative branches without breaking writing immersion
- **Writing-Focused**: Primary emphasis should be on the text/instruction areas - minimize chrome and distractions
- **Subtle AI Integration**: AI elements should feel like collaborative tools (a co-author looking over your shoulder), not overwhelming interfaces
- **Manuscript Aesthetic**: Consider typography, spacing, and layout that feels like a professional writing document

## What to Avoid
- Traditional chat interfaces (bubbles, chronological message lists, chat heads)
- Overly technical or developer-looking interfaces (code-editor vibe is wrong for this use case)
- Cluttered layouts that distract from the writing flow
- Standard form-heavy designs for context cards (too bureaucratic for creative work)
- Replicating existing Quill UI exactly - we want a reimagining for novel writing
- Modal overuse (consider inline expanders or permanent sidebars where appropriate)

## Output Format
Please provide:
1. **Mobile Design**: Full-screen mockups showing key states:
   - Blank story start (instruction area visible)
   - Active writing with instruction area
   - Viewing/editing context cards
   - Viewing branching narrative
   - Accessing settings/modals
2. **Desktop Design**: Widescreen layout showing the main workflow:
   - Primary writing view with instruction panel
   - Reference panels (context cards/branching) in optimal configuration
   - Modal states for complex interactions
3. **Component Close-ups**: For innovative elements like context card display or branching visualization
4. **State Variations**: Show how the interface adapts to:
   - Empty story vs. populated story
   - Different screen sizes (mobile breakpoints)
   - AI generation states (idle, generating, complete)
5. **Brief Rationale**: Explain key design decisions and how they meet the novel writer requirement

## Success Criteria
- A writer would feel comfortable and inspired using this interface for hours
- The AI instruction mechanism is crystal clear and visually distinct from the main narrative
- Context and branching information is accessible without disrupting writing flow
- Mobile version retains ALL core functionality on smaller screens (nothing omitted)
- Overall design feels fresh, creative, and purpose-built for AI-assisted novel writing
- The interface disappears, leaving only the story and the flow of creation