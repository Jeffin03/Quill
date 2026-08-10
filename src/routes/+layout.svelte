<script lang="ts">
	import './layout.css';
	import { dev } from '$app/environment';
	import { base } from '$app/paths';
	import { addToast, startHeartbeat } from '$lib/stores';
	import Toaster from '$lib/components/Toaster.svelte';
	import PWAInstall from '$lib/components/PWAInstall.svelte';

	let { children } = $props();

	$effect(() => {
		startHeartbeat();

		if (dev || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

		navigator.serviceWorker
			.register(`${base}/service-worker.js`, { type: 'module' })
			.then((reg) => {
				let updateToastShown = false;

				reg.addEventListener('updatefound', () => {
					const installing = reg.installing;
					if (!installing) return;
					installing.addEventListener('statechange', () => {
						if (installing.state === 'installed' && !updateToastShown) {
							updateToastShown = true;
							addToast('Update available — reload to apply', 'info');
						}
					});
				});
			})
			.catch(() => {
				// Service worker registration failed — app still works without it
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
<PWAInstall />
