<script lang="ts">
	import './layout.css';
	import { dev } from '$app/environment';
	import { addToast, startHeartbeat } from '$lib/stores';
	import Toaster from '$lib/components/Toaster.svelte';

	let { children } = $props();

	$effect(() => {
		startHeartbeat();

		if (dev || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

		navigator.serviceWorker.register('/service-worker.js', { type: 'module' }).then((reg) => {
			reg.addEventListener('updatefound', () => {
				const installing = reg.installing;
				if (!installing || !navigator.serviceWorker.controller) return;
				installing.addEventListener('statechange', () => {
					if (installing.state === 'installed') {
						addToast('Update available — reload to apply', 'info');
					}
				});
			});
		});

		let reloaded = false;
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (reloaded) return;
			reloaded = true;
			window.location.reload();
		});
	});
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#c8922a" />
	<meta
		name="description"
		content="An AI-powered fanfic co-writing studio. You direct the story, the AI writes the prose."
	/>
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</svelte:head>
{@render children()}
<Toaster />
