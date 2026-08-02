<script lang="ts">
	import { formatTime } from '$lib/utils';
	import { Download, Trash2, Pencil } from '@lucide/svelte';

	const GENRE_COLORS: Record<string, string> = {
		romance: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
		'dark romance': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
		fantasy: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
		thriller: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
		angst: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
		'hurt/comfort': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
		'slice of life': 'text-green-400 bg-green-400/10 border-green-400/20',
		action: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
		horror: 'text-red-400 bg-red-400/10 border-red-400/20',
		mystery: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
		'general fiction': 'text-gray-400 bg-gray-400/10 border-gray-400/20'
	};

	function getGenreColor(genre: string) {
		return GENRE_COLORS[genre.toLowerCase()] ?? 'text-[#72708a] bg-white/5 border-white/10';
	}

	let {
		story,
		onclick,
		onedit,
		onexport,
		ondelete
	}: {
		story: {
			title: string;
			settings: { genre: string[]; pacing: string };
			updatedAt: string;
			messageCount: number;
			wordCount: number;
		};
		onclick: () => void;
		onedit: () => void;
		onexport: () => void;
		ondelete: () => void;
	} = $props();
</script>

<div
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick();
		}
	}}
	class="group relative w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-accent transition-all duration-200 overflow-hidden cursor-pointer"
>
	<div
		class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
	></div>

	<div class="flex items-start justify-between gap-2 mb-3">
		<h3 class="text-foreground leading-snug line-clamp-2 pr-1 font-serif text-lg">
			{story.title}
		</h3>
		{#if story.messageCount === 0}
			<span
				class="shrink-0 text-[10px] text-muted-foreground bg-white/5 border border-border px-2 py-0.5 rounded-full mt-0.5"
			>
				Empty
			</span>
		{/if}
	</div>

	<div class="flex flex-wrap gap-1.5 mb-3">
		{#each story.settings.genre.slice(0, 3) as g (g)}
			<span class="text-[10px] px-2 py-0.5 rounded-full border {getGenreColor(g)}">{g}</span>
		{/each}
	</div>

	<div class="flex items-center justify-between text-[11px] text-muted-foreground">
		<span>{story.settings.pacing}</span>
		<div class="flex items-center gap-2">
			{#if story.wordCount > 0}
				<span>{story.wordCount.toLocaleString()} words</span>
			{/if}
			<span>{formatTime(story.updatedAt)}</span>
		</div>
	</div>

	<div
		class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
	>
		<button
			onclick={(e) => {
				e.stopPropagation();
				onedit();
			}}
			class="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-[#d4a853] hover:border-primary/30 transition-colors"
			title="Edit story"
		>
			<Pencil size={12} />
		</button>
		<button
			onclick={(e) => {
				e.stopPropagation();
				onexport();
			}}
			class="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-white/16 transition-colors"
			title="Export story"
		>
			<Download size={12} />
		</button>
		<button
			onclick={(e) => {
				e.stopPropagation();
				ondelete();
			}}
			class="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/25 transition-colors"
			title="Delete story"
		>
			<Trash2 size={12} />
		</button>
	</div>
</div>
