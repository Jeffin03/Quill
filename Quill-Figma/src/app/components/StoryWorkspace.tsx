import { useState, useCallback } from 'react';
import {
  ArrowLeft, Settings, Wifi, WifiOff, Layers, GitBranch, Edit2,
  FileDown, User, ImagePlus, BookImage,
} from 'lucide-react';
import type { Story, StorySegment, ContextCard, LLMSettings, WorkspacePanel } from '../types';
import { WritingArea } from './WritingArea';
import { InstructionPanel } from './InstructionPanel';
import { ContextCardsPanel } from './ContextCardsPanel';
import { StoryTreePanel } from './StoryTreePanel';
import { ScenesPanel } from './ScenesPanel';
import { CharactersPanel, type Character } from './CharactersPanel';
import { ComicWorkspace } from './ComicWorkspace';
import {
  StoryModal, AddCardModal, AutoGenerateModal, DeleteSegmentModal,
  CharacterModal, ComicModal,
} from './Modals';
import { APIManagerModal } from './APIManagerModal';
import { getMockResponse } from '../sampleData';

type LeftPanel = 'cards' | 'tree' | 'scenes';
type RightPanel = 'instruction' | 'characters';
type WorkspaceMode = 'write' | 'comic';

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const GENRE_COLORS: Record<string, string> = {
  Fantasy: 'text-blue-400/70 border-blue-400/20',
  Romance: 'text-rose-400/70 border-rose-400/20',
  'Dark Romance': 'text-purple-400/70 border-purple-400/20',
  Thriller: 'text-orange-400/70 border-orange-400/20',
};
function getBadgeClass(genre: string) {
  return GENRE_COLORS[genre] ?? 'text-[#72708a] border-white/12';
}

// ── Sidebar tab button helper ─────────────────────────────────────────────
function SideTab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 transition-colors ${
        active
          ? 'border-[#c8922a] text-[#d4a853]'
          : 'border-transparent text-[#72708a] hover:text-[#b8b4aa]'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? 'bg-[#c8922a]/20 text-[#d4a853]' : 'bg-white/6 text-[#72708a]'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

interface StoryWorkspaceProps {
  story: Story;
  llmSettings: LLMSettings;
  onBack: () => void;
  onUpdateStory: (updates: Partial<Story>) => void;
}

export function StoryWorkspace({ story, llmSettings, onBack, onUpdateStory }: StoryWorkspaceProps) {
  // Panel state
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('cards');
  const [rightPanel, setRightPanel] = useState<RightPanel>('instruction');
  const [mobilePanel, setMobilePanel] = useState<'write' | 'cards' | 'tree' | 'scenes' | 'characters'>('write');
  const [mode, setMode] = useState<WorkspaceMode>('write');

  // Generation state
  const [instruction, setInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState('');
  const [stopFlag, setStopFlag] = useState(false);

  // Characters (design only, not persisted to story type yet)
  const [characters, setCharacters] = useState<Character[]>([]);

  // Modals
  const [showEditStory, setShowEditStory] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [showAPIManager, setShowAPIManager] = useState(false);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showComicModal, setShowComicModal] = useState(false);
  const [deletingSegment, setDeletingSegment] = useState<StorySegment | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const activeSegments = story.segments.filter(s => s.branchId === story.currentBranchId);

  const addSegment = (seg: StorySegment) =>
    onUpdateStory({ segments: [...story.segments, seg] });

  const handleGenerate = useCallback(async () => {
    if (!instruction.trim() || isGenerating) return;
    const dir = instruction.trim();
    setInstruction('');
    setMobilePanel('write');

    const dirSeg: StorySegment = {
      id: uid(), branchId: story.currentBranchId, type: 'direction',
      content: dir, timestamp: new Date().toISOString(),
    };
    const afterDir = [...story.segments, dirSeg];
    onUpdateStory({ segments: afterDir });

    setIsGenerating(true);
    setGeneratingText('');
    setStopFlag(false);

    let text = '';

    if (llmSettings.apiUrl && llmSettings.model) {
      try {
        const systemPrompt = `You are a creative fiction co-writer. Tone: ${story.tone}. Genres: ${story.genres.join(', ')}. Pacing: ${story.pacing}. Write immersive literary prose, 2–4 paragraphs. No commentary.`;
        const context = activeSegments.filter(s => s.type === 'narrative').slice(-3).map(s => s.content).join('\n\n---\n\n');
        const resp = await fetch(`${llmSettings.apiUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(llmSettings.apiKey ? { Authorization: `Bearer ${llmSettings.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: llmSettings.model, stream: true,
            max_tokens: llmSettings.maxTokens, temperature: llmSettings.temperature,
            messages: [
              { role: 'system', content: systemPrompt },
              ...(context ? [{ role: 'assistant', content: context }] : []),
              { role: 'user', content: `Direction: ${dir}\n\nContinue:` },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (resp.ok && resp.body) {
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done || stopFlag) { reader.cancel(); break; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const t = line.replace(/^data: /, '').trim();
              if (!t || t === '[DONE]') continue;
              try {
                const delta = JSON.parse(t).choices?.[0]?.delta?.content ?? '';
                if (delta) { text += delta; setGeneratingText(text); }
              } catch {}
            }
          }
        }
      } catch {}
    }

    if (!text) {
      const mock = getMockResponse();
      for (let i = 0; i <= mock.length; i++) {
        if (stopFlag) break;
        text = mock.slice(0, i);
        setGeneratingText(text);
        await sleep(12);
      }
      text = mock;
    }

    if (text.trim()) {
      const narSeg: StorySegment = {
        id: uid(), branchId: story.currentBranchId, type: 'narrative',
        content: text.trim(), timestamp: new Date().toISOString(),
      };
      onUpdateStory({ segments: [...afterDir, narSeg], updatedAt: new Date().toISOString() });
    }
    setGeneratingText('');
    setIsGenerating(false);
    setStopFlag(false);
  }, [instruction, isGenerating, story, llmSettings, activeSegments, stopFlag, onUpdateStory]);

  const handleDeleteOnly = () => {
    if (!deletingSegment) return;
    onUpdateStory({ segments: story.segments.filter(s => s.id !== deletingSegment.id) });
  };
  const handleRewindHere = () => {
    if (!deletingSegment) return;
    const idx = story.segments.findIndex(s => s.id === deletingSegment.id);
    onUpdateStory({ segments: story.segments.slice(0, idx) });
  };
  const handleAddCard = (card: Omit<ContextCard, 'id'>) =>
    onUpdateStory({ cards: [...story.cards, { ...card, id: uid() }] });
  const handleAutoGenerate = () =>
    onUpdateStory({ cards: [...story.cards, { id: uid(), type: 'character', title: 'Protagonist', fields: [{ key: 'Note', value: 'Auto-generated — edit to refine' }] }] });
  const handleSwitchBranch = (branchId: string) =>
    onUpdateStory({ currentBranchId: branchId });
  const handleEditSegment = (segmentId: string, newContent: string) => {
    onUpdateStory({ segments: story.segments.map(s => s.id === segmentId ? { ...s, content: newContent } : s) });
  };
  const handleExport = () => {
    const text = activeSegments.filter(s => s.type === 'narrative').map(s => s.content).join('\n\n* * *\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const configured = !!(llmSettings.apiUrl && llmSettings.model);

  // ── Comic mode ─────────────────────────────────────────────────────────
  if (mode === 'comic') {
    return (
      <>
        <ComicWorkspace
          comicTitle={story.title + ' — Comic'}
          onBack={() => setMode('write')}
          onAddPanel={() => {}}
          onSettings={() => setShowAPIManager(true)}
        />
        {showAPIManager && <APIManagerModal onClose={() => setShowAPIManager(false)} />}
      </>
    );
  }

  // ── Write mode ──────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0c0c11] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/6 bg-[#0f0f15]">
        <button onClick={onBack} className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors">
          <ArrowLeft size={17} />
        </button>

        <h1 className="flex-1 text-[#e6e0d4] truncate" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.1rem' }}>
          {story.title}
        </h1>
        {story.genres.slice(0, 2).map(g => (
          <span key={g} className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeClass(g)}`}>{g}</span>
        ))}

        {/* Comic toggle */}
        <button
          onClick={() => setMode('comic')}
          title="Switch to Comic mode"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1c1c24] border border-white/8 text-[#72708a] hover:text-[#c8922a] hover:border-[#c8922a]/30 text-xs transition-colors"
        >
          <BookImage size={14} />
          Comic
        </button>

        {/* LLM status dot */}
        <div
          className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-emerald-400' : 'bg-[#72708a]'}`}
          title={configured ? `${llmSettings.model}` : 'LLM not configured'}
        />
        <button onClick={handleExport} className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors" title="Export">
          <FileDown size={16} />
        </button>
        <button onClick={() => setShowAPIManager(true)} className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors">
          <Settings size={16} />
        </button>
      </header>

      {/* ── Desktop layout ─────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 min-h-0">
        {/* LEFT sidebar */}
        <div className="w-72 shrink-0 border-r border-white/6 flex flex-col bg-[#0f0f15]">
          <div className="flex border-b border-white/6">
            <SideTab active={leftPanel === 'cards'} onClick={() => setLeftPanel('cards')} icon={<Layers size={13} />} label="Cards" count={story.cards.length} />
            <SideTab active={leftPanel === 'tree'} onClick={() => setLeftPanel('tree')} icon={<GitBranch size={13} />} label="Tree" />
            <SideTab active={leftPanel === 'scenes'} onClick={() => setLeftPanel('scenes')} icon={<ImagePlus size={13} />} label="Scenes" />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {leftPanel === 'cards' && (
              <ContextCardsPanel cards={story.cards} onAddCard={() => setShowAddCard(true)} onAutoGenerate={() => setShowAutoGenerate(true)} />
            )}
            {leftPanel === 'tree' && (
              <StoryTreePanel story={story} onSwitchBranch={handleSwitchBranch} />
            )}
            {leftPanel === 'scenes' && (
              <ScenesPanel scenes={[]} />
            )}
          </div>
        </div>

        {/* CENTER: Writing area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <WritingArea
            segments={activeSegments}
            generatingText={generatingText}
            isGenerating={isGenerating}
            onDeleteSegment={seg => setDeletingSegment(seg)}
            onEditSegment={handleEditSegment}
          />
        </div>

        {/* RIGHT sidebar: Instruction + Characters */}
        <div className="w-72 shrink-0 flex flex-col border-l border-white/6 bg-[#0f0f15]">
          <div className="flex border-b border-white/6">
            <SideTab active={rightPanel === 'instruction'} onClick={() => setRightPanel('instruction')} icon={<Edit2 size={13} />} label="Write" />
            <SideTab active={rightPanel === 'characters'} onClick={() => setRightPanel('characters')} icon={<User size={13} />} label="Characters" count={characters.length} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {rightPanel === 'instruction' && (
              <InstructionPanel
                value={instruction}
                onChange={setInstruction}
                onGenerate={handleGenerate}
                onStop={() => setStopFlag(true)}
                isGenerating={isGenerating}
                compact={false}
              />
            )}
            {rightPanel === 'characters' && (
              <CharactersPanel
                characters={characters}
                onAddCharacter={() => setShowAddCharacter(true)}
                onEditCharacter={c => setEditingCharacter(c)}
                onDeleteCharacter={id => setCharacters(prev => prev.filter(c => c.id !== id))}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile layout ──────────────────────────────────────────────── */}
      <div className="flex md:hidden flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {mobilePanel === 'write' && (
            <WritingArea
              segments={activeSegments}
              generatingText={generatingText}
              isGenerating={isGenerating}
              onDeleteSegment={seg => setDeletingSegment(seg)}
              onEditSegment={handleEditSegment}
            />
          )}
          {mobilePanel === 'cards' && (
            <ContextCardsPanel cards={story.cards} onAddCard={() => setShowAddCard(true)} onAutoGenerate={() => setShowAutoGenerate(true)} />
          )}
          {mobilePanel === 'tree' && (
            <StoryTreePanel story={story} onSwitchBranch={handleSwitchBranch} />
          )}
          {mobilePanel === 'scenes' && <ScenesPanel scenes={[]} />}
          {mobilePanel === 'characters' && (
            <CharactersPanel
              characters={characters}
              onAddCharacter={() => setShowAddCharacter(true)}
              onEditCharacter={c => setEditingCharacter(c)}
              onDeleteCharacter={id => setCharacters(prev => prev.filter(c => c.id !== id))}
            />
          )}
        </div>

        {/* Instruction bar (above tab bar, only in write panel) */}
        {mobilePanel === 'write' && (
          <InstructionPanel
            value={instruction}
            onChange={setInstruction}
            onGenerate={handleGenerate}
            onStop={() => setStopFlag(true)}
            isGenerating={isGenerating}
            compact={true}
          />
        )}

        {/* Mobile tab bar */}
        <div className="shrink-0 flex border-t border-white/6 bg-[#0f0f15] pb-safe-bottom overflow-x-auto">
          {([
            { id: 'write', label: 'Write', icon: <Edit2 size={17} /> },
            { id: 'cards', label: 'Cards', icon: <Layers size={17} /> },
            { id: 'tree', label: 'Tree', icon: <GitBranch size={17} /> },
            { id: 'scenes', label: 'Scenes', icon: <ImagePlus size={17} /> },
            { id: 'characters', label: 'Cast', icon: <User size={17} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobilePanel(tab.id)}
              className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                mobilePanel === tab.id ? 'text-[#c8922a]' : 'text-[#72708a]'
              }`}
            >
              {tab.icon}
              <span className="text-[9px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showEditStory && (
        <StoryModal initialData={story} onSave={d => { onUpdateStory(d); setShowEditStory(false); }} onClose={() => setShowEditStory(false)} />
      )}
      {showAddCard && (
        <AddCardModal onAdd={handleAddCard} onClose={() => setShowAddCard(false)} />
      )}
      {showAutoGenerate && (
        <AutoGenerateModal onGenerate={handleAutoGenerate} onClose={() => setShowAutoGenerate(false)} />
      )}
      {showAPIManager && (
        <APIManagerModal onClose={() => setShowAPIManager(false)} />
      )}
      {showAddCharacter && (
        <CharacterModal
          onSave={data => setCharacters(prev => [...prev, { ...data, id: uid() }])}
          onClose={() => setShowAddCharacter(false)}
        />
      )}
      {editingCharacter && (
        <CharacterModal
          onSave={data => {
            setCharacters(prev => prev.map(c => c.id === editingCharacter.id ? { ...c, ...data } : c));
            setEditingCharacter(null);
          }}
          onClose={() => setEditingCharacter(null)}
        />
      )}
      {showComicModal && (
        <ComicModal
          onCreate={() => setMode('comic')}
          onClose={() => setShowComicModal(false)}
        />
      )}
      {deletingSegment && (
        <DeleteSegmentModal
          segment={deletingSegment}
          onDeleteOnly={handleDeleteOnly}
          onRewindHere={handleRewindHere}
          onClose={() => setDeletingSegment(null)}
        />
      )}
    </div>
  );
}
