import { useState, useEffect } from 'react';
import type { Story, LLMSettings } from './types';
import { SAMPLE_STORIES, DEFAULT_LLM_SETTINGS } from './sampleData';
import { StoryListView } from './components/StoryListView';
import { StoryWorkspace } from './components/StoryWorkspace';
import { StoryModal, LLMSettingsModal } from './components/Modals';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadStories(): Story[] {
  try {
    const raw = localStorage.getItem('quill_stories');
    if (raw) return JSON.parse(raw);
  } catch {}
  return SAMPLE_STORIES;
}

function loadLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem('quill_llm_settings');
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_LLM_SETTINGS;
}

export default function App() {
  const [stories, setStories] = useState<Story[]>(loadStories);
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(loadLLMSettings);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);

  // Modals
  const [showNewStory, setShowNewStory] = useState(false);
  const [showLLMSettings, setShowLLMSettings] = useState(false);

  // Persist stories
  useEffect(() => {
    localStorage.setItem('quill_stories', JSON.stringify(stories));
  }, [stories]);

  // Persist LLM settings
  useEffect(() => {
    localStorage.setItem('quill_llm_settings', JSON.stringify(llmSettings));
  }, [llmSettings]);

  const currentStory = stories.find(s => s.id === currentStoryId) ?? null;

  const createStory = (data: { title: string; genres: string[]; pacing: string; tone: string }) => {
    const newStory: Story = {
      id: uid(),
      ...data,
      segments: [],
      cards: [],
      branches: [
        { id: 'main', label: 'Main Story', parentBranchId: null, forkAtSegmentId: null, createdAt: new Date().toISOString() },
      ],
      currentBranchId: 'main',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStories(prev => [newStory, ...prev]);
    setCurrentStoryId(newStory.id);
    setShowNewStory(false);
  };

  const updateStory = (updates: Partial<Story>) => {
    if (!currentStoryId) return;
    setStories(prev =>
      prev.map(s => s.id === currentStoryId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)
    );
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as Story;
          if (data.title && data.segments) {
            const imported = { ...data, id: uid() };
            setStories(prev => [imported, ...prev]);
          }
        } catch {
          alert('Could not parse story file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (currentStory) {
    return (
      <StoryWorkspace
        story={currentStory}
        llmSettings={llmSettings}
        onBack={() => setCurrentStoryId(null)}
        onUpdateStory={updateStory}
      />
    );
  }

  return (
    <>
      <StoryListView
        stories={stories}
        llmSettings={llmSettings}
        onOpenStory={setCurrentStoryId}
        onNewStory={() => setShowNewStory(true)}
        onImport={handleImport}
        onLLMSettings={() => setShowLLMSettings(true)}
      />

      {showNewStory && (
        <StoryModal
          onSave={createStory}
          onClose={() => setShowNewStory(false)}
        />
      )}

      {showLLMSettings && (
        <LLMSettingsModal
          settings={llmSettings}
          onSave={setLLMSettings}
          onClose={() => setShowLLMSettings(false)}
        />
      )}
    </>
  );
}
