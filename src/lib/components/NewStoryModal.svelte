<script lang="ts">
	import type { StorySettings } from '$lib/types';
	import * as api from '$lib/services/api';
	import { X, Feather, Check, AlertTriangle } from '@lucide/svelte';

	let {
		initialData,
		oncreated,
		onsaved,
		onclose
	}: {
		initialData?: { id: string; title: string; settings: StorySettings };
		oncreated: (id: string) => void;
		onsaved?: () => void;
		onclose: () => void;
	} = $props();

	function isEditingMode() {
		return !!initialData;
	}
	const isEditing = isEditingMode();

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
			title: initialData?.title ?? '',
			selectedGenres: initialData?.settings.genre ?? [],
			pacing: initialData?.settings.pacing ?? 'natural',
			tone: initialData?.settings.tone ?? 'atmospheric'
		};
	}
	const init = captureInitial();

	let title = $state(init.title);
	let selectedGenres = $state(init.selectedGenres);
	let pacing = $state(init.pacing);
	let tone = $state(init.tone);
	let creating = $state(false);
	let error = $state<string | null>(null);

	function focusInput(node: HTMLInputElement) {
		node.focus();
	}

	function toggleGenre(g: string) {
		selectedGenres = selectedGenres.includes(g)
			? selectedGenres.filter((x) => x !== g)
			: [...selectedGenres, g];
	}

	async function submit() {
		if (!title.trim() || creating) return;
		creating = true;
		error = null;
		try {
			const payload = {
				title: title.trim(),
				genre: selectedGenres.length > 0 ? selectedGenres : ['general fiction'],
				pacing,
				tone: tone.trim() || 'atmospheric'
			};
			if (isEditing && initialData) {
				await api.updateStory(initialData.id, {
					title: payload.title,
					settings: {
						genre: payload.genre,
						pacing: payload.pacing,
						tone: payload.tone
					}
				});
				onsaved?.();
			} else {
				const story = await api.createStory(payload);
				oncreated(story.id);
			}
		} catch (err) {
			error = (err as Error).message;
			creating = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
	<button
		type="button"
		aria-label="Close new story dialog"
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
					<Feather size={13} class="text-primary" />
				</div>
				<h2 class="text-foreground">{isEditing ? 'Edit Story' : 'New Story'}</h2>
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
				<label for="story-title" class="text-sm text-muted-foreground block mb-1.5">Title</label>
				<input
					id="story-title"
					bind:value={title}
					use:focusInput
					placeholder="Give your story a name..."
					class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
				/>
			</div>

			<div>
				<div class="text-sm text-muted-foreground mb-2">Genre</div>
				<div class="flex flex-wrap gap-2">
					{#each GENRES as g (g)}
						<button
							onclick={() => toggleGenre(g)}
							class="flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-all capitalize
								{selectedGenres.includes(g)
								? 'bg-primary/20 border-primary/50 text-[#d4a853]'
								: 'bg-white/4 border-border text-muted-foreground hover:border-white/15 hover:text-foreground'}"
						>
							{#if selectedGenres.includes(g)}
								<Check size={11} />
							{/if}
							{g}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<div class="text-sm text-muted-foreground mb-2">Pacing</div>
				<div class="grid grid-cols-2 gap-2">
					{#each PACING as p (p.value)}
						<button
							onclick={() => (pacing = p.value)}
							class="py-2 px-3 rounded-lg text-sm border transition-all
								{pacing === p.value
								? 'bg-primary/15 border-primary/40 text-[#d4a853]'
								: 'bg-white/4 border-border text-muted-foreground hover:border-white/15 hover:text-foreground'}"
						>
							{p.label}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<label for="story-tone" class="text-sm text-muted-foreground block mb-1.5">
					Tone <span class="text-muted-foreground/60">(optional)</span>
				</label>
				<input
					id="story-tone"
					bind:value={tone}
					placeholder="e.g. atmospheric, tender, gritty..."
					class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
				/>
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
				disabled={!title.trim() || creating}
				class="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground text-sm disabled:opacity-30 transition-colors"
			>
				{creating ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Story'}
			</button>
		</div>
	</div>
</div>
