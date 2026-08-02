<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as api from '$lib/services/api';
	import StoryWorkspace from '$lib/components/StoryWorkspace.svelte';
	import type { Story } from '$lib/types';

	let { params } = $props();

	let story = $state<Story | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			story = await api.getStory(params.id);
		} catch (err) {
			error = (err as Error).message;
		}
	});
</script>

<svelte:head>
	<title>{story?.title ?? 'Story'} — Quill</title>
</svelte:head>

{#if error}
	<div
		class="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6"
	>
		<p class="text-foreground font-serif text-xl mb-2">Story not found</p>
		<p class="text-sm text-muted-foreground mb-6">{error}</p>
		<a href={resolve('/')} class="text-sm text-primary hover:underline">Back to stories</a>
	</div>
{:else if story}
	<StoryWorkspace {story} />
{:else}
	<div class="min-h-screen flex items-center justify-center bg-background">
		<div class="flex gap-1">
			{#each [0, 1, 2] as i (i)}
				<div
					class="w-1.5 h-1.5 rounded-full bg-primary/60"
					style="animation: blink 1.2s ease-in-out {i * 0.2}s infinite"
				></div>
			{/each}
		</div>
	</div>
{/if}
