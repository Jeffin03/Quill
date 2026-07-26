import { useState } from 'react';
import { ArrowLeft, Settings, ImagePlus, Pencil, Trash2, Plus, User, MessageSquare } from 'lucide-react';

interface ComicPanel {
  id: string;
  imageUrl?: string;
  sceneDescription: string;
  dialogue: string;
  characters: string[];
}

interface ComicCharacter {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Comic {
  id: string;
  title: string;
  panels: ComicPanel[];
  characters: ComicCharacter[];
}

// Placeholder demo comic
const DEMO_COMIC: Comic = {
  id: 'demo',
  title: 'Untitled Comic',
  panels: [
    {
      id: 'p1',
      sceneDescription: 'Rain-swept rooftop at night, amber streetlights below',
      dialogue: '"I told you not to come back."',
      characters: ['Lira'],
    },
    {
      id: 'p2',
      sceneDescription: 'Close-up on a trembling hand holding a crumpled note',
      dialogue: '',
      characters: [],
    },
    {
      id: 'p3',
      sceneDescription: 'Two figures silhouetted against a burning building',
      dialogue: '"Then we have a problem."',
      characters: ['Lira', 'Captain Voss'],
    },
  ],
  characters: [
    { id: 'c1', name: 'Lira' },
    { id: 'c2', name: 'Captain Voss' },
  ],
};

function PanelCard({
  panel,
  index,
  onEdit,
  onGenerate,
  onDelete,
}: {
  panel: ComicPanel;
  index: number;
  onEdit: () => void;
  onGenerate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/8 bg-[#131318] hover:border-white/14 transition-all">
      {/* Image area — 3:4 */}
      <div className="relative" style={{ paddingTop: '133.33%' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c24] to-[#0f0f15] flex flex-col items-center justify-center">
          {panel.imageUrl ? (
            <img src={panel.imageUrl} alt="" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-30">
              <ImagePlus size={26} className="text-[#e6e0d4]" />
              <span className="text-[10px] text-[#e6e0d4]">Panel {index + 1}</span>
            </div>
          )}

          {/* Speech bubble */}
          {panel.dialogue && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="relative bg-white rounded-xl px-3 py-2 shadow-lg">
                <p className="text-[11px] text-[#0c0c11] leading-snug" style={{ fontFamily: "'EB Garamond', serif" }}>
                  {panel.dialogue}
                </p>
                <div
                  className="absolute -bottom-2 left-5 w-0 h-0"
                  style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid white' }}
                />
              </div>
            </div>
          )}

          {/* Hover action overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
              title="Edit panel"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onGenerate}
              className="p-2 rounded-xl bg-[#c8922a]/80 hover:bg-[#c8922a] text-[#0c0c11] transition-colors backdrop-blur-sm"
              title="Generate image"
            >
              <ImagePlus size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-red-500/25 hover:bg-red-500/40 text-red-300 transition-colors backdrop-blur-sm"
              title="Delete panel"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Caption strip */}
      {panel.sceneDescription && (
        <div className="px-3 py-2 border-t border-white/6">
          <p className="text-[10px] text-[#72708a] leading-relaxed line-clamp-1">{panel.sceneDescription}</p>
        </div>
      )}
    </div>
  );
}

interface ComicWorkspaceProps {
  comicTitle?: string;
  onBack: () => void;
  onAddPanel: () => void;
  onSettings: () => void;
}

export function ComicWorkspace({ comicTitle = 'Untitled Comic', onBack, onAddPanel, onSettings }: ComicWorkspaceProps) {
  const [comic] = useState<Comic>({ ...DEMO_COMIC, title: comicTitle });

  return (
    <div className="h-screen flex flex-col bg-[#0c0c11] overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-white/6 bg-[#0f0f15]">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
        >
          <ArrowLeft size={17} />
        </button>
        <h1
          className="flex-1 text-[#e6e0d4] truncate"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.1rem' }}
        >
          {comic.title}
        </h1>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
        >
          <Settings size={16} />
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar: characters */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-white/6 bg-[#0f0f15]">
          <div className="px-3 pt-4 pb-2">
            <div className="text-[10px] text-[#72708a] uppercase tracking-widest flex items-center gap-1.5">
              <User size={11} /> Characters
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3">
            {comic.characters.map(c => {
              const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              const hue = c.name.charCodeAt(0) * 37 % 360;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-[#131318] border border-white/6"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium shrink-0"
                    style={{ background: `hsl(${hue} 30% 25%)`, color: `hsl(${hue} 60% 75%)` }}
                  >
                    {initials}
                  </div>
                  <span className="text-sm text-[#b8b4aa] truncate">{c.name}</span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main: panel grid */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {comic.panels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1c1c24] border border-white/6 flex items-center justify-center mb-4">
                <ImagePlus size={24} className="text-[#72708a]" />
              </div>
              <p className="text-[#e6e0d4] mb-2" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.15rem' }}>
                Add panels to generate your comic
              </p>
              <p className="text-sm text-[#72708a] max-w-xs">
                Each panel gets its own scene description and image generation
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {comic.panels.map((panel, i) => (
                <PanelCard
                  key={panel.id}
                  panel={panel}
                  index={i}
                  onEdit={() => {}}
                  onGenerate={() => {}}
                  onDelete={() => {}}
                />
              ))}
              {/* Add panel placeholder */}
              <button
                onClick={onAddPanel}
                className="rounded-2xl border-2 border-dashed border-white/12 hover:border-[#c8922a]/40 hover:bg-[#c8922a]/4 transition-all flex flex-col items-center justify-center gap-2 text-[#72708a] hover:text-[#c8922a]"
                style={{ paddingTop: '133.33%', position: 'relative' }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Plus size={22} />
                  <span className="text-xs">Add Panel</span>
                </div>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={onAddPanel}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 rounded-2xl bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] shadow-lg shadow-[#c8922a]/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20"
      >
        <Plus size={22} />
      </button>
    </div>
  );
}
