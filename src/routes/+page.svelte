<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StoryListView from '$lib/components/StoryListView.svelte';
	import NewStoryModal from '$lib/components/NewStoryModal.svelte';
	import APIManagerModal from '$lib/components/APIManagerModal.svelte';
	import * as db from '$lib/services/db';
	import { addToast } from '$lib/stores';

	let showNewStory = $state(false);
	let showSettings = $state(false);

	function handleNewStory(id: string) {
		showNewStory = false;
		goto(resolve(`/story/${id}`));
	}

	async function handleImport() {
		try {
			const story = await db.importStory();
			addToast(`Imported "${story.title}"`, 'success');
			goto(resolve(`/story/${story.id}`));
		} catch (err) {
			addToast((err as Error).message, 'error');
		}
	}
</script>

<svelte:head><title>Quill</title></svelte:head>

{#if showNewStory}
	<NewStoryModal oncreated={handleNewStory} onclose={() => (showNewStory = false)} />
{/if}

{#if showSettings}
	<APIManagerModal onclose={() => (showSettings = false)} />
{/if}

<StoryListView
	onopen={(id) => goto(resolve(`/story/${id}`))}
	onnewstory={() => (showNewStory = true)}
	onimport={handleImport}
	onsettings={() => (showSettings = true)}
/>
