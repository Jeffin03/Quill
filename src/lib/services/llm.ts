/* ══════════════════════════════════════════
   Quill — LLM Service
   Ported from docs/js/llm.js.
   Any OpenAI-compatible API with streaming,
   failover, and provider-specific routing.
   ══════════════════════════════════════════ */

import type { APIEntry } from '$lib/types';
import { getConfig, type AppConfig } from './db';
import { getContextWindow } from './context';

// ── Entry Resolution ─────────────────────

/**
 * Get the text-capable entry for story generation.
 */
export function getTextEntry(config: AppConfig): APIEntry | undefined {
	const entries = config.apiEntries || [];
	const routing = config.featureRouting || {};

	if (routing.story) {
		const routed = entries.find((e) => e.id === routing.story && e.capabilities?.text);
		if (routed) return routed;
	}

	return entries.find((e) => e.capabilities?.text);
}

/**
 * Get all text-capable entries ordered: routed story entry first,
 * then the rest in their original order. Used for automatic failover.
 */
export function getTextCandidates(config: AppConfig): APIEntry[] {
	const entries = [...(config.apiEntries || [])];
	const routing = config.featureRouting || {};
	const texts = entries.filter((e) => e.capabilities?.text);

	if (routing.story) {
		const idx = texts.findIndex((e) => e.id === routing.story);
		if (idx > 0) {
			const [routed] = texts.splice(idx, 1);
			texts.unshift(routed);
		}
	}

	return texts;
}

/**
 * Get the card-capable entry for card extraction.
 */
export function getCardEntry(config: AppConfig): APIEntry | undefined {
	const entries = config.apiEntries || [];
	const routing = config.featureRouting || {};

	if (routing.cards) {
		const routed = entries.find((e) => e.id === routing.cards && e.capabilities?.text);
		if (routed) return routed;
	}

	return getTextEntry(config);
}

/**
 * Get the prompt-capable entry for prompt generation.
 */
export function getPromptEntry(config: AppConfig): APIEntry | undefined {
	const entries = config.apiEntries || [];
	const routing = config.featureRouting || {};

	if (routing.prompts) {
		const routed = entries.find((e) => e.id === routing.prompts && e.capabilities?.text);
		if (routed) return routed;
	}

	return getTextEntry(config);
}

// ── Provider Config ──────────────────────

export interface EntryConfig {
	baseUrl: string;
	apiKey: string;
}

/**
 * Resolve the connection config for an API entry.
 */
export function getEntryConfig(entry: APIEntry | undefined): EntryConfig | null {
	if (!entry) return null;

	if (entry.provider === 'lmstudio') {
		return {
			baseUrl: (entry.host?.replace(/\/+$/, '') || 'http://localhost:1234') + '/v1',
			apiKey: ''
		};
	}

	if (entry.provider === 'ollama') {
		return {
			baseUrl: (entry.host?.replace(/\/+$/, '') || 'http://localhost:11434') + '/v1',
			apiKey: ''
		};
	}

	if (entry.provider === 'openrouter') {
		return {
			baseUrl: 'https://openrouter.ai/api/v1',
			apiKey: entry.apiKey || ''
		};
	}

	if (entry.provider === 'nim') {
		return {
			baseUrl: 'https://integrate.api.nvidia.com/v1',
			apiKey: entry.apiKey || ''
		};
	}

	return {
		baseUrl: entry.host?.replace(/\/+$/, '') || '',
		apiKey: entry.apiKey || ''
	};
}

// ── Error Formatting ─────────────────────

function truncateDetail(text: string, max = 320): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	return clean.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Turn an OpenAI-compatible error body into something a human (and the toast)
 * can actually read. OpenRouter nests the useful text under error.message and
 * sometimes error.metadata.raw.
 */
function formatApiError(status: number, body: string): string {
	let detail = body;
	try {
		const parsed = JSON.parse(body) as {
			error?: { message?: string; metadata?: { raw?: string } };
			message?: string;
		};
		const message = parsed?.error?.message || parsed?.message;
		if (message) detail = message;
		const raw = parsed?.error?.metadata?.raw;
		if (raw && !detail.includes(raw)) detail += ` — ${raw}`;
	} catch {
		// Body is not JSON; use it as-is.
	}
	return `LLM API error (${status}): ${truncateDetail(detail) || 'Unknown error'}`;
}

function formatStreamError(error: unknown): string {
	if (typeof error === 'string') return `LLM stream error: ${truncateDetail(error)}`;
	if (error && typeof error === 'object') {
		const e = error as { message?: string; metadata?: { raw?: string } };
		let detail = e.message || JSON.stringify(error);
		if (e.metadata?.raw && !detail.includes(e.metadata.raw)) detail += ` — ${e.metadata.raw}`;
		return `LLM stream error: ${truncateDetail(detail)}`;
	}
	return 'LLM stream error: Unknown error';
}

function endpointLabel(entry: APIEntry): string {
	return entry.label || entry.model || entry.provider;
}

// ── Streaming ────────────────────────────

export interface StreamCallbacks {
	onChunk?: (chunk: string) => void;
	onDone?: (fullContent: string) => void;
	onError?: (error: Error) => void;
	onAbort?: () => void;
	onTimeout?: () => void;
}

export interface StreamHandle {
	abort: () => void;
}

/**
 * Internal streaming implementation for a single entry.
 */
async function _streamChat(
	entry: APIEntry,
	messages: { role: string; content: string }[],
	signal: AbortSignal,
	config: AppConfig,
	onChunk?: (chunk: string) => void
): Promise<string> {
	const entryConfig = getEntryConfig(entry);
	if (!entryConfig) throw new Error('Invalid API entry');

	const url = `${entryConfig.baseUrl}/chat/completions`;
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (entryConfig.apiKey) headers['Authorization'] = `Bearer ${entryConfig.apiKey}`;

	const response = await fetch(url, {
		method: 'POST',
		headers,
		signal,
		body: JSON.stringify({
			model: entry.model || config.recentModels?.[0] || 'gpt-3.5-turbo',
			messages,
			max_tokens: config.maxTokens || 2048,
			temperature: config.temperature || 0.85,
			stream: true
		})
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => 'Unknown error');
		throw new Error(formatApiError(response.status, errorText));
	}

	const reader = response.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let fullContent = '';
	let receivedReasoning = false;

	const finish = () => {
		if (!fullContent.trim() && receivedReasoning) {
			throw new Error(
				'Model returned reasoning but no story text — it likely used the entire output budget on hidden reasoning. Increase Max Tokens or choose a non-reasoning model.'
			);
		}
		return fullContent;
	};

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || !trimmed.startsWith('data: ')) continue;

				const data = trimmed.slice(6);
				if (data === '[DONE]') return finish();

				try {
					const parsed = JSON.parse(data) as {
						error?: unknown;
						choices?: Array<{
							delta?: {
								content?: string;
								reasoning?: string;
								reasoning_content?: string;
								reasoning_details?: unknown[];
							};
						}>;
					};
					if (parsed.error) throw new Error(formatStreamError(parsed.error));

					const delta = parsed.choices?.[0]?.delta;
					if (
						delta?.reasoning ||
						delta?.reasoning_content ||
						(delta?.reasoning_details && delta.reasoning_details.length > 0)
					) {
						receivedReasoning = true;
					}

					const content = delta?.content || '';
					if (content) {
						fullContent += content;
						onChunk?.(content);
					}
				} catch (err) {
					if (err instanceof SyntaxError) continue;
					throw err;
				}
			}
		}
	} finally {
		reader?.releaseLock();
	}

	return finish();
}

export interface StreamOptions {
	/** Skip failover entries that cannot fit the already-built payload. */
	minimumContextWindow?: number;
}

/**
 * Stream a chat response with automatic failover across candidates.
 */
export function streamChat(
	messages: { role: string; content: string }[],
	callbacks: StreamCallbacks,
	options: StreamOptions = {}
): StreamHandle {
	const controller = new AbortController();
	const candidates: APIEntry[] = [];
	const failures: { entry: APIEntry; error: Error }[] = [];
	let currentIdx = 0;
	let currentTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let emittedAnyContent = false;

	const reportAllFailed = () => {
		for (const failure of failures) {
			console.warn(`[LLM] ${endpointLabel(failure.entry)} failed: ${failure.error.message}`);
		}
		if (failures.length === 0) {
			callbacks.onError?.(new Error('All API endpoints failed'));
			return;
		}
		if (failures.length === 1) {
			callbacks.onError?.(failures[0].error);
			return;
		}
		const codes = failures.map((f) => {
			const match = f.error.message.match(/\((\d{3})\)/);
			return match?.[1] ?? 'error';
		});
		const last = failures[failures.length - 1].error.message;
		callbacks.onError?.(
			new Error(`All ${failures.length} text endpoints failed (${codes.join(', ')}). Last: ${last}`)
		);
	};

	const tryNext = async () => {
		if (controller.signal.aborted) {
			callbacks.onAbort?.();
			return;
		}
		if (currentIdx >= candidates.length) {
			reportAllFailed();
			return;
		}

		const entry = candidates[currentIdx];
		let timedOut = false;
		const resetTimeout = () => {
			if (currentTimeoutId) clearTimeout(currentTimeoutId);
			currentTimeoutId = setTimeout(() => {
				timedOut = true;
				controller.abort();
			}, 90_000);
		};
		resetTimeout();

		const wrappedOnChunk = (chunk: string) => {
			if (chunk) emittedAnyContent = true;
			resetTimeout();
			callbacks.onChunk?.(chunk);
		};

		try {
			const config = await getConfig();
			const fullContent = await _streamChat(
				entry,
				messages,
				controller.signal,
				config,
				wrappedOnChunk
			);
			if (currentTimeoutId) clearTimeout(currentTimeoutId);
			callbacks.onDone?.(fullContent);
		} catch (err: unknown) {
			if (currentTimeoutId) clearTimeout(currentTimeoutId);
			if (err instanceof Error && err.name !== 'AbortError') {
				if (emittedAnyContent) {
					// Restarting after partial prose would duplicate it in the UI.
					console.warn(`[LLM] ${endpointLabel(entry)} failed mid-stream: ${err.message}`);
					callbacks.onError?.(err);
					return;
				}
				failures.push({ entry, error: err });
				currentIdx++;
				tryNext();
			} else if (timedOut) {
				callbacks.onTimeout?.();
			} else {
				callbacks.onAbort?.();
			}
		}
	};

	(async () => {
		const config = await getConfig();
		const all = getTextCandidates(config);
		const fitting = options.minimumContextWindow
			? all.filter((entry) => getContextWindow(entry) >= options.minimumContextWindow!)
			: all;
		// The primary entry should always fit. If filtering somehow removes every
		// candidate, keep the original order and let the normal error path report it.
		candidates.push(...(fitting.length > 0 ? fitting : all));

		if (candidates.length === 0) {
			callbacks.onError?.(
				new Error('No text-capable API configured. Add one in Settings → API Manager.')
			);
			return;
		}
		tryNext();
	})();

	return { abort: () => controller.abort() };
}

/**
 * Stream a chat response with a specific entry (no failover).
 */
export function streamChatWithEntry(
	entry: APIEntry,
	messages: { role: string; content: string }[],
	callbacks: StreamCallbacks
): StreamHandle {
	const controller = new AbortController();
	let timedOut = false;
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const resetTimeout = () => {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			timedOut = true;
			controller.abort();
		}, 90_000);
	};
	resetTimeout();

	const wrappedOnChunk = (chunk: string) => {
		resetTimeout();
		callbacks.onChunk?.(chunk);
	};

	(async () => {
		try {
			const config = await getConfig();
			const fullContent = await _streamChat(
				entry,
				messages,
				controller.signal,
				config,
				wrappedOnChunk
			);
			callbacks.onDone?.(fullContent);
		} catch (err: unknown) {
			if (err instanceof Error && err.name !== 'AbortError') {
				callbacks.onError?.(err);
			} else if (timedOut) {
				callbacks.onTimeout?.();
			} else {
				callbacks.onAbort?.();
			}
		} finally {
			clearTimeout(timeoutId);
		}
	})();

	return { abort: () => controller.abort() };
}

// ── Non-Streaming ────────────────────────

export interface ChatOptions {
	model?: string;
	maxTokens?: number;
	temperature?: number;
	responseFormat?: 'json';
	reasoning?: {
		effort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'none';
		max_tokens?: number;
		exclude?: boolean;
		enabled?: boolean;
	};
}

/**
 * Internal non-streaming chat implementation.
 */
async function _chat(
	entry: APIEntry,
	messages: { role: string; content: string }[],
	options: ChatOptions = {}
): Promise<string> {
	const entryConfig = getEntryConfig(entry);
	if (!entryConfig) throw new Error('Invalid API entry');

	const config = await getConfig();
	const url = `${entryConfig.baseUrl}/chat/completions`;
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (entryConfig.apiKey) headers['Authorization'] = `Bearer ${entryConfig.apiKey}`;

	const body: Record<string, unknown> = {
		model: entry.model || options.model || config.recentModels?.[0] || 'gpt-3.5-turbo',
		messages,
		max_tokens: options.maxTokens || config.maxTokens || 2048,
		temperature: options.temperature ?? config.temperature ?? 0.85,
		stream: false
	};

	if (options.responseFormat === 'json') {
		body.response_format = { type: 'json_object' };
	}

	// OpenRouter supports a unified reasoning control. Keeping card/recap
	// extraction at low effort leaves room for the JSON answer instead of
	// spending the whole output budget on hidden reasoning tokens.
	if (options.reasoning && entry.provider === 'openrouter') {
		body.reasoning = options.reasoning;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers,
			signal: controller.signal,
			body: JSON.stringify(body)
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			throw new Error(formatApiError(response.status, errorText));
		}

		const data = await response.json();
		if (data.error) throw new Error(formatStreamError(data.error));
		return data.choices?.[0]?.message?.content || '';
	} catch (err) {
		clearTimeout(timeoutId);
		throw err;
	}
}

/**
 * Non-streaming chat completion (for card generation, etc.).
 */
export async function chat(
	messages: { role: string; content: string }[],
	options: ChatOptions = {}
): Promise<string> {
	const config = await getConfig();
	const entry = getTextEntry(config);
	if (!entry) throw new Error('No text-capable API configured. Add one in Settings → API Manager.');
	return _chat(entry, messages, options);
}

/**
 * Non-streaming chat completion with a specific entry.
 */
export async function chatWithEntry(
	entry: APIEntry,
	messages: { role: string; content: string }[],
	options: ChatOptions = {}
): Promise<string> {
	return _chat(entry, messages, options);
}
