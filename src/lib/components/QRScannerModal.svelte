<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, Camera, ScanQrCode } from '@lucide/svelte';

	let { onclose, onscan }: { onclose: () => void; onscan: (url: string) => void } = $props();

	let error = $state<string | null>(null);
	let scanning = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let scanner: any = null;

	onMount(async () => {
		try {
			const { Html5Qrcode } = await import('html5-qrcode');

			scanner = new Html5Qrcode('qr-reader');
			await scanner.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0
				},
				(decodedText: string) => {
					scanning = false;
					scanner?.stop().catch(() => {});
					onscan(decodedText);
				},
				() => {}
			);
			scanning = true;
		} catch (err) {
			error =
				(err as Error).message.includes('Permission') || (err as Error).name === 'NotAllowedError'
					? 'Camera permission denied. Please allow camera access and try again.'
					: `Could not start camera: ${(err as Error).message}`;
		}
	});

	onDestroy(() => {
		if (scanner) {
			scanner.stop().catch(() => {});
			scanner.clear().catch(() => {});
		}
	});

	function handleClose() {
		if (scanner) {
			scanner.stop().catch(() => {});
			scanner.clear().catch(() => {});
		}
		onclose();
	}
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
	<button
		type="button"
		aria-label="Close QR scanner"
		class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
		onclick={handleClose}
	></button>
	<div
		class="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-popover border border-border shadow-2xl flex flex-col overflow-hidden"
	>
		<div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
			<div class="flex items-center gap-2">
				<div
					class="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center"
				>
					<ScanQrCode size={14} class="text-primary" />
				</div>
				<h2 class="text-foreground">Scan QR Code</h2>
			</div>
			<button
				onclick={handleClose}
				class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
			>
				<X size={18} />
			</button>
		</div>

		<div class="flex flex-col items-center gap-4 p-5">
			{#if error}
				<div class="w-full p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-center">
					<div
						class="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center mx-auto mb-3"
					>
						<Camera size={18} class="text-red-400" />
					</div>
					<p class="text-sm text-red-400/80 leading-relaxed">{error}</p>
					<button
						onclick={handleClose}
						class="mt-3 px-4 py-2 rounded-lg bg-white/5 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
					>
						Close
					</button>
				</div>
			{:else}
				<div
					id="qr-reader"
					class="w-full rounded-xl overflow-hidden border border-border bg-black"
				></div>
				<p class="text-xs text-muted-foreground text-center leading-relaxed">
					{#if scanning}
						Point your camera at a QR code containing a server URL
					{:else}
						Initializing camera...
					{/if}
				</p>
			{/if}
		</div>
	</div>
</div>
