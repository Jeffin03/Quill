<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Download } from '@lucide/svelte';

	let deferredPrompt = $state<any>(null);
	let showInstall = $state(false);
	let dismissed = $state(false);

	onMount(() => {
		const handler = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e;
			showInstall = true;
		};
		window.addEventListener('beforeinstallprompt', handler);

		const dismissedKey = 'pwa-install-dismissed';
		if (sessionStorage.getItem(dismissedKey)) {
			dismissed = true;
		}

		return () => window.removeEventListener('beforeinstallprompt', handler);
	});

	async function install() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			showInstall = false;
		}
		deferredPrompt = null;
	}

	function dismiss() {
		showInstall = false;
		dismissed = true;
		sessionStorage.setItem('pwa-install-dismissed', '1');
	}
</script>

{#if showInstall && !dismissed}
	<div
		class="fixed bottom-20 left-4 right-4 sm:bottom-8 sm:left-auto sm:right-8 sm:w-80 z-40 animate-[fadeSlideIn_0.3s_ease]"
	>
		<div
			class="flex items-center gap-3 p-3 rounded-xl bg-popover border border-border shadow-2xl shadow-black/40"
		>
			<div
				class="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"
			>
				<Download size={18} class="text-primary" />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-sm text-foreground font-medium">Install Quill</p>
				<p class="text-[11px] text-muted-foreground leading-snug">
					Add to your home screen for the full app experience
				</p>
			</div>
			<div class="flex gap-1 shrink-0">
				<button
					onclick={install}
					class="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-[#d4a853] transition-colors"
				>
					Install
				</button>
				<button
					onclick={dismiss}
					class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
					aria-label="Dismiss"
				>
					<X size={14} />
				</button>
			</div>
		</div>
	</div>
{/if}
