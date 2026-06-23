import { useEffect, useRef } from 'react';
import { Feather, MoreHorizontal } from 'lucide-react';
import type { StorySegment } from '../types';

function renderMarkdown(text: string) {
  return text
    .split('\n\n')
    .map((para, i) => {
      if (!para.trim()) return null;
      // Handle *italic* within paragraph
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
      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#c8922a]/50 shrink-0 mt-[7px]" />
      <p className="text-sm text-[#72708a] italic leading-relaxed">
        You directed: <span className="text-[#9992a6]">{content}</span>
      </p>
    </div>
  );
}

function NarrativeBlock({
  content,
  isNew,
  onOptions,
}: {
  content: string;
  isNew?: boolean;
  onOptions: () => void;
}) {
  return (
    <div className={`group relative ${isNew ? 'segment-enter' : ''}`}>
      <div className="manuscript text-[#e6e0d4] space-y-0">
        {renderMarkdown(content)}
      </div>
      <button
        onClick={onOptions}
        className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/8"
      >
        <MoreHorizontal size={15} />
      </button>
    </div>
  );
}

interface WritingAreaProps {
  segments: StorySegment[];
  generatingText: string;
  isGenerating: boolean;
  onDeleteSegment: (segment: StorySegment) => void;
}

export function WritingArea({ segments, generatingText, isGenerating, onDeleteSegment }: WritingAreaProps) {
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
          return (
            <NarrativeBlock
              key={seg.id}
              content={seg.content}
              isNew={idx === segments.length - 1 && !isGenerating}
              onOptions={() => onDeleteSegment(seg)}
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
