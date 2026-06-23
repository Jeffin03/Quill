import { useState } from 'react';
import { Plus, Upload, Settings, Feather, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import type { Story, LLMSettings } from '../types';

const GENRE_COLORS: Record<string, string> = {
  Romance: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  'Dark Romance': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Fantasy: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Thriller: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Angst: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  'Hurt/Comfort': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'Slice of Life': 'text-green-400 bg-green-400/10 border-green-400/20',
  Action: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Horror: 'text-red-400 bg-red-400/10 border-red-400/20',
  Mystery: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'General Fiction': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

function getGenreColor(genre: string) {
  return GENRE_COLORS[genre] ?? 'text-[#72708a] bg-white/5 border-white/10';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function LLMStatusBadge({ settings }: { settings: LLMSettings }) {
  const configured = !!(settings.apiUrl && settings.model);
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
      configured
        ? 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20'
        : 'text-[#72708a] bg-white/4 border-white/8'
    }`}>
      {configured ? <Wifi size={11} /> : <WifiOff size={11} />}
      {configured ? settings.model : 'Not Configured'}
    </div>
  );
}

function StoryCard({ story, onClick }: { story: Story; onClick: () => void }) {
  const wordCount = story.segments
    .filter(s => s.type === 'narrative')
    .reduce((n, s) => n + s.content.split(/\s+/).length, 0);

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left p-4 rounded-2xl bg-[#131318] border border-white/6 hover:border-[#c8922a]/30 hover:bg-[#17171e] transition-all duration-200 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c8922a]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-[#e6e0d4] leading-snug line-clamp-2 pr-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.05rem' }}>
          {story.title}
        </h3>
        {story.segments.length === 0 && (
          <span className="shrink-0 text-[10px] text-[#72708a] bg-white/4 border border-white/8 px-2 py-0.5 rounded-full mt-0.5">
            Empty
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {story.genres.slice(0, 3).map(g => (
          <span key={g} className={`text-[10px] px-2 py-0.5 rounded-full border ${getGenreColor(g)}`}>
            {g}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#72708a]">
        <span>{story.pacing}</span>
        <div className="flex items-center gap-2">
          {wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
          <span>{formatDate(story.updatedAt)}</span>
        </div>
      </div>
    </button>
  );
}

interface StoryListViewProps {
  stories: Story[];
  llmSettings: LLMSettings;
  onOpenStory: (id: string) => void;
  onNewStory: () => void;
  onImport: () => void;
  onLLMSettings: () => void;
}

export function StoryListView({ stories, llmSettings, onOpenStory, onNewStory, onImport, onLLMSettings }: StoryListViewProps) {
  return (
    <div className="min-h-screen bg-[#0c0c11] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 pt-safe-top">
        <div className="flex items-center justify-between py-4 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c8922a]/15 border border-[#c8922a]/30 flex items-center justify-center">
              <Feather size={15} className="text-[#c8922a]" />
            </div>
            <div>
              <div className="text-[#e6e0d4] leading-none" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.2rem' }}>
                Quill
              </div>
              <div className="text-[10px] text-[#72708a] leading-none mt-0.5">fanfic co-writing studio</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onImport}
              className="p-2 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
              title="Import story"
            >
              <Upload size={17} />
            </button>
            <button
              onClick={onLLMSettings}
              className="p-2 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
              title="LLM settings"
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* LLM status */}
      <div className="px-4 max-w-2xl mx-auto w-full mb-4">
        <button onClick={onLLMSettings} className="flex items-center gap-2 group">
          <LLMStatusBadge settings={llmSettings} />
          {!llmSettings.apiUrl && (
            <span className="text-[11px] text-[#72708a]/70 group-hover:text-[#72708a] transition-colors flex items-center gap-1">
              <AlertCircle size={10} /> Configure to enable AI writing
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-8 max-w-2xl mx-auto w-full">
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1c1c24] border border-white/6 flex items-center justify-center mb-5">
              <Feather size={28} className="text-[#c8922a]/50" />
            </div>
            <p className="text-[#e6e0d4] mb-1" style={{ fontFamily: "'EB Garamond', serif", fontSize: '1.3rem' }}>
              Your stories await
            </p>
            <p className="text-sm text-[#72708a] mb-8 max-w-xs">
              Begin a new story and let the words flow. Quill will help you shape every twist and turn.
            </p>
            <button
              onClick={onNewStory}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] transition-colors"
            >
              <Plus size={16} />
              Start Your First Story
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-[#72708a] uppercase tracking-wider">
                {stories.length} {stories.length === 1 ? 'Story' : 'Stories'}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stories.map(story => (
                <StoryCard key={story.id} story={story} onClick={() => onOpenStory(story.id)} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={onNewStory}
        className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 w-14 h-14 rounded-2xl bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] shadow-lg shadow-[#c8922a]/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20"
        aria-label="New story"
      >
        <Plus size={22} />
      </button>
    </div>
  );
}
