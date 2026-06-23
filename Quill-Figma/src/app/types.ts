export interface StorySegment {
  id: string;
  branchId: string;
  type: 'narrative' | 'direction';
  content: string;
  timestamp: string;
}

export interface ContextCard {
  id: string;
  type: 'character' | 'relationship' | 'plot' | 'world' | 'arc';
  title: string;
  fields: { key: string; value: string }[];
}

export interface Branch {
  id: string;
  label: string;
  parentBranchId: string | null;
  forkAtSegmentId: string | null;
  createdAt: string;
}

export interface Story {
  id: string;
  title: string;
  genres: string[];
  pacing: string;
  tone: string;
  segments: StorySegment[];
  cards: ContextCard[];
  branches: Branch[];
  currentBranchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LLMSettings {
  apiUrl: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
}

export type WorkspacePanel = 'write' | 'cards' | 'tree';
