import { useEffect, useRef, useState } from 'react';
import { Feather, ImagePlus, GitFork, Pencil, Trash2, Save, X } from 'lucide-react';
import type { StorySegment } from '../types';

function renderMarkdown(text: string) {
  return text
    .split('\n\n')
    .map((para, i) => {
      if (!para.trim()) return null;
      const parts = para.split(/(\*[^*]+\*)/g).map((chunk, j) => {
        if (chunk.startsWith('*') && chunk.endsWith('*')) {
          return <em key={j}>{chunk.slice(1, -1)}</em>;
        }
        return chunk;
      });
      return <p key={i}>{parts}</p>;
    })
    .filter(Boolean);
}

function DirectionNote({ content }: { content: string }) {
  return (
    <div className="my-6 flex items-start gap-3 px-1">
      <div className="w-1.5 h-1.5 rounded-full bg-[#c8922a]/50 shrink-0 mt-[7px]" />
      <p className="text-sm text-[#72708a] italic leading-relaxed">
        You directed: <span className="text-[#9992a6]">{content}</span>
      </p>
    </div>
  );
}

function NarrativeBlock({
  content,
  isNew,
  onVisualize,
  onBranch,
  onEdit,
  onDelete,
}: {
  content: string;
  isNew?: boolean;
  onVisualize: () => void;
  onBranch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`group relative ${isNew ? 'segment-enter' : ''}`}>
      <div className="manuscript text-[#e6e0d4] space-y-0">
        {renderMarkdown(content)}
      </div>

      {/* Hover action bar */}
      <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onVisualize}
          title="Visualize scene"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#72708a] hover:text-[#c8922a] hover:bg-[#c8922a]/8 transition-colors text-xs"
        >
          <ImagePlus size={13} />
          <span className="hidden sm:inline">Visualize</span>
        </button>
        <button
          onClick={onBranch}
          title="Branch from here"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#72708a] hover:text-[#7c6dd8] hover:bg-[#7c6dd8]/8 transition-colors text-xs"
        >
          <GitFork size={13} />
          <span className="hidden sm:inline">Branch</span>
        </button>
        <button
          onClick={onEdit}
          title="Edit passage"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#72708a] hover:text-[#4ab5a3] hover:bg-[#4ab5a3]/8 transition-colors text-xs"
        >
          <Pencil size={13} />
          <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          onClick={onDelete}
          title="Delete / rewind"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#72708a] hover:text-red-400 hover:bg-red-400/8 transition-colors text-xs"
        >
          <Trash2 size={13} />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}

function InlineEditBlock({
  content,
  onSave,
  onCancel,
}: {
  content: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="segment-enter">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full bg-[#1c1c24] border border-[#c8922a]/30 rounded-xl text-[#e6e0d4] p-4 resize-none outline-none focus:border-[#c8922a]/55 transition-colors leading-relaxed"
        style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.125rem', lineHeight: 1.95, minHeight: 120 }}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSave(value)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c8922a]/15 border border-[#c8922a]/30 text-[#d4a853] hover:bg-[#c8922a]/25 transition-colors text-xs"
        >
          <Save size={12} /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[#72708a] hover:text-[#e6e0d4] transition-colors text-xs"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

interface WritingAreaProps {
  segments: StorySegment[];
  generatingText: string;
  isGenerating: boolean;
  onDeleteSegment: (segment: StorySegment) => void;
  onEditSegment?: (segmentId: string, newContent: string) => void;
}

export function WritingArea({
  segments,
  generatingText,
  isGenerating,
  onDeleteSegment,
  onEditSegment,
}: WritingAreaProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(segments.length);

  useEffect(() => {
    if (segments.length !== prevLengthRef.current || isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      prevLengthRef.current = segments.length;
    }
  }, [segments.length, generatingText, isGenerating]);

  if (segments.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#1c1c24] border border-white/6 flex items-center justify-center mb-4">
          <Feather size={22} className="text-[#c8922a]/40" />
        </div>
        <p className="text-[#e6e0d4] mb-2" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.15rem' }}>
          The page is yours
        </p>
        <p className="text-sm text-[#72708a] max-w-xs leading-relaxed">
          Write a direction below to begin your story. Tell the AI what should happen — a scene, a character entrance, a turning point.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-5 pt-8 pb-4 space-y-1">
        {segments.map((seg, idx) => {
          if (seg.type === 'direction') {
            return <DirectionNote key={seg.id} content={seg.content} />;
          }

          if (editingId === seg.id) {
            return (
              <InlineEditBlock
                key={seg.id}
                content={seg.content}
                onSave={(v) => {
                  onEditSegment?.(seg.id, v);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <NarrativeBlock
              key={seg.id}
              content={seg.content}
              isNew={idx === segments.length - 1 && !isGenerating}
              onVisualize={() => {}}
              onBranch={() => {}}
              onEdit={() => setEditingId(seg.id)}
              onDelete={() => onDeleteSegment(seg)}
            />
          );
        })}

        {isGenerating && generatingText && (
          <div className="segment-enter">
            <div className="manuscript text-[#e6e0d4] space-y-0">
              {renderMarkdown(generatingText)}
            </div>
            <span className="inline-block w-0.5 h-4 bg-[#c8922a] cursor-blink ml-0.5 align-text-bottom" />
          </div>
        )}

        {isGenerating && !generatingText && (
          <div className="flex items-center gap-2 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#c8922a]/60"
                  style={{ animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <span className="text-xs text-[#72708a]">Writing...</span>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
