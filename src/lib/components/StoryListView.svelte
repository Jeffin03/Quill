<script lang="ts">
	import type { StoryMetadata } from '$lib/services/db';
	import type { AppConfig } from '$lib/services/db';
	import * as api from '$lib/services/api';
	import * as db from '$lib/services/db';
	import StoryCard from './StoryCard.svelte';
	import NewStoryModal from './NewStoryModal.svelte';
	import { connectionStatus } from '$lib/stores';
	import { Feather, FolderOpen, Settings, Plus, Wifi, WifiOff, AlertCircle } from '@lucide/svelte';

	let {
		onopen,
		onnewstory,
		onimport,
		onsettings
	}: {
		onopen: (id: string) => void;
		onnewstory: () => void;
		onimport: () => void;
		onsettings: () => void;
	} = $props();

	let stories = $state<StoryMetadata[]>([]);
	let config = $state<AppConfig | null>(null);
	let editingStory = $state<StoryMetadata | null>(null);

	let llmConfigured = $derived(!!config?.apiEntries?.length);
	let hasOnlineEntry = $derived(
		config?.apiEntries?.some(
			(e: AppConfig['apiEntries'][number]) =>
				e.capabilities?.text && ($connectionStatus[e.id] ?? false)
		) ?? false
	);

	async function load() {
		stories = await api.listStories();
		config = await api.getConfig();
	}

	$effect(() => {
		load();
	});

	function handleEdit(story: StoryMetadata) {
		editingStory = story;
	}

	function handleSaved() {
		editingStory = null;
		load();
	}

	function handleExport(story: StoryMetadata) {
		db.exportStory(story.id);
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this story? This cannot be undone.')) return;
		await api.deleteStory(id);
		stories = stories.filter((s) => s.id !== id);
	}
</script>

{#if editingStory}
	<NewStoryModal
		initialData={editingStory}
		oncreated={() => {}}
		onsaved={handleSaved}
		onclose={() => (editingStory = null)}
	/>
{/if}

<div class="min-h-screen bg-background flex flex-col">
	<header class="sticky top-0 z-10 px-4">
		<div class="flex items-center justify-between py-4 max-w-2xl mx-auto w-full">
			<div class="flex items-center gap-2.5">
				<div
					class="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center"
				>
					<Feather size={15} class="text-primary" />
				</div>
				<div>
					<div class="text-foreground leading-none font-serif text-xl">Quill</div>
					<div class="text-[10px] text-muted-foreground leading-none mt-0.5">
						fanfic co-writing studio
					</div>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={onimport}
					class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors text-xs"
					title="Import story"
				>
					<FolderOpen size={15} />
					<span class="hidden sm:inline">Import</span>
				</button>
				<button
					onclick={onsettings}
					class="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
					title="API settings"
				>
					<Settings size={17} />
				</button>
			</div>
		</div>
	</header>

	<div class="px-4 max-w-2xl mx-auto w-full mb-5">
		<div class="flex items-center gap-3">
			<button
				onclick={onsettings}
				class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all
					{hasOnlineEntry
					? 'text-emerald-400 bg-emerald-400/8 border-emerald-400/20 hover:bg-emerald-400/14'
					: llmConfigured
						? 'text-amber-400 bg-amber-400/8 border-amber-400/20 hover:bg-amber-400/14'
						: 'text-muted-foreground bg-white/4 border-white/8 hover:border-white/14'}"
			>
				{#if hasOnlineEntry}
					<span class="relative flex h-1.5 w-1.5">
						<span
							class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"
						></span>
						<span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
					</span>
					<Wifi size={11} />
					LLM: Online
				{:else if llmConfigured}
					<WifiOff size={11} />
					LLM: Unreachable
				{:else}
					<WifiOff size={11} />
					LLM: Not Configured
				{/if}
			</button>
			{#if !llmConfigured}
				<span class="text-[11px] text-muted-foreground/70 flex items-center gap-1">
					<AlertCircle size={10} /> Configure to enable AI writing
				</span>
			{/if}
		</div>
	</div>

	<main class="flex-1 px-4 pb-24 max-w-2xl mx-auto w-full">
		{#if stories.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div
					class="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-5"
				>
					<Feather size={28} class="text-primary/50" />
				</div>
				<p class="text-foreground mb-1 font-serif text-xl">Your stories await</p>
				<p class="text-sm text-muted-foreground mb-8 max-w-xs">
					Begin a new story and let the words flow. Quill will help you shape every twist and turn.
				</p>
				<button
					onclick={onnewstory}
					class="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground transition-colors"
				>
					<Plus size={16} />
					Start Your First Story
				</button>
			</div>
		{:else}
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xs text-muted-foreground uppercase tracking-wider">
					{stories.length}
					{stories.length === 1 ? 'Story' : 'Stories'}
				</h2>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each stories as story (story.id)}
					<StoryCard
						{story}
						onclick={() => onopen(story.id)}
						onedit={() => handleEdit(story)}
						onexport={() => handleExport(story)}
						ondelete={() => handleDelete(story.id)}
					/>
				{/each}
			</div>
		{/if}
	</main>

	<button
		onclick={onnewstory}
		class="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 w-14 h-14 rounded-2xl bg-primary hover:bg-[#d4a853] text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20"
		aria-label="New story"
	>
		<Plus size={22} />
	</button>
</div>
