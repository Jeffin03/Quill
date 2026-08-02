/* ══════════════════════════════════════════
   Quill — IndexedDB Storage Layer
   Ported from docs/js/db.js.
   All story and settings data lives in the
   browser's local IndexedDB database.
   ══════════════════════════════════════════ */

import type { Story, APIEntry, FeatureRouting } from '$lib/types';

const DB_NAME = 'QuillStudio';
const DB_VERSION = 3;

let db: IDBDatabase | null = null;

/**
 * Open (or create) the IndexedDB database.
 */
function open(): Promise<IDBDatabase> {
	if (db) return Promise.resolve(db);

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = (e) => {
			const database = (e.target as IDBOpenDBRequest).result;

			if (!database.objectStoreNames.contains('stories')) {
				database.createObjectStore('stories', { keyPath: 'id' });
			}
			if (!database.objectStoreNames.contains('settings')) {
				database.createObjectStore('settings', { keyPath: 'key' });
			}
			if (!database.objectStoreNames.contains('characters')) {
				database.createObjectStore('characters', { keyPath: 'id' });
			}
			if (!database.objectStoreNames.contains('comics')) {
				database.createObjectStore('comics', { keyPath: 'id' });
			}
		};

		request.onsuccess = (e) => {
			db = (e.target as IDBOpenDBRequest).result;

			db.onversionchange = () => {
				db!.close();
				db = null;
			};
			db.onclose = () => {
				db = null;
			};

			resolve(db);
		};

		request.onerror = (e) => {
			reject((e.target as IDBOpenDBRequest).error);
		};
	});
}

/**
 * Strip Svelte 5 $state proxies so values can be
 * structured-cloned into IndexedDB.
 */
function toPlain<T>(value: T): T {
	try {
		if (typeof structuredClone === 'function') return structuredClone(value);
	} catch {
		// Proxies can't be structured-cloned — fall through to JSON.
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Generic helper: run a transaction on a store.
 */
async function tx<T>(
	storeName: string,
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, mode);
		const store = transaction.objectStore(storeName);
		const request = fn(store);

		transaction.oncomplete = () => resolve(request.result);
		transaction.onerror = () => reject(transaction.error);
	});
}

// ── Stories ──────────────────────────────

export interface StoryMetadata {
	id: string;
	title: string;
	settings: Story['settings'];
	createdAt: string;
	updatedAt: string;
	messageCount: number;
	wordCount: number;
}

export async function listStories(): Promise<StoryMetadata[]> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('stories', 'readonly');
		const store = transaction.objectStore('stories');
		const request = store.getAll();
		request.onsuccess = () => {
			const stories: StoryMetadata[] = request.result.map((s: Story) => ({
				id: s.id,
				title: s.title,
				settings: s.settings,
				createdAt: s.createdAt,
				updatedAt: s.updatedAt,
				messageCount: s.messages?.length || 0,
				wordCount:
					s.messages?.reduce(
						(n, m) =>
							m.role === 'assistant' ? n + m.content.split(/\s+/).filter(Boolean).length : n,
						0
					) || 0
			}));
			stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
			resolve(stories);
		};
		request.onerror = () => reject(request.error);
	});
}

export async function getStory(id: string): Promise<Story | null> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('stories', 'readwrite');
		const store = transaction.objectStore('stories');
		const request = store.get(id);
		request.onsuccess = () => {
			const story: Story | undefined = request.result;
			if (!story) return resolve(null);

			// Migration: Handle old linear stories
			let changed = false;
			if (!story.messages) story.messages = [];

			if (story.messages.length > 0 && !story.activeBranchId) {
				console.log(`[Migration] Migrating linear story: ${story.title}`);
				story.rootMessageId = story.messages[0].id;

				for (let i = 0; i < story.messages.length; i++) {
					const msg = story.messages[i];
					if (!msg.parentId && i > 0) msg.parentId = story.messages[i - 1].id;
					if (!msg.cardSnapshot) msg.cardSnapshot = story.cards || [];
				}

				story.activeBranchId = story.messages[story.messages.length - 1].id;
				changed = true;
			}

			if (changed) {
				story.updatedAt = new Date().toISOString();
				store.put(story);
			}

			resolve(story);
		};
		request.onerror = () => reject(request.error);
	});
}

export async function saveStory(story: Story): Promise<Story> {
	story.updatedAt = new Date().toISOString();
	await tx('stories', 'readwrite', (store) => store.put(toPlain(story)));
	return story;
}

export async function deleteStory(id: string): Promise<void> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(['stories', 'characters', 'comics'], 'readwrite');
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);

		// Delete the story
		transaction.objectStore('stories').delete(id);

		// Cascade: delete associated characters
		const charCursor = transaction.objectStore('characters').openCursor();
		charCursor.onsuccess = (e) => {
			const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				if (cursor.value.storyId === id) cursor.delete();
				cursor.continue();
			}
		};

		// Cascade: delete associated comics
		const comicCursor = transaction.objectStore('comics').openCursor();
		comicCursor.onsuccess = (e) => {
			const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				if (cursor.value.storyId === id) cursor.delete();
				cursor.continue();
			}
		};
	});
}

// ── Settings / Config ────────────────────

export interface AppConfig {
	key: string;
	apiEntries: APIEntry[];
	featureRouting: FeatureRouting;
	maxTokens: number;
	temperature: number;
	recentModels: string[];
	sanitizeEnabled: boolean;
	uncensorRewrite: boolean;
	artStyle?: string;
	[key: string]: unknown;
}

const DEFAULT_CONFIG: AppConfig = {
	key: 'config',
	apiEntries: [],
	featureRouting: {},
	maxTokens: 2048,
	temperature: 0.85,
	recentModels: ['dolphin-llama3'],
	sanitizeEnabled: true,
	uncensorRewrite: false,
	artStyle: ''
};

export async function getConfig(): Promise<AppConfig> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('settings', 'readonly');
		const store = transaction.objectStore('settings');
		const request = store.get('config');
		request.onsuccess = () => resolve(request.result || DEFAULT_CONFIG);
		request.onerror = () => reject(request.error);
	});
}

export async function saveConfig(data: Partial<AppConfig>): Promise<AppConfig> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('settings', 'readwrite');
		const store = transaction.objectStore('settings');
		let merged: AppConfig;
		const getReq = store.get('config');
		getReq.onsuccess = () => {
			const existing: AppConfig = getReq.result || DEFAULT_CONFIG;
			merged = { ...existing, ...data, key: 'config' };
			store.put(toPlain(merged));
		};
		getReq.onerror = () => reject(getReq.error);
		transaction.oncomplete = () => resolve(merged!);
		transaction.onerror = () => reject(transaction.error);
	});
}

// ── Characters ─────────────────────────

export interface Character {
	id: string;
	storyId: string;
	name: string;
	description: string;
	referenceImage: string;
	stylePrompt: string;
	createdAt: string;
	updatedAt: string;
}

export async function listCharacters(storyId: string): Promise<Character[]> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('characters', 'readonly');
		const store = transaction.objectStore('characters');
		const request = store.getAll();
		request.onsuccess = () => {
			const chars: Character[] = request.result.filter((c: Character) => c.storyId === storyId);
			chars.sort((a, b) => a.name.localeCompare(b.name));
			resolve(chars);
		};
		request.onerror = () => reject(request.error);
	});
}

export async function getCharacter(id: string): Promise<Character | null> {
	return tx('characters', 'readonly', (store) => store.get(id));
}

export async function saveCharacter(char: Character): Promise<Character> {
	char.updatedAt = new Date().toISOString();
	await tx('characters', 'readwrite', (store) => store.put(toPlain(char)));
	return char;
}

export async function deleteCharacter(id: string): Promise<void> {
	await tx('characters', 'readwrite', (store) => store.delete(id));
}

// ── Comics ─────────────────────────────

export interface Comic {
	id: string;
	storyId: string;
	title: string;
	artStyle: string;
	panels: ComicPanel[];
	createdAt: string;
	updatedAt: string;
}

export interface ComicPanel {
	id: string;
	sceneDescription: string;
	dialogue: string;
	prompt: string;
	imageBase64: string;
	aspectRatio: string;
	characterIds: string[];
	order: number;
	createdAt: string;
}

export async function listComics(storyId: string): Promise<Comic[]> {
	const database = await open();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('comics', 'readonly');
		const store = transaction.objectStore('comics');
		const request = store.getAll();
		request.onsuccess = () => {
			const comics: Comic[] = request.result.filter((c: Comic) => c.storyId === storyId);
			comics.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
			resolve(comics);
		};
		request.onerror = () => reject(request.error);
	});
}

export async function getComic(id: string): Promise<Comic | null> {
	return tx('comics', 'readonly', (store) => store.get(id));
}

export async function saveComic(comic: Comic): Promise<Comic> {
	comic.updatedAt = new Date().toISOString();
	await tx('comics', 'readwrite', (store) => store.put(toPlain(comic)));
	return comic;
}

export async function deleteComic(id: string): Promise<void> {
	await tx('comics', 'readwrite', (store) => store.delete(id));
}

// ── Import / Export ──────────────────────

/**
 * Export a single story as a downloadable JSON file.
 */
export async function exportStory(id: string): Promise<void> {
	const story = await getStory(id);
	if (!story) throw new Error('Story not found');

	const blob = new Blob([JSON.stringify(story, null, 2)], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	try {
		const a = document.createElement('a');
		a.href = url;
		a.download = `${story.title.replace(/[^a-z0-9]/gi, '_')}_quill.json`;
		a.click();
	} finally {
		URL.revokeObjectURL(url);
	}
}

/**
 * Import a story from a JSON file via file picker.
 */
export async function importStory(): Promise<Story> {
	return new Promise((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return reject(new Error('No file selected'));

			try {
				const text = await file.text();
				const story = JSON.parse(text) as Story;
				if (!story.id || !story.title) {
					throw new Error('Invalid story file: missing id or title');
				}
				if (story.messages && !Array.isArray(story.messages)) {
					throw new Error('Invalid story file: messages must be an array');
				}
				if (story.cards && !Array.isArray(story.cards)) {
					throw new Error('Invalid story file: cards must be an array');
				}
				const saved = await saveStory(story);
				resolve(saved);
			} catch (err) {
				reject(err);
			}
		};
		input.click();
	});
}
