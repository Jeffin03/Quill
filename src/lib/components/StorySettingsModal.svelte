<script lang="ts">
	import type { Story, StorySettings } from '$lib/types';
	import { X, SlidersHorizontal, Check, AlertTriangle } from '@lucide/svelte';

	let {
		story,
		onclose,
		onsave
	}: {
		story: Story;
		onclose: () => void;
		onsave: (settings: StorySettings) => void;
	} = $props();

	const GENRES = [
		'romance',
		'dark romance',
		'fantasy',
		'thriller',
		'angst',
		'hurt/comfort',
		'slice of life',
		'action',
		'horror',
		'mystery',
		'general fiction'
	];

	const PACING: { value: string; label: string }[] = [
		{ value: 'slow-burn', label: 'Slow Burn' },
		{ value: 'moderate', label: 'Moderate' },
		{ value: 'fast', label: 'Fast' },
		{ value: 'natural', label: 'Natural' }
	];

	function captureInitial() {
		return {
			genre: [...story.settings.genre],
			pacing: story.settings.pacing,
			tone: story.settings.tone
		};
	}
	const init = captureInitial();

	let genre = $state(init.genre);
	let pacing = $state(init.pacing);
	let tone = $state(init.tone);
	let error = $state<string | null>(null);

	function toggleGenre(g: string) {
		genre = genre.includes(g) ? genre.filter((x) => x !== g) : [...genre, g];
	}

	function submit() {
		error = null;
		const finalGenre = genre.length > 0 ? genre : ['general fiction'];
		try {
			onsave({ genre: finalGenre, pacing, tone: tone.trim() || 'atmospheric' });
		} catch (err) {
			error = (err as Error).message;
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
	<button
		type="button"
		aria-label="Close story settings"
		class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
		onclick={onclose}
	></button>
	<div
		class="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-popover border border-border shadow-2xl flex flex-col overflow-hidden max-h-[92dvh]"
	>
		<div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
			<div class="flex items-center gap-2">
				<div
					class="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center"
				>
					<SlidersHorizontal size={13} class="text-primary" />
				</div>
				<h2 class="text-foreground">Story Settings</h2>
			</div>
			<button
				onclick={onclose}
				class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
			>
				<X size={18} />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
			<div>
				<div class="text-xs text-muted-foreground mb-2">Genre (select all that apply)</div>
				<div class="flex flex-wrap gap-1.5">
					{#each GENRES as g (g)}
						<button
							onclick={() => toggleGenre(g)}
							class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-all capitalize
								{genre.includes(g)
								? 'bg-primary/12 border-primary/35 text-[#d4a853]'
								: 'bg-white/4 border-border text-muted-foreground hover:border-white/14 hover:text-[#b8b4aa]'}"
						>
							{#if genre.includes(g)}
								<Check size={11} />
							{/if}
							{g}
						</button>
					{/each}
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="story-settings-pacing" class="text-xs text-muted-foreground block mb-1.5"
						>Pacing</label
					>
					<select
						id="story-settings-pacing"
						bind:value={pacing}
						class="w-full bg-input-background border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:border-primary/40"
					>
						{#each PACING as p (p.value)}
							<option value={p.value}>{p.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="story-settings-tone" class="text-xs text-muted-foreground block mb-1.5"
						>Tone</label
					>
					<input
						id="story-settings-tone"
						bind:value={tone}
						placeholder="e.g. atmospheric, dramatic…"
						class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
					/>
				</div>
			</div>

			{#if error}
				<div class="flex items-start gap-2.5 p-3 rounded-xl bg-red-400/8 border border-red-400/20">
					<AlertTriangle size={14} class="text-red-400 shrink-0 mt-0.5" />
					<p class="text-xs text-red-400/80 leading-relaxed">{error}</p>
				</div>
			{/if}
		</div>

		<div class="px-5 py-4 border-t border-border flex gap-3 shrink-0">
			<button
				onclick={onclose}
				class="flex-1 py-2.5 rounded-xl bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/8 text-sm transition-colors"
			>
				Cancel
			</button>
			<button
				onclick={submit}
				class="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground text-sm transition-colors"
			>
				Save Changes
			</button>
		</div>
	</div>
</div>
