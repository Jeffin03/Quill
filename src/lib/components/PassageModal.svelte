<script lang="ts">
	import type { Message } from '$lib/types';
	import { X } from '@lucide/svelte';

	let {
		message,
		ondelete,
		onrewind,
		onclose
	}: {
		message: Message;
		ondelete: (message: Message) => void;
		onrewind: (message: Message) => void;
		onclose: () => void;
	} = $props();

	function makePreview() {
		return message.content.slice(0, 80) + (message.content.length > 80 ? '…' : '');
	}
	const preview = makePreview();
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
	<button
		type="button"
		aria-label="Close passage actions"
		class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
		onclick={onclose}
	></button>
	<div
		class="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-popover border border-border shadow-2xl flex flex-col overflow-hidden max-h-[92dvh]"
	>
		<div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
			<h2 class="text-foreground">Manage this passage</h2>
			<button
				onclick={onclose}
				class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
			>
				<X size={18} />
			</button>
		</div>

		<div class="px-5 py-4 space-y-3">
			<div class="p-3 rounded-lg bg-secondary border border-border">
				<p class="text-sm text-muted-foreground italic leading-relaxed">{preview}</p>
			</div>

			<button
				onclick={() => ondelete(message)}
				class="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors text-sm text-left"
			>
				<div class="font-medium">Delete this passage</div>
				<div class="text-red-400/60 text-xs mt-0.5">Remove permanently. This cannot be undone.</div>
			</button>
			<button
				onclick={() => onrewind(message)}
				class="w-full p-3 rounded-xl bg-primary/10 border border-primary/25 text-[#d4a853] hover:bg-primary/15 transition-colors text-sm text-left"
			>
				<div class="font-medium">Rewind to here</div>
				<div class="text-primary/60 text-xs mt-0.5">
					Remove this and all passages after it. The story branches from this point.
				</div>
			</button>
		</div>

		<div class="px-5 py-4 border-t border-border">
			<button
				onclick={onclose}
				class="w-full py-2.5 rounded-xl bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/8 text-sm transition-colors"
			>
				Cancel
			</button>
		</div>
	</div>
</div>
