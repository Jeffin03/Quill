export interface StorySettings {
    genre: string[];
    pacing: string;
    tone: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    parentId: string | null;
    timestamp: string;
    editedAt?: string;
    cardSnapshot: ContextCard[];
}

export interface ContextCard {
    id: string;
    type: 'character' | 'relationship' | 'plot' | 'world' | 'arc';
    title: string;
    fields: Record<string, string>;
    lastUpdated: string;
}

export interface Branch {
    id: string;
    label: string;
    parentBranchId: string | null;
    forkAtMessageId: string | null;
    createdAt: string;
}

export interface Story {
    id: string;
    title: string;
    settings: StorySettings;
    messages: Message[];
    cards: ContextCard[];
    branches: Branch[];
    activeBranchId: string | null;
    rootMessageId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LLMSettings {
    apiUrl: string;
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature: number;
    recentModels: string[];
}

export type WorkspacePanel = 'write' | 'cards' | 'tree';