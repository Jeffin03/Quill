import { useState } from 'react';
import { Plus, Wand2, User, Heart, BookOpen, Globe, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { ContextCard } from '../types';

const TYPE_CONFIG: Record<ContextCard['type'], { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  character: {
    label: 'Character',
    icon: <User size={13} />,
    color: 'text-amber-400',
    bg: 'bg-amber-400/8',
    border: 'border-amber-400/20',
  },
  relationship: {
    label: 'Relationship',
    icon: <Heart size={13} />,
    color: 'text-rose-400',
    bg: 'bg-rose-400/8',
    border: 'border-rose-400/20',
  },
  plot: {
    label: 'Plot',
    icon: <BookOpen size={13} />,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/8',
    border: 'border-indigo-400/20',
  },
  world: {
    label: 'World',
    icon: <Globe size={13} />,
    color: 'text-teal-400',
    bg: 'bg-teal-400/8',
    border: 'border-teal-400/20',
  },
  arc: {
    label: 'Arc',
    icon: <TrendingUp size={13} />,
    color: 'text-lime-400',
    bg: 'bg-lime-400/8',
    border: 'border-lime-400/20',
  },
};

const FILTER_ORDER: Array<ContextCard['type'] | 'all'> = ['all', 'character', 'relationship', 'plot', 'world', 'arc'];

function CardItem({ card }: { card: ContextCard }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[card.type];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cfg.color}>{cfg.icon}</span>
          <span className="text-sm text-[#e6e0d4] truncate">{card.title}</span>
        </div>
        <span className={`ml-2 shrink-0 ${cfg.color} opacity-60`}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {open && card.fields.length > 0 && (
        <div className="px-3.5 pb-3 pt-0 space-y-1.5 border-t border-white/5">
          {card.fields.map((f, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-[11px] text-[#72708a] shrink-0 w-28 truncate">{f.key}</span>
              <span className="text-[11px] text-[#b8b4aa] leading-relaxed">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ContextCardsPanelProps {
  cards: ContextCard[];
  onAddCard: () => void;
  onAutoGenerate: () => void;
}

export function ContextCardsPanel({ cards, onAddCard, onAutoGenerate }: ContextCardsPanelProps) {
  const [filter, setFilter] = useState<ContextCard['type'] | 'all'>('all');

  const filtered = filter === 'all' ? cards : cards.filter(c => c.type === filter);

  const countFor = (t: ContextCard['type'] | 'all') =>
    t === 'all' ? cards.length : cards.filter(c => c.type === t).length;

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="px-3 pt-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {FILTER_ORDER.map(t => {
          const count = countFor(t);
          const active = filter === t;
          const cfg = t !== 'all' ? TYPE_CONFIG[t] : null;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border shrink-0 transition-all ${
                active
                  ? cfg
                    ? `${cfg.color} ${cfg.bg} ${cfg.border}`
                    : 'text-[#d4a853] bg-[#c8922a]/12 border-[#c8922a]/30'
                  : 'text-[#72708a] bg-white/4 border-white/8 hover:border-white/14 hover:text-[#b8b4aa]'
              }`}
            >
              {cfg && <span className={active ? cfg.color : 'opacity-60'}>{cfg.icon}</span>}
              <span className="capitalize">{t}</span>
              {count > 0 && (
                <span className={`opacity-60 text-[10px] ${active ? '' : 'text-[#72708a]'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c24] border border-white/6 flex items-center justify-center mb-3">
              {filter !== 'all' && TYPE_CONFIG[filter] ? (
                <span className={TYPE_CONFIG[filter].color}>{TYPE_CONFIG[filter].icon}</span>
              ) : (
                <BookOpen size={18} className="text-[#72708a]" />
              )}
            </div>
            <p className="text-sm text-[#72708a]">
              {filter === 'all' ? 'No context cards yet' : `No ${TYPE_CONFIG[filter as ContextCard['type']].label.toLowerCase()} cards`}
            </p>
            <p className="text-xs text-[#72708a]/60 mt-1">Add cards to help the AI understand your story</p>
          </div>
        ) : (
          filtered.map(card => <CardItem key={card.id} card={card} />)
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-3 border-t border-white/6 flex gap-2">
        <button
          onClick={onAutoGenerate}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#c8922a]/10 border border-[#c8922a]/25 text-[#d4a853] hover:bg-[#c8922a]/15 text-xs transition-colors"
        >
          <Wand2 size={13} />
          Auto-generate
        </button>
        <button
          onClick={onAddCard}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-[#b8b4aa] hover:bg-white/8 hover:text-[#e6e0d4] text-xs transition-colors"
        >
          <Plus size={13} />
          Add Card
        </button>
      </div>
    </div>
  );
}
