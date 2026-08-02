/* ══════════════════════════════════════════
   Quill — Card Engine
   Ported from docs/js/cardEngine.js.
   Handles parsing card updates from LLM
   responses and auto-generation from premise.
   ══════════════════════════════════════════ */

import type { ContextCard } from '$lib/types';
import { uuid } from '$lib/utils';
import * as llm from './llm';

const CARD_BLOCK_REGEX =
	/\[\[\[QUILL_CARDS_START\]\]\]\s*([\s\S]*?)\s*(?:\[\[\[QUILL_CARDS_END\]\]\]|$)/;

export interface CardUpdate {
	action: 'create' | 'update' | 'delete';
	type?: ContextCard['type'];
	id?: string;
	title?: string;
	fields?: Record<string, string>;
}

/**
 * Parse context card update instructions from the LLM response.
 * Returns an array of card operations (create/update/delete).
 */
export function parseCardUpdates(rawResponse: string): CardUpdate[] {
	const match = rawResponse.match(CARD_BLOCK_REGEX);
	if (!match) return [];

	const jsonStr = match[1].trim();

	try {
		return JSON.parse(jsonStr);
	} catch (e) {
		console.warn('[CardEngine] JSON parse failed, attempting repair...', (e as Error).message);
		try {
			const repaired = repairJson(jsonStr);
			return JSON.parse(repaired);
		} catch (e2) {
			console.error('[CardEngine] Failed to repair JSON:', (e2 as Error).message);
			return [];
		}
	}
}

/**
 * Strip the card block from the response, returning prose only.
 */
export function stripCardBlock(rawResponse: string): string {
	return rawResponse.replace(CARD_BLOCK_REGEX, '').trim();
}

/**
 * Apply card update operations to the existing cards array.
 * Returns a new array with updates applied.
 */
export function applyCardUpdates(
	existingCards: ContextCard[],
	updates: CardUpdate[]
): ContextCard[] {
	if (!updates || updates.length === 0) return existingCards;

	const cards = existingCards.map((c) => ({ ...c }));

	for (const update of updates) {
		switch (update.action) {
			case 'create': {
				cards.push({
					id: uuid(),
					type: update.type || 'world',
					title: update.title?.trim() || 'Untitled Card',
					fields: update.fields || {},
					lastUpdated: new Date().toISOString()
				});
				break;
			}
			case 'update': {
				const idx = cards.findIndex((c) => c.title === update.title || c.id === update.id);
				if (idx !== -1) {
					cards[idx] = {
						...cards[idx],
						fields: { ...cards[idx].fields, ...(update.fields || {}) },
						lastUpdated: new Date().toISOString()
					};
				}
				break;
			}
			case 'delete': {
				const idx = cards.findIndex((c) => c.title === update.title || c.id === update.id);
				if (idx !== -1) cards.splice(idx, 1);
				break;
			}
			default:
				console.warn('[CardEngine] Unknown card action:', (update as CardUpdate).action);
		}
	}

	return cards;
}

/**
 * Auto-generate cards from a premise string using the LLM.
 */
export async function generateCardsFromPremise(
	existingCards: ContextCard[],
	premise: string
): Promise<ContextCard[]> {
	const systemPrompt =
		'You are a JSON-only generator. Given a story premise, output a JSON object with a "cards" key containing an array of context cards. ' +
		'Your entire response must be valid JSON and nothing else. Example: ' +
		'{"cards":[{"action":"create","type":"character","title":"Eren","fields":{"name":"Eren","age":"15","appearance":"brown hair","personality":"determined","role":"protagonist","status":"active"}}]}';

	const messages = [
		{
			role: 'system',
			content: systemPrompt
		},
		{
			role: 'user',
			content:
				'Output context cards for the following story premise. ' +
				'Rules by type: character (named individuals), relationship (connections between characters), world (settings/factions/locations), plot (events/conflicts/threads), arc (character growth/themes). ' +
				'Each card: action (create), type, title (short name, 1-4 words), fields. ' +
				'Generate 3-8 cards covering at least 3 different types.\n\nPremise:\n' +
				premise
		}
	];

	let rawJson: string;
	try {
		rawJson = await llm.chat(messages, {
			temperature: 0,
			maxTokens: 4096,
			responseFormat: 'json'
		});
	} catch (err) {
		if (
			(err as Error).message?.includes('400') ||
			(err as Error).message?.includes('response_format')
		) {
			console.debug('[CardEngine] JSON mode not supported, retrying without it');
			try {
				rawJson = await llm.chat(messages, {
					temperature: 0,
					maxTokens: 4096
				});
			} catch (err2) {
				console.error('[CardEngine] Auto generation failed:', err2);
				throw err2;
			}
		} else {
			console.error('[CardEngine] Auto generation failed:', err);
			throw err;
		}
	}

	// Strip markdown fences
	rawJson = rawJson
		.replace(/```json\n?/gi, '')
		.replace(/```\n?/gi, '')
		.trim();

	// If the response isn't pure JSON, try to extract a JSON object { }
	if (!rawJson.startsWith('{')) {
		const objStart = rawJson.indexOf('{');
		const objEnd = rawJson.lastIndexOf('}');
		if (objStart !== -1 && objEnd > objStart) {
			rawJson = rawJson.substring(objStart, objEnd + 1);
		}
	}

	let parsed: { cards?: CardUpdate[] } | CardUpdate[];
	try {
		parsed = JSON.parse(rawJson);
	} catch (e) {
		console.debug('[CardEngine] Initial parse failed, attempting repair:', (e as Error).message);
		const repaired = repairJson(rawJson);
		try {
			parsed = JSON.parse(repaired);
			console.debug('[CardEngine] Repair succeeded (likely truncated response)');
		} catch (e2) {
			console.error('[CardEngine] Deep repair failed:', (e2 as Error).message);
			console.error('[CardEngine] Raw:', rawJson.slice(0, 400));
			console.error('[CardEngine] Repaired:', repaired.slice(0, 500));
			throw new Error('AI response was not JSON. The model may not support structured output.', {
				cause: e2
			});
		}
	}

	const cards = Array.isArray(parsed) ? parsed : parsed?.cards || [];
	if (!Array.isArray(cards)) {
		throw new Error('AI response did not contain a cards array.');
	}
	return applyCardUpdates(existingCards, cards);
}

/**
 * Robust JSON repair for LLM-generated data.
 */
export function repairJson(str: string): string {
	let s = str.trim();

	// 0. Strip trailing commas
	s = s.replace(/,\s*([}\]])/g, '$1');

	// 1. Handle JS object shorthand: {name, age, role} -> {"name":"","age":"","role":""}
	s = s.replace(/\{\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*\}/g, (match, inner) => {
		const keys = inner
			.split(',')
			.map((k: string) => k.trim())
			.filter(Boolean);
		if (keys.length === 0) return match;
		return '{' + keys.map((k: string) => `"${k}":""`).join(',') + '}';
	});

	// 2. Fix unquoted keys
	s = s.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

	// 3. Fix single-quoted values
	s = s.replace(/:\s*'([^']*)'/g, ': "$1"');

	// 4. Fix bare unquoted string values
	s = s.replace(
		/(":\s*)([a-zA-Z_][a-zA-Z0-9_ .!?'-]*[a-zA-Z0-9_.!?'-])(?=\s*[,}\]])/g,
		(match, prefix, value) => {
			if (/^(true|false|null|\d+\.?\d*)$/.test(value)) return match;
			return prefix + '"' + value + '"';
		}
	);

	// 5. Insert missing commas between adjacent values
	s = s.replace(/"\s+"/g, '","');
	s = s.replace(/}\s*"/g, '},"');
	s = s.replace(/]\s*"/g, '],"');
	s = s.replace(/}\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '},"$1":');

	// 6. Remove trailing commas again
	s = s.replace(/,\s*([}\]])/g, '$1');

	// 7. Close unclosed strings
	const quoteCount = (s.match(/"/g) || []).length;
	if (quoteCount % 2 !== 0) s += '"';

	// 8. Walk the string to count structural braces/brackets
	let inString = false;
	let structOpenBraces = 0;
	let structCloseBraces = 0;
	let structOpenBrackets = 0;
	let structCloseBrackets = 0;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (ch === '\\') {
			i++;
			continue;
		}
		if (ch === '"') inString = !inString;
		if (inString) continue;
		if (ch === '{') structOpenBraces++;
		if (ch === '}') structCloseBraces++;
		if (ch === '[') structOpenBrackets++;
		if (ch === ']') structCloseBrackets++;
	}
	for (let i = 0; i < structOpenBraces - structCloseBraces; i++) s += '}';
	for (let i = 0; i < structOpenBrackets - structCloseBrackets; i++) s += ']';

	return s;
}
