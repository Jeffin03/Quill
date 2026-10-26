/* ══════════════════════════════════════════
   Quill — Context Budget
   Builds a request that fits the active
   model's window and keeps a rolling recap
   for history that no longer fits.
   ══════════════════════════════════════════ */

import type { APIEntry, Message, Story } from '$lib/types';
import { buildSystemPrompt } from './api';

export interface LLMMessage {
	role: string;
	content: string;
}

export interface BuiltContext {
	messages: LLMMessage[];
	historyMessages: LLMMessage[];
	systemContent: string;
	recap: Story['recap'] | null;
	/** Stored recap plus any deterministic fallback, without the system prompt. */
	memoryText: string;
	droppedMessages: Message[];
	contextWindow: number;
	inputBudget: number;
	estimatedInputTokens: number;
}

const CLOUD_FALLBACK_WINDOW = 16_384;
const LOCAL_FALLBACK_WINDOW = 8_192;
const SAFETY_TOKENS = 512;
const MIN_INPUT_BUDGET = 512;
const MESSAGE_OVERHEAD = 6;
const RECAP_LABEL = '## Story so far';
const RECAP_MAX_CHARS = 1_800;
const FALLBACK_RECAP_MAX_CHARS = 2_100;

const LOCAL_PROVIDERS = new Set<APIEntry['provider']>(['lmstudio', 'ollama', 'custom']);

/**
 * Rough token estimate. Deliberately conservative: 3.5 chars/token
 * over-estimates the token count for English prose, leaving room for
 * tokenizer drift and non-Latin text.
 */
export function estimateTokens(text: string): number {
	if (!text) return 0;
	return Math.ceil(text.length / 3.5) + 4;
}

/**
 * Context window for an entry. New entries get this from model discovery;
 * older entries fall back to a safe value until they are re-saved.
 */
export function getContextWindow(entry?: APIEntry): number {
	if (entry?.contextLength && entry.contextLength > 0) return entry.contextLength;
	if (entry && LOCAL_PROVIDERS.has(entry.provider)) return LOCAL_FALLBACK_WINDOW;
	return CLOUD_FALLBACK_WINDOW;
}

function clip(text: string, maxChars: number): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= maxChars) return clean;
	return clean.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}

function compressScene(text: string): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [];
	if (sentences.length <= 2) return clip(clean, 260);
	const first = sentences[0] ?? clean;
	const last = sentences[sentences.length - 1] ?? clean;
	return `${clip(first, 170)} … ${clip(last, 110)}`;
}

/**
 * Deterministic fallback used when the LLM recap is missing or stale.
 * It is not a full summary, but it preserves the shape of the dropped turns.
 */
function summarizeMessages(messages: Message[]): string {
	const lines: string[] = [];
	for (const m of messages) {
		const text = m.content.replace(/\s+/g, ' ').trim();
		if (!text) continue;
		lines.push(
			m.role === 'user' ? `- Direction: ${clip(text, 220)}` : `- Scene: ${compressScene(text)}`
		);
	}

	let out = lines.join('\n');
	if (out.length > FALLBACK_RECAP_MAX_CHARS) {
		const head = Math.floor(FALLBACK_RECAP_MAX_CHARS * 0.65);
		const tail = FALLBACK_RECAP_MAX_CHARS - head - 2;
		out = out.slice(0, head).trimEnd() + '…\n' + out.slice(-tail).trimStart();
	}
	return out;
}

function validRecap(recap: Story['recap'], history: Message[]): Story['recap'] | null {
	if (!recap?.text?.trim() || !recap.throughMessageId) return null;
	return history.some((m) => m.id === recap.throughMessageId) ? recap : null;
}

function buildSystemContent(base: string, recapText: string, fallbackText: string): string {
	let content = base;
	if (recapText) content += `\n\n${RECAP_LABEL}\n${recapText}`;
	if (fallbackText) {
		content += `\n\n${RECAP_LABEL}${recapText ? ' (continued)' : ''}\n${fallbackText}`;
	}
	return content;
}

/**
 * Build the final message list for a generation request.
 *
 * The budget is based on the supplied context window. Story generation passes
 * the active entry's window; failover entries that cannot fit the resulting
 * payload are skipped by `streamChat`.
 */
export function buildRequestContext(opts: {
	story: Pick<Story, 'settings' | 'cards' | 'recap'>;
	history: Message[];
	contextWindow?: number;
	maxTokens?: number;
}): BuiltContext {
	const contextWindow = Math.max(
		2_048,
		opts.contextWindow && opts.contextWindow > 0 ? opts.contextWindow : CLOUD_FALLBACK_WINDOW
	);
	const outputReserve = Math.max(256, opts.maxTokens || 2048);
	const inputBudget = Math.max(MIN_INPUT_BUDGET, contextWindow - outputReserve - SAFETY_TOKENS);

	const baseSystem = buildSystemPrompt(opts.story);
	const recap = validRecap(opts.story.recap, opts.history);
	let recapText = clip(recap?.text ?? '', RECAP_MAX_CHARS);

	let systemContent = buildSystemContent(baseSystem, recapText, '');
	let systemTokens = estimateTokens(systemContent);

	// If the system prompt + recap already eats the budget, shrink the recap
	// before sacrificing recent dialogue.
	if (systemTokens + 512 > inputBudget && recapText) {
		const recapBudget = Math.max(0, Math.floor(inputBudget * 0.18));
		recapText = clip(recapText, Math.max(0, Math.floor(recapBudget * 3.5)));
		systemContent = buildSystemContent(baseSystem, recapText, '');
		systemTokens = estimateTokens(systemContent);
	}

	// Reserve space for the deterministic "continued" recap when there is no
	// stored recap yet, or when the stored recap does not cover the dropped gap.
	const fallbackReserve = recap ? 300 : 800;
	let selectionBudget = inputBudget - systemTokens - fallbackReserve;
	if (selectionBudget < 512) selectionBudget = Math.max(256, inputBudget - systemTokens);

	const selected: Message[] = [];
	let selectedTokens = 0;
	for (let i = opts.history.length - 1; i >= 0; i--) {
		const msg = opts.history[i];
		const cost = estimateTokens(msg.content) + MESSAGE_OVERHEAD;
		if (selected.length === 0 || selectedTokens + cost <= selectionBudget) {
			selected.unshift(msg);
			selectedTokens += cost;
		} else {
			break;
		}
	}

	const firstKeptIndex = opts.history.length - selected.length;
	const recapIndex = recap ? opts.history.findIndex((m) => m.id === recap.throughMessageId) : -1;

	let uncovered: Message[] = [];
	if (recapIndex === -1) {
		uncovered = opts.history.slice(0, firstKeptIndex);
	} else if (firstKeptIndex > recapIndex + 1) {
		uncovered = opts.history.slice(recapIndex + 1, firstKeptIndex);
	}

	let fallbackText = uncovered.length > 0 ? summarizeMessages(uncovered) : '';
	systemContent = buildSystemContent(baseSystem, recapText, fallbackText);

	// Fallback text is cheap and bounded, but trim it if the model has a very
	// small window. Then drop the oldest kept turns only as a last resort.
	if (estimateTokens(systemContent) + selectedTokens > inputBudget) {
		const over = estimateTokens(systemContent) + selectedTokens - inputBudget;
		if (fallbackText && over > 0) {
			const allowedTokens = Math.max(0, estimateTokens(fallbackText) - over - 8);
			fallbackText = clip(fallbackText, Math.max(0, Math.floor(allowedTokens * 3.5)));
			systemContent = buildSystemContent(baseSystem, recapText, fallbackText);
		}
		while (estimateTokens(systemContent) + selectedTokens > inputBudget && selected.length > 1) {
			const removed = selected.shift();
			if (!removed) break;
			selectedTokens -= estimateTokens(removed.content) + MESSAGE_OVERHEAD;
		}
	}

	const droppedMessages = opts.history.slice(0, opts.history.length - selected.length);
	const historyMessages = selected.map((m) => ({ role: m.role, content: m.content }));
	const estimatedInputTokens = estimateTokens(systemContent) + selectedTokens;
	const memoryText = [recapText, fallbackText].filter(Boolean).join('\n\n');

	return {
		messages: [{ role: 'system', content: systemContent }, ...historyMessages],
		historyMessages,
		systemContent,
		recap,
		memoryText,
		droppedMessages,
		contextWindow,
		inputBudget,
		estimatedInputTokens
	};
}
