import { useRef, useEffect, useState } from 'react';
import { Send, Square, ChevronDown, ChevronUp } from 'lucide-react';

interface InstructionPanelProps {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  onStop: () => void;
  isGenerating: boolean;
  compact?: boolean; // mobile = true, desktop = false
}

export function InstructionPanel({
  value,
  onChange,
  onGenerate,
  onStop,
  isGenerating,
  compact = false,
}: InstructionPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = compact ? 120 : 260;
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  }, [value, compact]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isGenerating) {
      e.preventDefault();
      onGenerate();
    }
  };

  if (compact) {
    // Mobile: compact bar anchored to bottom above tab bar
    return (
      <div className="border-t border-white/6 bg-[#0f0f15]">
        {expanded && (
          <div className="px-3 pt-3 pb-1">
            <div className="text-[10px] text-[#c8922a]/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#c8922a]/50" />
              Direct the Story
            </div>
          </div>
        )}
        <div className="px-3 py-2 flex items-end gap-2">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-[#72708a] hover:text-[#e6e0d4] transition-colors shrink-0 mb-0.5"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What happens next..."
              rows={1}
              className="w-full bg-[#1c1c24] border border-white/8 rounded-xl text-[#e6e0d4] placeholder:text-[#72708a] resize-none px-3 py-2 text-sm outline-none focus:border-[#c8922a]/40 transition-colors leading-relaxed"
              style={{ minHeight: 40, maxHeight: expanded ? 120 : 40 }}
            />
          </div>
          {isGenerating ? (
            <button
              onClick={onStop}
              className="shrink-0 w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center hover:bg-red-500/25 transition-colors"
            >
              <Square size={13} />
            </button>
          ) : (
            <button
              onClick={onGenerate}
              disabled={!value.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop: full right-panel
  return (
    <div className="flex flex-col h-full bg-[#0f0f15] border-l border-white/6">
      <div className="px-4 pt-5 pb-3 border-b border-white/5">
        <div className="text-[10px] text-[#c8922a]/70 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-[#c8922a]/50" />
          Direct the Story
        </div>
        <p className="text-xs text-[#72708a] leading-relaxed">
          Guide what happens next. The AI will continue the narrative from your direction.
        </p>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What should happen next? Guide the characters, set the scene, introduce a twist..."
            className="w-full h-full bg-[#1c1c24] border border-white/8 rounded-xl text-[#e6e0d4] placeholder:text-[#72708a] resize-none p-3.5 text-sm outline-none focus:border-[#c8922a]/40 transition-colors leading-relaxed"
            style={{ minHeight: 160 }}
          />
        </div>

        <div className="text-[10px] text-[#72708a]/50 text-right">
          Ctrl+Enter to generate
        </div>

        {isGenerating ? (
          <button
            onClick={onStop}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Square size={13} />
            Stop generating
          </button>
        ) : (
          <button
            onClick={onGenerate}
            disabled={!value.trim()}
            className="w-full py-3 rounded-xl bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] text-sm flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:scale-98"
          >
            <Send size={14} />
            Generate
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="h-px bg-white/5" />
        <p className="text-[10px] text-[#72708a]/50 leading-relaxed">
          All your data stays on this device. No story content is ever sent to Quill's servers.
        </p>
      </div>
    </div>
  );
}
