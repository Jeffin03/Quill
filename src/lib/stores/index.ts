/* ══════════════════════════════════════════
   Quill — State Management Stores
   ══════════════════════════════════════════ */

import { writable, derived } from 'svelte/store';
import type { Story, WorkspacePanel } from '$lib/types';
import type { AppConfig } from '$lib/services/db';

// ── Current Story ────────────────────────

export const currentStory = writable<Story | null>(null);

export const storyId = derived(currentStory, ($story) => $story?.id ?? null);

export const cards = derived(currentStory, ($story) => $story?.cards ?? []);

// ── LLM Config ──────────────────────────

export const llmConfig = writable<AppConfig | null>(null);

// ── Panel Visibility ─────────────────────

export const activePanel = writable<WorkspacePanel>('write');

export const panelsVisible = writable({
	tree: true,
	cards: true,
	write: true
});

// ── Streaming State ──────────────────────

export const isStreaming = writable(false);

export const streamContent = writable('');

// ── Toast Queue ──────────────────────────

export interface Toast {
	id: string;
	message: string;
	type: 'info' | 'error' | 'success';
}

export const toasts = writable<Toast[]>([]);

export function addToast(message: string, type: Toast['type'] = 'info') {
	const id = Math.random().toString(36).slice(2);
	const toast: Toast = { id, message, type };
	toasts.update((t) => [...t, toast]);

	setTimeout(() => {
		toasts.update((t) => t.filter((x) => x.id !== id));
	}, 5000);
}

export function removeToast(id: string) {
	toasts.update((t) => t.filter((x) => x.id !== id));
}

// ── Connection Heartbeat ─────────────────

export const connectionStatus = writable<Record<string, boolean>>({});

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatStarted = false;

export function startHeartbeat() {
	if (heartbeatStarted) return;
	heartbeatStarted = true;

	const check = async () => {
		const { getConfig } = await import('$lib/services/db');
		const config = await getConfig();
		const entries = (config.apiEntries ?? []).filter((e) => e.capabilities?.text && e.host);
		if (entries.length === 0) {
			connectionStatus.set({});
			return;
		}

		const results: Record<string, boolean> = {};
		await Promise.allSettled(
			entries.map(async (entry) => {
				try {
					const baseUrl =
						entry.provider === 'lmstudio' || entry.provider === 'ollama'
							? `${entry.host}/v1/models`
							: entry.host;
					const res = await fetch(baseUrl, {
						method: 'GET',
						signal: AbortSignal.timeout(5000)
					});
					results[entry.id] = res.ok;
				} catch {
					results[entry.id] = false;
				}
			})
		);
		connectionStatus.set(results);
	};

	check();
	heartbeatTimer = setInterval(check, 15000);
}

export function stopHeartbeat() {
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
	heartbeatStarted = false;
}
