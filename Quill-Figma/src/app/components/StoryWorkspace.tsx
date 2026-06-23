import { useState, useCallback } from 'react';
import {
  ArrowLeft, Settings, Wifi, WifiOff, Layers, GitBranch, Edit2,
  MoreVertical, FileDown,
} from 'lucide-react';
import type { Story, StorySegment, ContextCard, LLMSettings, WorkspacePanel } from '../types';
import { WritingArea } from './WritingArea';
import { InstructionPanel } from './InstructionPanel';
import { ContextCardsPanel } from './ContextCardsPanel';
import { StoryTreePanel } from './StoryTreePanel';
import {
  StoryModal, AddCardModal, AutoGenerateModal, DeleteSegmentModal,
} from './Modals';
import { getMockResponse } from '../sampleData';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

const GENRE_COLORS: Record<string, string> = {
  Fantasy: 'text-blue-400/70 border-blue-400/20',
  Romance: 'text-rose-400/70 border-rose-400/20',
  'Dark Romance': 'text-purple-400/70 border-purple-400/20',
  Thriller: 'text-orange-400/70 border-orange-400/20',
};

function getBadgeClass(genre: string) {
  return GENRE_COLORS[genre] ?? 'text-[#72708a] border-white/12';
}

interface StoryWorkspaceProps {
  story: Story;
  llmSettings: LLMSettings;
  onBack: () => void;
  onUpdateStory: (updates: Partial<Story>) => void;
}

export function StoryWorkspace({ story, llmSettings, onBack, onUpdateStory }: StoryWorkspaceProps) {
  const [activePanel, setActivePanel] = useState<WorkspacePanel>('write');
  const [instruction, setInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState('');
  const [stopFlag, setStopFlag] = useState(false);

  // Modals
  const [showEditStory, setShowEditStory] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [deletingSegment, setDeletingSegment] = useState<StorySegment | null>(null);

  const activeSegments = story.segments.filter(s => s.branchId === story.currentBranchId);

  const addSegment = (seg: StorySegment) => {
    onUpdateStory({ segments: [...story.segments, seg] });
  };

  const handleGenerate = useCallback(async () => {
    if (!instruction.trim() || isGenerating) return;

    const dir = instruction.trim();
    setInstruction('');
    setActivePanel('write');

    // Add direction segment
    const dirSeg: StorySegment = {
      id: uid(),
      branchId: story.currentBranchId,
      type: 'direction',
      content: dir,
      timestamp: new Date().toISOString(),
    };
    const afterDir = [...story.segments, dirSeg];
    onUpdateStory({ segments: afterDir });

    setIsGenerating(true);
    setGeneratingText('');
    setStopFlag(false);

    let text = '';

    // Try real LLM if configured
    if (llmSettings.apiUrl && llmSettings.model) {
      try {
        const systemPrompt = `You are a creative fiction co-writer helping to continue a story. The story has the following tone: ${story.tone}. Genres: ${story.genres.join(', ')}. Pacing: ${story.pacing}. Write immersive, literary prose. Continue the story based on the direction given. No chat, no commentary — only the narrative text. 2-4 paragraphs.`;
        const storyContext = activeSegments
          .filter(s => s.type === 'narrative')
          .slice(-3)
          .map(s => s.content)
          .join('\n\n---\n\n');

        const resp = await fetch(`${llmSettings.apiUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(llmSettings.apiKey ? { Authorization: `Bearer ${llmSettings.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: llmSettings.model,
            stream: true,
            max_tokens: llmSettings.maxTokens,
            temperature: llmSettings.temperature,
            messages: [
              { role: 'system', content: systemPrompt },
              ...(storyContext ? [{ role: 'assistant', content: storyContext }] : []),
              { role: 'user', content: `Direction: ${dir}\n\nContinue the story:` },
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
            if (done) break;
            if (stopFlag) { reader.cancel(); break; }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.replace(/^data: /, '').trim();
              if (!trimmed || trimmed === '[DONE]') continue;
              try {
                const chunk = JSON.parse(trimmed);
                const delta = chunk.choices?.[0]?.delta?.content ?? '';
                if (delta) {
                  text += delta;
                  setGeneratingText(text);
                }
              } catch {
                // ignore malformed chunks
              }
            }
          }
        }
      } catch {
        // fall through to mock
      }
    }

    // Fallback: mock typewriter
    if (!text) {
      const mockText = getMockResponse();
      for (let i = 0; i <= mockText.length; i++) {
        if (stopFlag) break;
        text = mockText.slice(0, i);
        setGeneratingText(text);
        await sleep(12);
      }
      text = mockText;
    }

    // Save narrative segment
    if (text.trim()) {
      const narSeg: StorySegment = {
        id: uid(),
        branchId: story.currentBranchId,
        type: 'narrative',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };
      onUpdateStory({
        segments: [...afterDir, narSeg],
        updatedAt: new Date().toISOString(),
      });
    }

    setGeneratingText('');
    setIsGenerating(false);
    setStopFlag(false);
  }, [instruction, isGenerating, story, llmSettings, activeSegments, stopFlag, onUpdateStory]);

  const handleStop = () => setStopFlag(true);

  const handleDeleteSegment = (seg: StorySegment) => setDeletingSegment(seg);

  const handleDeleteOnly = () => {
    if (!deletingSegment) return;
    onUpdateStory({ segments: story.segments.filter(s => s.id !== deletingSegment.id) });
  };

  const handleRewindHere = () => {
    if (!deletingSegment) return;
    const idx = story.segments.findIndex(s => s.id === deletingSegment.id);
    onUpdateStory({ segments: story.segments.slice(0, idx) });
  };

  const handleAddCard = (card: Omit<ContextCard, 'id'>) => {
    onUpdateStory({ cards: [...story.cards, { ...card, id: uid() }] });
  };

  const handleAutoGenerate = (_premise: string) => {
    // In real app: call LLM to extract cards. Mock: add placeholder cards.
    const mockCards: ContextCard[] = [
      {
        id: uid(),
        type: 'character',
        title: 'Protagonist',
        fields: [{ key: 'Note', value: 'Auto-generated from premise — edit to refine' }],
      },
    ];
    onUpdateStory({ cards: [...story.cards, ...mockCards] });
  };

  const handleSwitchBranch = (branchId: string) => {
    onUpdateStory({ currentBranchId: branchId });
  };

  const handleExport = () => {
    const text = activeSegments
      .filter(s => s.type === 'narrative')
      .map(s => s.content)
      .join('\n\n* * *\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const configured = !!(llmSettings.apiUrl && llmSettings.model);

  return (
    <div className="h-screen flex flex-col bg-[#0c0c11] overflow-hidden">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/6 bg-[#0f0f15]">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1
            className="text-[#e6e0d4] truncate leading-snug"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.1rem' }}
          >
            {story.title}
          </h1>
          {story.genres.slice(0, 2).map(g => (
            <span key={g} className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full border ${getBadgeClass(g)}`}>
              {g}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* LLM status dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full ${configured ? 'bg-emerald-400' : 'bg-[#72708a]'}`}
            title={configured ? `Connected: ${llmSettings.model}` : 'LLM not configured'}
          />
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
            title="Export story"
          >
            <FileDown size={16} />
          </button>
          <button
            onClick={() => setShowEditStory(true)}
            className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ── Desktop Layout ─────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 min-h-0">
        {/* Left sidebar: Cards or Tree */}
        <div className="w-72 shrink-0 border-r border-white/6 flex flex-col bg-[#0f0f15]">
          {/* Sidebar tab switcher */}
          <div className="flex border-b border-white/6">
            <button
              onClick={() => setActivePanel(activePanel === 'cards' ? 'write' : 'cards')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 transition-colors ${
                activePanel === 'cards'
                  ? 'border-[#c8922a] text-[#d4a853]'
                  : 'border-transparent text-[#72708a] hover:text-[#b8b4aa]'
              }`}
            >
              <Layers size={13} /> Cards
              {story.cards.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activePanel === 'cards' ? 'bg-[#c8922a]/20 text-[#d4a853]' : 'bg-white/6 text-[#72708a]'}`}>
                  {story.cards.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActivePanel(activePanel === 'tree' ? 'write' : 'tree')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 transition-colors ${
                activePanel === 'tree'
                  ? 'border-[#c8922a] text-[#d4a853]'
                  : 'border-transparent text-[#72708a] hover:text-[#b8b4aa]'
              }`}
            >
              <GitBranch size={13} /> Tree
            </button>
          </div>

          {activePanel === 'cards' && (
            <ContextCardsPanel
              cards={story.cards}
              onAddCard={() => setShowAddCard(true)}
              onAutoGenerate={() => setShowAutoGenerate(true)}
            />
          )}
          {activePanel === 'tree' && (
            <StoryTreePanel story={story} onSwitchBranch={handleSwitchBranch} />
          )}
          {activePanel === 'write' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
              <p className="text-xs text-[#72708a]">Select Cards or Tree to open the sidebar panel.</p>
            </div>
          )}
        </div>

        {/* Center: Writing area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <WritingArea
            segments={activeSegments}
            generatingText={generatingText}
            isGenerating={isGenerating}
            onDeleteSegment={handleDeleteSegment}
          />
        </div>

        {/* Right: Instruction panel */}
        <div className="w-72 shrink-0">
          <InstructionPanel
            value={instruction}
            onChange={setInstruction}
            onGenerate={handleGenerate}
            onStop={handleStop}
            isGenerating={isGenerating}
            compact={false}
          />
        </div>
      </div>

      {/* ── Mobile Layout ──────────────────────────────────────── */}
      <div className="flex md:hidden flex-col flex-1 min-h-0">
        {/* Main content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activePanel === 'write' && (
            <WritingArea
              segments={activeSegments}
              generatingText={generatingText}
              isGenerating={isGenerating}
              onDeleteSegment={handleDeleteSegment}
            />
          )}
          {activePanel === 'cards' && (
            <ContextCardsPanel
              cards={story.cards}
              onAddCard={() => setShowAddCard(true)}
              onAutoGenerate={() => setShowAutoGenerate(true)}
            />
          )}
          {activePanel === 'tree' && (
            <StoryTreePanel story={story} onSwitchBranch={handleSwitchBranch} />
          )}
        </div>

        {/* Instruction input (above tab bar) */}
        <InstructionPanel
          value={instruction}
          onChange={setInstruction}
          onGenerate={handleGenerate}
          onStop={handleStop}
          isGenerating={isGenerating}
          compact={true}
        />

        {/* Mobile tab bar */}
        <div className="shrink-0 flex border-t border-white/6 bg-[#0f0f15] pb-safe-bottom">
          {(
            [
              { id: 'write', label: 'Write', icon: <Edit2 size={18} /> },
              { id: 'cards', label: 'Cards', icon: <Layers size={18} /> },
              { id: 'tree', label: 'Tree', icon: <GitBranch size={18} /> },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                activePanel === tab.id ? 'text-[#c8922a]' : 'text-[#72708a]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showEditStory && (
        <StoryModal
          initialData={story}
          onSave={(d) => { onUpdateStory(d); setShowEditStory(false); }}
          onClose={() => setShowEditStory(false)}
        />
      )}
      {showAddCard && (
        <AddCardModal
          onAdd={handleAddCard}
          onClose={() => setShowAddCard(false)}
        />
      )}
      {showAutoGenerate && (
        <AutoGenerateModal
          onGenerate={handleAutoGenerate}
          onClose={() => setShowAutoGenerate(false)}
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
