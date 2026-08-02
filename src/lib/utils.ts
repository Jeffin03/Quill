/* ══════════════════════════════════════════
   Quill — Utility Functions
   ══════════════════════════════════════════ */

import type { Component } from 'svelte';
import type { ContextCard } from './types';
import { User, Heart, BookOpen, Globe, Ruler } from '@lucide/svelte';

/**
 * Generate a simple UUID v4.
 */
export function uuid(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

/**
 * Format a timestamp for display.
 */
export function formatTime(isoString: string): string {
	if (!isoString) return '';
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return 'just now';
	if (diffMins < 60) return `${diffMins}m ago`;

	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
	});
}

/**
 * Format a timestamp as time only (HH:MM).
 */
export function formatTimeShort(isoString: string): string {
	if (!isoString) return '';
	return new Date(isoString).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
}

/**
 * Convert basic markdown-like text to HTML for prose display.
 * Handles: paragraphs, bold, italic, line breaks, blockquotes.
 */
export function proseToHtml(text: string): string {
	if (!text) return '';

	const paragraphs = text.split(/\n\n+/);

	return paragraphs
		.map((p) => {
			let html = p.trim();
			if (!html) return '';

			if (html.startsWith('>')) {
				const quoteContent = html.replace(/^>\s*/gm, '').split('\n').map(escapeHtml).join('<br>');
				return `<blockquote>${quoteContent}</blockquote>`;
			}

			html = escapeHtml(html);
			html = html
				.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/\*(.+?)\*/g, '<em>$1</em>')
				.replace(/_(.+?)_/g, '<em>$1</em>');

			html = html.replace(/\n/g, '<br>');

			return `<p>${html}</p>`;
		})
		.filter(Boolean)
		.join('\n');
}

/**
 * Escape HTML to prevent XSS.
 */
export function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};
	return text.replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Debounce a function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout>;

	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number = 50): string {
	if (!text || text.length <= maxLength) return text;
	return text.substring(0, maxLength).trimEnd() + '…';
}

export type CardTypeConfig = {
	label: string;
	icon: Component;
	color: string;
	bg: string;
	border: string;
	dot: string;
};

export const TYPE_CONFIG: Record<ContextCard['type'], CardTypeConfig> = {
	character: {
		label: 'Character',
		icon: User,
		color: 'text-[#7aa2f7]',
		bg: 'bg-[#7aa2f7]/8',
		border: 'border-[#7aa2f7]/22',
		dot: '#7aa2f7'
	},
	relationship: {
		label: 'Relationship',
		icon: Heart,
		color: 'text-[#f7768e]',
		bg: 'bg-[#f7768e]/8',
		border: 'border-[#f7768e]/22',
		dot: '#f7768e'
	},
	plot: {
		label: 'Plot Thread',
		icon: BookOpen,
		color: 'text-[#9ece6a]',
		bg: 'bg-[#9ece6a]/8',
		border: 'border-[#9ece6a]/22',
		dot: '#9ece6a'
	},
	world: {
		label: 'World & Setting',
		icon: Globe,
		color: 'text-[#e0af68]',
		bg: 'bg-[#e0af68]/8',
		border: 'border-[#e0af68]/22',
		dot: '#e0af68'
	},
	arc: {
		label: 'Story Arc',
		icon: Ruler,
		color: 'text-[#bb9af7]',
		bg: 'bg-[#bb9af7]/8',
		border: 'border-[#bb9af7]/22',
		dot: '#bb9af7'
	}
};

export const FILTER_ORDER: Array<ContextCard['type'] | 'all'> = [
	'all',
	'character',
	'relationship',
	'plot',
	'world',
	'arc'
];
