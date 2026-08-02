<script lang="ts">
	import * as db from '$lib/services/db';
	import { Send, Square, Shield, Wand2 } from '@lucide/svelte';

	let {
		value = $bindable(),
		ongenerate,
		onstop,
		isgenerating,
		compact = false
	}: {
		value: string;
		ongenerate: (opts: { sanitize: boolean; rewrite: boolean }) => void;
		onstop: () => void;
		isgenerating: boolean;
		compact?: boolean;
	} = $props();

	let textarea: HTMLTextAreaElement | undefined = $state();
	let sanitizeOn = $state(false);
	let rewriteOn = $state(false);

	$effect(() => {
		const el = textarea;
		if (!el) return;
		el.style.height = 'auto';
		const maxH = compact ? 120 : 260;
		el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
	});

	$effect(() => {
		db.getConfig().then((config) => {
			sanitizeOn = config.sanitizeEnabled !== false;
			rewriteOn = !!config.uncensorRewrite;
		});
	});

	function toggleSanitize() {
		sanitizeOn = !sanitizeOn;
		db.saveConfig({ sanitizeEnabled: sanitizeOn });
	}

	function toggleRewrite() {
		rewriteOn = !rewriteOn;
		db.saveConfig({ uncensorRewrite: rewriteOn });
	}

	function fire() {
		ongenerate({ sanitize: sanitizeOn, rewrite: rewriteOn });
	}
</script>

{#if compact}
	<div class="border-t border-border bg-[#0f0f15]">
		<div class="flex gap-1.5 px-3 pt-2">
			<button
				onclick={toggleSanitize}
				class="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors
					{sanitizeOn
					? 'bg-primary/15 border-primary/30 text-[#d4a853]'
					: 'bg-white/4 border-border text-muted-foreground'}"
			>
				<Shield size={10} />
				Sanitize
			</button>
			<button
				onclick={toggleRewrite}
				class="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors
					{rewriteOn
					? 'bg-primary/15 border-primary/30 text-[#d4a853]'
					: 'bg-white/4 border-border text-muted-foreground'}"
			>
				<Wand2 size={10} />
				Rewrite
			</button>
		</div>
		<div class="px-3 py-2 flex items-end gap-2">
			<div class="flex-1 relative">
				<textarea
					bind:this={textarea}
					bind:value
					onkeydown={(e) => {
						if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isgenerating) {
							e.preventDefault();
							fire();
						}
					}}
					placeholder="What happens next..."
					rows={1}
					class="w-full bg-input-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none px-3 py-2 text-sm outline-none focus:border-primary/40 transition-colors leading-relaxed"
					style="min-height: 40px; max-height: 40px"></textarea>
			</div>
			{#if isgenerating}
				<button
					onclick={onstop}
					class="shrink-0 w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center hover:bg-red-500/25 transition-colors"
				>
					<Square size={13} />
				</button>
			{:else}
				<button
					onclick={fire}
					disabled={!value.trim()}
					class="shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
				>
					<Send size={13} />
				</button>
			{/if}
		</div>
	</div>
{:else}
	<div class="flex flex-col h-full bg-[#0f0f15] border-l border-border">
		<div class="px-4 pt-5 pb-3 border-b border-white/5">
			<div
				class="text-[10px] text-primary/70 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"
			>
				<div class="w-1 h-1 rounded-full bg-primary/50"></div>
				Direct the Story
			</div>
			<p class="text-xs text-muted-foreground leading-relaxed">
				Guide what happens next. The AI will continue the narrative from your direction.
			</p>
		</div>

		<div class="flex-1 flex flex-col p-4 gap-3">
			<div class="flex-1 relative">
				<textarea
					bind:this={textarea}
					bind:value
					onkeydown={(e) => {
						if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isgenerating) {
							e.preventDefault();
							fire();
						}
					}}
					placeholder="What should happen next? Guide the characters, set the scene, introduce a twist..."
					class="w-full h-full bg-input-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none p-3.5 text-sm outline-none focus:border-primary/40 transition-colors leading-relaxed"
					style="min-height: 160px"></textarea>
			</div>

			<div class="space-y-1">
				<button
					type="button"
					role="switch"
					aria-checked={sanitizeOn}
					onclick={toggleSanitize}
					class="w-full flex items-center justify-between gap-2"
					title="Replace trigger terms (copyrighted names, explicit content) with placeholders before sending to gated APIs (OpenRouter, NIM). Restored in the response."
				>
					<span
						class="flex items-center gap-1.5 text-[11px] {sanitizeOn
							? 'text-[#d4a853]'
							: 'text-muted-foreground'} transition-colors"
					>
						<Shield size={11} />
						Sanitize request
					</span>
					<span
						class="shrink-0 w-8 h-4 rounded-full p-[2px] transition-colors {sanitizeOn
							? 'bg-primary'
							: 'bg-white/10'}"
					>
						<span
							class="block w-3 h-3 rounded-full bg-white transition-transform {sanitizeOn
								? 'translate-x-4'
								: ''}"
						></span>
					</span>
				</button>
				<button
					type="button"
					role="switch"
					aria-checked={rewriteOn}
					onclick={toggleRewrite}
					class="w-full flex items-center justify-between gap-2"
					title="Story generation → remote API → rewrite uncensored via local LLM. Requires one remote + one local text connection."
				>
					<span
						class="flex items-center gap-1.5 text-[11px] {rewriteOn
							? 'text-[#d4a853]'
							: 'text-muted-foreground'} transition-colors"
					>
						<Wand2 size={11} />
						Uncensored rewrite
					</span>
					<span
						class="shrink-0 w-8 h-4 rounded-full p-[2px] transition-colors {rewriteOn
							? 'bg-primary'
							: 'bg-white/10'}"
					>
						<span
							class="block w-3 h-3 rounded-full bg-white transition-transform {rewriteOn
								? 'translate-x-4'
								: ''}"
						></span>
					</span>
				</button>
			</div>

			<div class="text-[10px] text-muted-foreground/50 text-right">Ctrl+Enter to generate</div>

			{#if isgenerating}
				<button
					onclick={onstop}
					class="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 text-sm flex items-center justify-center gap-2 transition-colors"
				>
					<Square size={13} />
					Stop generating
				</button>
			{:else}
				<button
					onclick={fire}
					disabled={!value.trim()}
					class="w-full py-3 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground text-sm flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:scale-98"
				>
					<Send size={14} />
					Generate
				</button>
			{/if}
		</div>

		<div class="px-4 pb-4 space-y-3">
			<div class="h-px bg-white/5"></div>
			<p class="text-[10px] text-muted-foreground/50 leading-relaxed">
				All your data stays on this device. No story content is ever sent to Quill's servers.
			</p>
		</div>
	</div>
{/if}
