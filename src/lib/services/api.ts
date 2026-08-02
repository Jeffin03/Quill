/* ══════════════════════════════════════════
   Quill — API Facade
   Wraps db.ts with business logic.
   ══════════════════════════════════════════ */

import type { Story, ContextCard, StorySettings } from '$lib/types';
import type { Comic, ComicPanel, Character } from './db';
import { uuid } from '$lib/utils';
import * as db from './db';

// ── Stories ──────────────────────────────

export async function listStories() {
	return db.listStories();
}

export async function getStory(id: string) {
	const story = await db.getStory(id);
	if (!story) throw new Error('Story not found');
	return story;
}

export async function createStory(data: {
	title?: string;
	genre?: string | string[];
	pacing?: string;
	tone?: string;
}): Promise<Story> {
	const genres = Array.isArray(data.genre)
		? data.genre
		: data.genre
			? [data.genre]
			: ['general fiction'];
	const story: Story = {
		id: uuid(),
		title: data.title || 'Untitled Story',
		settings: {
			genre: genres,
			pacing: data.pacing || 'natural',
			tone: data.tone || 'atmospheric'
		},
		messages: [],
		cards: [],
		branches: [],
		activeBranchId: null,
		rootMessageId: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
	return db.saveStory(story);
}

export async function updateStory(id: string, data: Partial<Story>) {
	const story = await db.getStory(id);
	if (!story) throw new Error('Story not found');
	const updated = { ...story, ...data };
	return db.saveStory(updated);
}

export async function deleteStory(id: string) {
	return db.deleteStory(id);
}

// ── Branch Messages ──────────────────────

/**
 * Get messages for the active branch (traverses parentId up to root).
 */
export async function getBranchMessages(
	storyId: string,
	leafId?: string | null,
	storyObj?: Story | null
): Promise<Story['messages']> {
	const story = storyObj || (await db.getStory(storyId));
	if (!story || !story.messages || story.messages.length === 0) return [];

	const targetId = leafId || story.activeBranchId;
	if (!targetId) return story.messages;

	const messages: Story['messages'] = [];
	const msgMap = new Map(story.messages.map((m) => [m.id, m]));

	let currentId: string | null = targetId;
	while (currentId) {
		const msg = msgMap.get(currentId);
		if (!msg) break;
		messages.unshift(msg);
		currentId = msg.parentId;
	}

	return messages;
}

// ── Message Editing ──────────────────────

export async function updateMessage(storyId: string, messageId: string, content: string) {
	const story = await db.getStory(storyId);
	if (!story) throw new Error('Story not found');
	const msg = story.messages.find((m) => m.id === messageId);
	if (!msg) throw new Error('Message not found');
	msg.content = content;
	msg.editedAt = new Date().toISOString();
	await db.saveStory(story);
	return msg;
}

// ── Timeline Rewind ──────────────────────

export async function rewindTimeline(storyId: string, messageId: string) {
	const story = await db.getStory(storyId);
	if (!story) throw new Error('Story not found');

	const msgMap = new Map(story.messages.map((m) => [m.id, m]));
	const keep = new Set<string>();
	let currentId: string | null = messageId;
	while (currentId) {
		keep.add(currentId);
		const msg = msgMap.get(currentId);
		currentId = msg?.parentId ?? null;
	}
	story.messages = story.messages.filter((m) => keep.has(m.id));
	story.activeBranchId = messageId;

	await db.saveStory(story);
	return story;
}

// ── Cards ────────────────────────────────

export async function getCards(storyId: string): Promise<ContextCard[]> {
	const story = await db.getStory(storyId);
	return story?.cards || [];
}

export async function createCard(
	storyId: string,
	data: {
		type?: ContextCard['type'];
		title?: string;
		fields?: Record<string, string>;
	}
): Promise<ContextCard> {
	const story = await db.getStory(storyId);
	if (!story) throw new Error('Story not found');
	const card: ContextCard = {
		id: uuid(),
		type: data.type || 'world',
		title: data.title?.trim() || 'Untitled Card',
		fields: data.fields || {},
		lastUpdated: new Date().toISOString()
	};
	story.cards = story.cards || [];
	story.cards.push(card);
	await db.saveStory(story);
	return card;
}

export async function updateCard(
	storyId: string,
	cardId: string,
	data: Partial<ContextCard>
): Promise<ContextCard> {
	const story = await db.getStory(storyId);
	if (!story) throw new Error('Story not found');
	const idx = story.cards.findIndex((c) => c.id === cardId);
	if (idx === -1) throw new Error('Card not found');
	story.cards[idx] = {
		...story.cards[idx],
		...data,
		lastUpdated: new Date().toISOString()
	};
	await db.saveStory(story);
	return story.cards[idx];
}

export async function deleteCard(storyId: string, cardId: string) {
	const story = await db.getStory(storyId);
	if (!story) throw new Error('Story not found');
	story.cards = story.cards.filter((c) => c.id !== cardId);
	await db.saveStory(story);
}

// ── Comics ──────────────────────────────

export async function listComics(storyId: string): Promise<Comic[]> {
	return db.listComics(storyId);
}

export async function getComic(id: string): Promise<Comic> {
	const comic = await db.getComic(id);
	if (!comic) throw new Error('Comic not found');
	return comic;
}

export async function createComic(data: {
	storyId: string;
	title?: string;
	artStyle?: string;
}): Promise<Comic> {
	const comic: Comic = {
		id: uuid(),
		storyId: data.storyId,
		title: data.title || 'Untitled Comic',
		artStyle: data.artStyle || '',
		panels: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
	return db.saveComic(comic);
}

export async function updateComic(id: string, data: Partial<Comic>): Promise<Comic> {
	const existing = await db.getComic(id);
	if (!existing) throw new Error('Comic not found');
	const updated = { ...existing, ...data };
	return db.saveComic(updated);
}

export async function deleteComic(id: string): Promise<void> {
	return db.deleteComic(id);
}

export async function addPanel(
	comicId: string,
	data: {
		sceneDescription?: string;
		dialogue?: string;
		prompt?: string;
		imageBase64?: string;
		aspectRatio?: string;
		characterIds?: string[];
	}
): Promise<ComicPanel> {
	const comic = await db.getComic(comicId);
	if (!comic) throw new Error('Comic not found');
	const panel: ComicPanel = {
		id: uuid(),
		sceneDescription: data.sceneDescription || '',
		dialogue: data.dialogue || '',
		prompt: data.prompt || '',
		imageBase64: data.imageBase64 || '',
		aspectRatio: data.aspectRatio || '3:4',
		characterIds: data.characterIds || [],
		order: comic.panels.length,
		createdAt: new Date().toISOString()
	};
	comic.panels.push(panel);
	await db.saveComic(comic);
	return panel;
}

export async function updatePanel(
	comicId: string,
	panelId: string,
	data: Partial<ComicPanel>
): Promise<ComicPanel> {
	const comic = await db.getComic(comicId);
	if (!comic) throw new Error('Comic not found');
	const idx = comic.panels.findIndex((p) => p.id === panelId);
	if (idx === -1) throw new Error('Panel not found');
	comic.panels[idx] = { ...comic.panels[idx], ...data };
	await db.saveComic(comic);
	return comic.panels[idx];
}

export async function deletePanel(comicId: string, panelId: string): Promise<void> {
	const comic = await db.getComic(comicId);
	if (!comic) throw new Error('Comic not found');
	comic.panels = comic.panels.filter((p) => p.id !== panelId);
	await db.saveComic(comic);
}

// ── Characters ─────────────────────────

export async function listCharacters(storyId: string): Promise<Character[]> {
	return db.listCharacters(storyId);
}

export async function saveCharacter(char: Character): Promise<Character> {
	return db.saveCharacter(char);
}

export async function deleteCharacter(id: string): Promise<void> {
	return db.deleteCharacter(id);
}

// ── Config ───────────────────────────────

export async function getConfig() {
	return db.getConfig();
}

export async function updateConfig(data: Partial<db.AppConfig>) {
	return db.saveConfig(data);
}

// ── System Prompt Builder ────────────────

export function buildSystemPrompt(story: {
	settings?: StorySettings;
	cards?: ContextCard[];
}): string {
	const { genre, pacing, tone } = story.settings || {};

	const pacingGuide: Record<string, string> = {
		'slow-burn':
			'Use slow, measured pacing. Focus on emotion, atmosphere, and internal thoughts. Let tension build very gradually.',
		moderate:
			'Use balanced pacing. Mix action with reflection. Move the story forward at a comfortable rhythm.',
		fast: 'Use fast, punchy pacing. Keep scenes short and dynamic. Prioritize action over description.',
		natural:
			'Let the scene dictate the pacing. Match the rhythm to what is happening emotionally and narratively.'
	};

	const pacingInstruction = pacingGuide[pacing || 'natural'] || pacingGuide['natural'];

	let cardContext = '';
	if (story.cards && story.cards.length > 0) {
		const grouped: Record<string, ContextCard[]> = {};
		for (const card of story.cards) {
			if (!grouped[card.type]) grouped[card.type] = [];
			grouped[card.type].push(card);
		}
		cardContext = '\n\n## Story Context\n';
		for (const [type, cards] of Object.entries(grouped)) {
			cardContext += `\n### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`;
			for (const card of cards) {
				cardContext += `**${card.title}**: ${Object.entries(card.fields)
					.map(([k, v]) => `${k}: ${v}`)
					.join(', ')}\n`;
			}
		}
	}

	const genreList = Array.isArray(genre) ? genre.join(', ') : genre || 'general fiction';

	return `You are co-writing a ${genreList} novel with mature themes in a ${tone || 'atmospheric'} style. Write with full literary authenticity. Do not fade to black or use euphemisms unless the director requests it.
STORYTELLING: Write in third-person past tense. Focus on immersive prose. ${pacingInstruction}

${cardContext}`;
}
