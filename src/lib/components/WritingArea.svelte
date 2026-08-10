<script lang="ts">
	import type { Message } from '$lib/types';
	import { proseToHtml } from '$lib/utils';
	import { tick } from 'svelte';
	import { Feather, Pencil, Trash2, GitFork, ImagePlus, LoaderCircle, X } from '@lucide/svelte';

	let {
		messages,
		generatingText,
		isGenerating,
		ondelete,
		onedit,
		onbranch,
		onvisualize,
		onremovevisualization,
		visualizingId
	}: {
		messages: Message[];
		generatingText: string;
		isGenerating: boolean;
		ondelete: (message: Message) => void;
		onedit: (messageId: string, content: string) => void;
		onbranch: (message: Message) => void;
		onvisualize: (message: Message) => void;
		onremovevisualization: (message: Message) => void;
		visualizingId: string | null;
	} = $props();

	let editingId = $state<string | null>(null);
	let editValue = $state('');
	let scrollEl = $state<HTMLDivElement | null>(null);
	let nearBottom = $state(true);

	function isNearBottom(el: HTMLElement, threshold = 150): boolean {
		return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
	}

	function onScroll() {
		if (scrollEl) nearBottom = isNearBottom(scrollEl);
	}

	function scrollToBottom(smooth = false) {
		if (!scrollEl) return;
		scrollEl.scrollTo({
			top: scrollEl.scrollHeight,
			behavior: smooth ? 'smooth' : 'instant'
		});
	}

	// When generation starts, force scroll to bottom
	let prevGenerating = $state(false);
	$effect(() => {
		if (isGenerating && !prevGenerating) {
			nearBottom = true;
			tick().then(() => scrollToBottom());
		}
		prevGenerating = isGenerating;
	});

	// During streaming, auto-scroll if near bottom
	$effect(() => {
		if (isGenerating && generatingText && nearBottom) {
			tick().then(() => scrollToBottom());
		}
	});

	// When new messages arrive, scroll to bottom
	let prevMsgLen = $state(0);
	$effect(() => {
		if (messages.length > prevMsgLen && nearBottom) {
			tick().then(() => scrollToBottom());
		}
		prevMsgLen = messages.length;
	});

	function startEdit(message: Message) {
		editingId = message.id;
		editValue = message.content;
	}

	function saveEdit() {
		if (editingId) onedit(editingId, editValue);
		editingId = null;
	}
</script>

{#if messages.length === 0 && !isGenerating}
	<div class="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
		<div
			class="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4"
		>
			<Feather size={22} class="text-primary/40" />
		</div>
		<p class="text-foreground mb-2 font-serif text-lg">The page is yours</p>
		<p class="text-sm text-muted-foreground max-w-xs leading-relaxed">
			Write a direction below to begin your story. Tell the AI what should happen — a scene, a
			character entrance, a turning point.
		</p>
	</div>
{:else}
	<div class="flex-1 overflow-y-auto scroll-smooth-touch" bind:this={scrollEl} onscroll={onScroll}>
		<div class="max-w-[680px] mx-auto px-5 pt-8 pb-4 space-y-1">
			{#each messages as message, idx (message.id)}
				{#if message.role === 'user'}
					<div class="my-6 flex items-start gap-3 px-1">
						<div class="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0 mt-[7px]"></div>
						<p class="text-sm text-muted-foreground italic leading-relaxed">
							You directed: <span class="text-[#9992a6]">{message.content}</span>
						</p>
					</div>
				{:else if editingId === message.id}
					<div class="segment-enter">
						<textarea
							bind:value={editValue}
							class="w-full bg-input-background border border-primary/30 rounded-xl text-foreground p-4 resize-none outline-none focus:border-primary/55 transition-colors leading-relaxed font-serif text-lg"
							style="min-height: 120px; line-height: 1.95"></textarea>
						<div class="flex gap-2 mt-2">
							<button
								onclick={saveEdit}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-[#d4a853] hover:bg-primary/25 transition-colors text-xs"
							>
								Save
							</button>
							<button
								onclick={() => (editingId = null)}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-border text-muted-foreground hover:text-foreground transition-colors text-xs"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div
						class="group relative {idx === messages.length - 1 && !isGenerating
							? 'segment-enter'
							: ''}"
					>
						<div class="manuscript text-foreground">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- proseToHtml escapes all input -->
							{@html proseToHtml(message.content)}
						</div>

						{#if message.visualization}
							<div class="mt-3 max-w-[420px]">
								<div class="relative rounded-xl overflow-hidden border border-border">
									<img
										src="data:image/png;base64,{message.visualization.imageBase64}"
										alt="Scene visualization"
										class="w-full rounded-xl"
									/>
									<button
										onclick={() => onremovevisualization(message)}
										title="Remove visualization"
										class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur text-muted-foreground hover:text-red-400 hover:bg-black/80 transition-colors"
									>
										<X size={13} />
									</button>
								</div>
							</div>
						{:else if visualizingId === message.id}
							<div
								class="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground"
							>
								<LoaderCircle size={14} class="animate-spin text-primary" />
								Generating scene image…
							</div>
						{/if}

						<div
							class="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<button
								onclick={() => startEdit(message)}
								title="Edit passage"
								class="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors text-xs"
							>
								<Pencil size={13} />
								<span class="hidden sm:inline">Edit</span>
							</button>
							<button
								onclick={() => onbranch(message)}
								title="Branch from here — continue the story from this passage"
								class="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors text-xs"
							>
								<GitFork size={13} />
								<span class="hidden sm:inline">Branch</span>
							</button>
							<button
								onclick={() => onvisualize(message)}
								disabled={visualizingId !== null}
								title="Visualize this scene as an image"
								class="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-[#d4a853] hover:bg-white/6 disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
							>
								<ImagePlus size={13} />
								<span class="hidden sm:inline">
									{message.visualization ? 'Re-visualize' : 'Visualize'}
								</span>
							</button>
							<button
								onclick={() => ondelete(message)}
								title="Manage this passage — delete or rewind"
								class="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/8 transition-colors text-xs"
							>
								<Trash2 size={13} />
								<span class="hidden sm:inline">Delete</span>
							</button>
						</div>
					</div>
				{/if}
			{/each}

			{#if isGenerating && generatingText}
				<div class="segment-enter">
					<div class="manuscript text-foreground">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- proseToHtml escapes all input -->
						{@html proseToHtml(generatingText)}
					</div>
					<span class="inline-block w-0.5 h-4 bg-primary cursor-blink ml-0.5 align-text-bottom"
					></span>
				</div>
			{/if}

			{#if isGenerating && !generatingText}
				<div class="flex items-center gap-2 py-2">
					<div class="flex gap-1">
						{#each [0, 1, 2] as i (i)}
							<div
								class="w-1.5 h-1.5 rounded-full bg-primary/60"
								style="animation: blink 1.2s ease-in-out {i * 0.2}s infinite"
							></div>
						{/each}
					</div>
					<span class="text-xs text-muted-foreground">Writing...</span>
				</div>
			{/if}

			<div class="h-4"></div>
		</div>
	</div>
{/if}
