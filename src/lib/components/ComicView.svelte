<script lang="ts">
	import type { Story } from '$lib/types';
	import type { Comic, ComicPanel, Character } from '$lib/services/db';
	import * as api from '$lib/services/api';
	import * as db from '$lib/services/db';
	import * as imageGen from '$lib/services/imageGen';
	import { addToast } from '$lib/stores';
	import { escapeHtml } from '$lib/utils';
	import { X, Plus, Pencil, Trash2, LoaderCircle, Images, ChevronLeft } from '@lucide/svelte';

	let {
		story,
		onclose
	}: {
		story: Story;
		onclose: () => void;
	} = $props();

	let comic = $state<Comic | null>(null);
	let characters = $state<Character[]>([]);
	let generating = $state(false);
	let generatingPanelId = $state<string | null>(null);

	// Panel modal state
	let showPanelModal = $state(false);
	let editingPanel = $state<ComicPanel | null>(null);
	let panelScene = $state('');
	let panelDialogue = $state('');
	let panelPrompt = $state('');
	let panelCharacterIds = $state<string[]>([]);

	// New comic modal
	let showNewComicModal = $state(false);
	let newComicTitle = $state('');

	// Load or create comic
	async function init() {
		const comics = await api.listComics(story.id);
		if (comics.length > 0) {
			comic = await api.getComic(comics[0].id);
		} else {
			showNewComicModal = true;
		}
		characters = await api.listCharacters(story.id);
	}

	$effect(() => {
		init();
	});

	// ── Comic CRUD ───────────────────────

	async function createComic() {
		if (!newComicTitle.trim()) return;
		comic = await api.createComic({ storyId: story.id, title: newComicTitle.trim() });
		showNewComicModal = false;
		newComicTitle = '';
		addToast('Comic created', 'success');
	}

	async function saveComicTitle(e: Event) {
		if (!comic) return;
		const el = e.target as HTMLInputElement;
		const title = el.value.trim() || 'Untitled Comic';
		if (title !== comic.title) {
			comic.title = title;
			await api.updateComic(comic.id, { title });
		}
	}

	// ── Panel CRUD ───────────────────────

	function openAddPanel() {
		editingPanel = null;
		panelScene = '';
		panelDialogue = '';
		panelPrompt = '';
		panelCharacterIds = [];
		showPanelModal = true;
	}

	function openEditPanel(panel: ComicPanel) {
		editingPanel = panel;
		panelScene = panel.sceneDescription;
		panelDialogue = panel.dialogue;
		panelPrompt = panel.prompt;
		panelCharacterIds = [...(panel.characterIds ?? [])];
		showPanelModal = true;
	}

	async function savePanel() {
		if (!comic || !panelScene.trim()) {
			addToast('Scene description is required', 'error');
			return;
		}

		const data = {
			sceneDescription: panelScene.trim(),
			dialogue: panelDialogue.trim(),
			prompt: panelPrompt.trim(),
			characterIds: panelCharacterIds
		};

		if (editingPanel) {
			await api.updatePanel(comic.id, editingPanel.id, data);
		} else {
			await api.addPanel(comic.id, data);
		}

		comic = await api.getComic(comic.id);
		showPanelModal = false;
		addToast(editingPanel ? 'Panel updated' : 'Panel added', 'success');
	}

	async function deletePanel(panelId: string) {
		if (!comic || !confirm('Delete this panel?')) return;
		await api.deletePanel(comic.id, panelId);
		comic = await api.getComic(comic.id);
		addToast('Panel deleted', 'success');
	}

	// ── Image Generation ─────────────────

	async function generatePanelImage(panel: ComicPanel) {
		if (generating || !comic) return;

		generating = true;
		generatingPanelId = panel.id;

		try {
			const config = await db.getConfig();
			const panelChars = characters.filter((c) => (panel.characterIds ?? []).includes(c.id));

			let prompt = panel.prompt || panel.sceneDescription || '';

			if (!panel.prompt) {
				const parts: string[] = [];
				if (config.artStyle) parts.push(`Style: ${config.artStyle}`);
				for (const c of panelChars) {
					if (c.stylePrompt) parts.push(`Character "${c.name}": ${c.stylePrompt}`);
				}
				parts.push(`Scene: ${panel.sceneDescription}`);
				prompt = parts.join('\n');
			}

			const imageBase64 = await imageGen.generateImage({ prompt });
			if (!imageBase64) throw new Error('No image returned from provider');

			await api.updatePanel(comic.id, panel.id, { imageBase64, prompt });
			comic = await api.getComic(comic.id);
			addToast('Panel image generated', 'success');
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				addToast('Image generation failed: ' + (err as Error).message, 'error');
			}
		} finally {
			generating = false;
			generatingPanelId = null;
		}
	}

	function togglePanelCharacter(id: string) {
		panelCharacterIds = panelCharacterIds.includes(id)
			? panelCharacterIds.filter((c) => c !== id)
			: [...panelCharacterIds, id];
	}
</script>

{#if showNewComicModal}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
		<button
			type="button"
			aria-label="Close"
			class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
			onclick={() => onclose()}
		></button>
		<div
			class="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-popover border border-border shadow-2xl flex flex-col overflow-hidden"
		>
			<div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
				<div class="flex items-center gap-2">
					<div
						class="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center"
					>
						<Images size={14} class="text-primary" />
					</div>
					<h2 class="text-foreground">New Comic</h2>
				</div>
				<button
					onclick={() => onclose()}
					class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
				>
					<X size={18} />
				</button>
			</div>
			<div class="px-5 py-4 space-y-3">
				<div>
					<label for="comic-title-input" class="text-xs text-muted-foreground block mb-1.5"
						>Title</label
					>
					<input
						id="comic-title-input"
						bind:value={newComicTitle}
						placeholder="My Comic"
						onkeydown={(e) => {
							if (e.key === 'Enter') createComic();
						}}
						class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
					/>
				</div>
			</div>
			<div class="px-5 py-4 border-t border-border flex gap-3">
				<button
					onclick={() => onclose()}
					class="flex-1 py-2.5 rounded-xl bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/8 text-sm transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={createComic}
					class="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground text-sm transition-colors"
				>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showPanelModal}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
		<button
			type="button"
			aria-label="Close"
			class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
			onclick={() => (showPanelModal = false)}
		></button>
		<div
			class="relative w-full sm:max-w-lg h-[85vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl bg-popover border border-border shadow-2xl flex flex-col overflow-hidden"
		>
			<div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
				<h2 class="text-foreground">{editingPanel ? 'Edit Panel' : 'Add Panel'}</h2>
				<button
					onclick={() => (showPanelModal = false)}
					class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
				>
					<X size={18} />
				</button>
			</div>
			<div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
				<div>
					<label for="panel-scene" class="text-xs text-muted-foreground block mb-1.5"
						>Scene Description *</label
					>
					<textarea
						id="panel-scene"
						bind:value={panelScene}
						placeholder="What happens in this panel..."
						rows={3}
						class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 resize-none"
					></textarea>
				</div>
				<div>
					<label for="panel-dialogue" class="text-xs text-muted-foreground block mb-1.5"
						>Dialogue / Caption</label
					>
					<textarea
						id="panel-dialogue"
						bind:value={panelDialogue}
						placeholder="What the character says..."
						rows={2}
						class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 resize-none"
					></textarea>
				</div>
				<div>
					<label for="panel-prompt" class="text-xs text-muted-foreground block mb-1.5"
						>Image Prompt (optional — auto-built from scene + characters if blank)</label
					>
					<textarea
						id="panel-prompt"
						bind:value={panelPrompt}
						placeholder="Override the auto-generated image prompt..."
						rows={2}
						class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 resize-none"
					></textarea>
				</div>
				{#if characters.length > 0}
					<div>
						<div class="text-xs text-muted-foreground mb-2">Characters in this panel</div>
						<div class="flex flex-wrap gap-1.5">
							{#each characters as c (c.id)}
								<button
									onclick={() => togglePanelCharacter(c.id)}
									class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-all
										{panelCharacterIds.includes(c.id)
										? 'bg-primary/12 border-primary/35 text-[#d4a853]'
										: 'bg-white/4 border-border text-muted-foreground hover:border-white/14'}"
								>
									{c.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}
				{#if editingPanel?.imageBase64}
					<div>
						<div class="text-xs text-muted-foreground mb-2">Current Image</div>
						<img
							src="data:image/png;base64,{editingPanel.imageBase64}"
							alt="Panel preview"
							class="w-full max-h-48 object-contain rounded-xl border border-border"
						/>
					</div>
				{/if}
			</div>
			<div class="px-5 py-4 border-t border-border flex gap-3 shrink-0">
				<button
					onclick={() => (showPanelModal = false)}
					class="flex-1 py-2.5 rounded-xl bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/8 text-sm transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={savePanel}
					class="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground text-sm transition-colors"
				>
					{editingPanel ? 'Save Changes' : 'Add Panel'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Main comic layout -->
<div class="h-screen flex flex-col bg-background overflow-hidden">
	<header class="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border bg-sidebar">
		<button
			onclick={onclose}
			class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
			title="Back to story"
		>
			<ChevronLeft size={17} />
		</button>

		{#if comic}
			<input
				value={comic.title}
				onblur={saveComicTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
				}}
				class="flex-1 min-w-0 bg-transparent border-none text-foreground truncate font-serif text-lg outline-none cursor-text hover:text-[#d4a853] transition-colors"
			/>
			<span class="text-[10px] text-muted-foreground shrink-0">
				{comic.panels.length} panel{comic.panels.length === 1 ? '' : 's'}
			</span>
		{/if}
	</header>

	{#if comic}
		<div class="flex flex-1 min-h-0">
			<!-- Character sidebar -->
			<div
				class="w-56 shrink-0 border-r border-border bg-sidebar flex flex-col overflow-y-auto max-md:hidden"
			>
				<div class="px-3 pt-3 pb-2">
					<div class="text-[10px] text-muted-foreground uppercase tracking-widest">Characters</div>
				</div>
				<div class="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
					{#if characters.length === 0}
						<p class="text-xs text-muted-foreground text-center py-6 px-2 leading-relaxed">
							Create character cards in the Cards tab to use them in panels.
						</p>
					{:else}
						{#each characters as c (c.id)}
							<div class="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
								<div
									class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-primary/15 text-primary border border-primary/30"
								>
									{#if c.referenceImage}
										<img
											src={c.referenceImage}
											alt={c.name}
											class="w-full h-full rounded-full object-cover"
										/>
									{:else}
										{c.name.charAt(0).toUpperCase()}
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-xs text-foreground truncate">{c.name}</div>
									{#if c.stylePrompt}
										<div class="text-[10px] text-muted-foreground truncate leading-snug mt-0.5">
											{c.stylePrompt}
										</div>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Panel grid -->
			<div class="flex-1 overflow-y-auto">
				<div class="flex flex-col items-center gap-8 py-8 px-4 pb-24">
					{#if comic.panels.length === 0}
						<div class="flex flex-col items-center justify-center py-20 text-center">
							<div
								class="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4"
							>
								<Images size={24} class="text-primary/40" />
							</div>
							<p class="text-foreground mb-1 font-serif text-lg">No panels yet</p>
							<p class="text-sm text-muted-foreground mb-6 max-w-xs">
								Add panels to build your comic. Each panel can have a scene, dialogue, and a
								generated image.
							</p>
							<button
								onclick={openAddPanel}
								class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground transition-colors text-sm"
							>
								<Plus size={15} />
								Add First Panel
							</button>
						</div>
					{:else}
						{#each comic.panels as panel, i (panel.id)}
							<div class="w-full max-w-[360px] relative group">
								<!-- Panel image / placeholder -->
								<div
									class="relative rounded-lg overflow-hidden border border-border bg-card shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
									style="aspect-ratio: 3/4;"
								>
									{#if panel.imageBase64}
										<img
											src="data:image/png;base64,{panel.imageBase64}"
											alt="Panel {i + 1}"
											class="w-full h-full object-cover"
										/>
									{:else}
										<div
											class="w-full h-full flex items-center justify-center text-sm text-muted-foreground"
										>
											{#if generatingPanelId === panel.id}
												<div class="flex items-center gap-2">
													<LoaderCircle size={16} class="animate-spin text-primary" />
													Generating...
												</div>
											{:else}
												Click generate to create image
											{/if}
										</div>
									{/if}

									<!-- Speech bubble -->
									{#if panel.dialogue}
										<div class="absolute inset-0 flex flex-col justify-end p-3 pointer-events-none">
											<div
												class="bg-black/75 text-white px-3.5 py-2 rounded-xl text-[13px] leading-relaxed max-w-[85%] pointer-events-auto
													{i % 2 === 0 ? 'self-start rounded-bl-sm' : 'self-end rounded-br-sm'}"
											>
												<!-- eslint-disable-next-line svelte/no-at-html-tags -- escapeHtml prevents XSS -->
												{@html escapeHtml(panel.dialogue)}
											</div>
										</div>
									{/if}

									<!-- Hover actions -->
									<div
										class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<button
											onclick={() => openEditPanel(panel)}
											title="Edit panel"
											class="p-1.5 rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-colors"
										>
											<Pencil size={13} />
										</button>
										<button
											onclick={() => generatePanelImage(panel)}
											disabled={generating}
											title="Generate image"
											class="p-1.5 rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
										>
											{#if generatingPanelId === panel.id}
												<LoaderCircle size={13} class="animate-spin" />
											{:else}
												🎨
											{/if}
										</button>
										<button
											onclick={() => deletePanel(panel.id)}
											title="Delete panel"
											class="p-1.5 rounded-md bg-black/60 backdrop-blur text-white hover:bg-red-400/80 transition-colors"
										>
											<Trash2 size={13} />
										</button>
									</div>
								</div>

								<!-- Panel number -->
								<div class="text-center mt-2">
									<span class="text-[10px] text-muted-foreground">Panel {i + 1}</span>
								</div>
							</div>
						{/each}

						<!-- Add panel button -->
						<button
							onclick={openAddPanel}
							class="w-full max-w-[360px] py-8 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-2 text-sm"
						>
							<Plus size={16} />
							Add Panel
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
