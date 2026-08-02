<script lang="ts">
	import { toasts } from '$lib/stores';
	import { CheckCircle2, AlertTriangle, Info, X } from '@lucide/svelte';

	let { toastsList = toasts }: { toastsList?: typeof toasts } = $props();
</script>

<div
	class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
>
	{#each $toastsList as toast (toast.id)}
		{@const Icon =
			toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertTriangle : Info}
		{@const accent =
			toast.type === 'success'
				? 'text-emerald-400'
				: toast.type === 'error'
					? 'text-red-400'
					: 'text-primary'}
		<div
			class="pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl bg-popover border border-border shadow-2xl shadow-black/40 animate-[fadeSlideIn_0.25s_ease]"
			role="status"
		>
			<Icon size={16} class={`shrink-0 mt-0.5 ${accent}`} />
			<p class="flex-1 text-sm text-foreground leading-snug min-w-0">{toast.message}</p>
			<button
				onclick={() => toasts.update((t) => t.filter((x) => x.id !== toast.id))}
				class="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Dismiss"
			>
				<X size={13} />
			</button>
		</div>
	{/each}
</div>
