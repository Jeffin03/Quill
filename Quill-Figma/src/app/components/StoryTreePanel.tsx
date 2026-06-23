import { GitBranch, Circle, GitFork } from 'lucide-react';
import type { Story, Branch, StorySegment } from '../types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getSegmentsForBranch(segments: StorySegment[], branchId: string) {
  return segments.filter(s => s.branchId === branchId);
}

function BranchTrack({
  branch,
  segments,
  isActive,
  onSwitch,
  depth = 0,
}: {
  branch: Branch;
  segments: StorySegment[];
  isActive: boolean;
  onSwitch: (id: string) => void;
  depth?: number;
}) {
  const branchSegs = getSegmentsForBranch(segments, branch.id);
  const narrativeCount = branchSegs.filter(s => s.type === 'narrative').length;

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div
          className="absolute top-5 border-l border-dashed border-[#c8922a]/30"
          style={{ left: depth * 20 - 10, height: 'calc(100% - 20px)', top: 20 }}
        />
      )}

      <button
        onClick={() => onSwitch(branch.id)}
        style={{ paddingLeft: depth * 20 + 12 }}
        className={`w-full flex items-start gap-3 pr-3 py-3 rounded-xl text-left transition-all ${
          isActive
            ? 'bg-[#c8922a]/10 border border-[#c8922a]/25'
            : 'hover:bg-white/4 border border-transparent'
        }`}
      >
        <div className={`mt-0.5 shrink-0 ${isActive ? 'text-[#c8922a]' : 'text-[#72708a]'}`}>
          {depth === 0 ? <Circle size={14} fill="currentColor" /> : <GitFork size={14} />}
        </div>
        <div className="min-w-0">
          <div className={`text-sm truncate ${isActive ? 'text-[#d4a853]' : 'text-[#b8b4aa]'}`}>
            {branch.label}
          </div>
          <div className="text-[11px] text-[#72708a] mt-0.5">
            {narrativeCount} {narrativeCount === 1 ? 'passage' : 'passages'}
            {isActive && <span className="ml-2 text-[#c8922a]/70">active</span>}
          </div>
        </div>
      </button>
    </div>
  );
}

// Simple timeline of narrative passages
function NarrativeTimeline({ segments }: { segments: StorySegment[] }) {
  const narrative = segments.filter(s => s.type === 'narrative');
  if (narrative.length === 0) return null;

  return (
    <div className="px-3 pt-2 pb-3">
      <div className="text-[10px] text-[#72708a] uppercase tracking-widest mb-3">Passages</div>
      <div className="relative pl-4">
        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-white/8" />
        {narrative.map((seg, i) => (
          <div key={seg.id} className="relative mb-3 last:mb-0">
            <div className="absolute -left-3 top-1.5 w-1.5 h-1.5 rounded-full bg-[#c8922a]/40 border border-[#c8922a]/60" />
            <div className="text-[11px] text-[#72708a]">{formatTime(seg.timestamp)}</div>
            <p className="text-xs text-[#9992a6] leading-relaxed mt-0.5 line-clamp-2" style={{ fontFamily: "'EB Garamond', serif" }}>
              {seg.content.slice(0, 90)}{seg.content.length > 90 ? '…' : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StoryTreePanelProps {
  story: Story;
  onSwitchBranch: (branchId: string) => void;
}

export function StoryTreePanel({ story, onSwitchBranch }: StoryTreePanelProps) {
  const rootBranches = story.branches.filter(b => b.parentBranchId === null);
  const childBranches = (parentId: string) => story.branches.filter(b => b.parentBranchId === parentId);

  const renderBranch = (branch: Branch, depth = 0): React.ReactNode => (
    <div key={branch.id}>
      <BranchTrack
        branch={branch}
        segments={story.segments}
        isActive={story.currentBranchId === branch.id}
        onSwitch={onSwitchBranch}
        depth={depth}
      />
      {childBranches(branch.id).map(child => renderBranch(child, depth + 1))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch size={14} className="text-[#c8922a]/70" />
          <span className="text-xs text-[#72708a] uppercase tracking-widest">Narrative Branches</span>
        </div>
        <p className="text-[11px] text-[#72708a]/60 leading-relaxed">
          Use "Rewind to here" in the manuscript to create branches and explore alternate paths.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {rootBranches.map(b => renderBranch(b))}
        {story.branches.length === 0 && (
          <div className="text-center py-10 text-sm text-[#72708a]">No branches yet</div>
        )}
      </div>

      <div className="border-t border-white/6">
        <NarrativeTimeline segments={story.segments.filter(s => s.branchId === story.currentBranchId)} />
      </div>
    </div>
  );
}
