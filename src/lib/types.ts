export interface StorySettings {
	genre: string[];
	pacing: string;
	tone: string;
}

export interface SceneVisualization {
	id: string;
	imageBase64: string;
	prompt: string;
	timestamp: string;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	parentId: string | null;
	timestamp: string;
	editedAt?: string;
	cardSnapshot: ContextCard[];
	visualization?: SceneVisualization | null;
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

export interface APIEntry {
	id: string;
	provider: 'lmstudio' | 'ollama' | 'openrouter' | 'nim' | 'comfyui' | 'custom';
	host: string;
	apiKey?: string;
	model: string;
	label?: string;
	capabilities?: {
		text?: boolean;
		image?: boolean;
	};
}

export interface FeatureRouting {
	story?: string;
	cards?: string;
	prompts?: string;
	image?: string;
}

export type WorkspacePanel = 'write' | 'cards' | 'tree';
