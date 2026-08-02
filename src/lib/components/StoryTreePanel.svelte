<script lang="ts">
	import type { Story, Message } from '$lib/types';
	import { formatTimeShort } from '$lib/utils';
	import { SvelteSet } from 'svelte/reactivity';
	import { GitBranch, Circle, GitFork, Image, X } from '@lucide/svelte';

	let {
		story,
		onswitchbranch,
		onremovevisualization
	}: {
		story: Story;
		onswitchbranch: (messageId: string) => void;
		onremovevisualization: (message: Message) => void;
	} = $props();

	let treeTab = $state<'tree' | 'scenes'>('tree');

	function replyTo(userMsg: Message): Message | undefined {
		return story.messages.find((m) => m.role === 'assistant' && m.parentId === userMsg.id);
	}

	function childrenOf(userMsg: Message): Message[] {
		const reply = replyTo(userMsg);
		if (!reply) return [];
		return story.messages.filter((m) => m.role === 'user' && m.parentId === reply.id);
	}

	let roots = $derived(story.messages.filter((m) => m.role === 'user' && m.parentId === null));

	let activePath = $derived(
		(() => {
			const set = new SvelteSet<string>();
			const map = new Map(story.messages.map((m) => [m.id, m]));
			let current: string | null = story.activeBranchId;
			while (current) {
				set.add(current);
				current = map.get(current)?.parentId ?? null;
			}
			return set;
		})()
	);

	function isOnActivePath(userMsg: Message): boolean {
		const reply = replyTo(userMsg);
		return reply ? activePath.has(reply.id) : activePath.has(userMsg.id);
	}

	function activeMessages() {
		if (!story.activeBranchId) return story.messages;
		const map = new Map(story.messages.map((m) => [m.id, m]));
		const out: Message[] = [];
		let current: string | null = story.activeBranchId;
		while (current) {
			const msg = map.get(current);
			if (!msg) break;
			out.unshift(msg);
			current = msg.parentId;
		}
		return out;
	}

	let narrativeMessages = $derived(activeMessages().filter((m) => m.role === 'assistant'));

	let visualizedMessages = $derived(
		story.messages.filter((m) => m.role === 'assistant' && m.visualization)
	);
</script>

{#snippet branchNode(userMsg: Message, depth: number)}
	{@const reply = replyTo(userMsg)}
	{@const onPath = isOnActivePath(userMsg)}
	{@const isActive = reply
		? story.activeBranchId === reply.id
		: story.activeBranchId === userMsg.id}
	{@const kids = childrenOf(userMsg)}
	<div class="relative" style:padding-left="{depth * 14}px">
		<button
			onclick={() => onswitchbranch(reply?.id ?? userMsg.id)}
			class="w-full flex items-start gap-3 pr-3 py-3 rounded-xl text-left transition-all
				{isActive
				? 'bg-primary/10 border border-primary/25'
				: onPath
					? 'hover:bg-white/4 border border-transparent'
					: 'opacity-60 hover:opacity-100 hover:bg-white/4 border border-transparent'}"
		>
			<div
				class="mt-0.5 shrink-0 {isActive
					? 'text-primary'
					: onPath
						? 'text-[#b8b4aa]'
						: 'text-muted-foreground'}"
			>
				{#if depth === 0}
					<Circle size={14} fill="currentColor" />
				{:else}
					<GitFork size={14} />
				{/if}
			</div>
			<div class="min-w-0">
				<div class="text-sm truncate {isActive ? 'text-[#d4a853]' : 'text-[#b8b4aa]'}">
					{userMsg.content}
				</div>
				{#if reply}
					<p class="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2 font-serif">
						{reply.content.slice(0, 60)}{reply.content.length > 60 ? '…' : ''}
					</p>
				{/if}
			</div>
		</button>

		{#if kids.length > 0}
			<div class="ml-2 border-l border-dashed border-primary/25">
				{#each kids as child (child.id)}
					{@render branchNode(child, depth + 1)}
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col h-full">
	<div class="flex border-b border-border">
		<button
			onclick={() => (treeTab = 'tree')}
			class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 transition-colors
				{treeTab === 'tree'
				? 'border-primary text-[#d4a853]'
				: 'border-transparent text-muted-foreground hover:text-[#b8b4aa]'}"
		>
			<GitBranch size={13} />
			Tree
		</button>
		<button
			onclick={() => (treeTab = 'scenes')}
			class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border-b-2 transition-colors
				{treeTab === 'scenes'
				? 'border-primary text-[#d4a853]'
				: 'border-transparent text-muted-foreground hover:text-[#b8b4aa]'}"
		>
			<Image size={13} />
			Scenes
			{#if visualizedMessages.length > 0}
				<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-[#d4a853]">
					{visualizedMessages.length}
				</span>
			{/if}
		</button>
	</div>

	{#if treeTab === 'tree'}
		<div class="px-3 pt-4 pb-2">
			<div class="flex items-center gap-2 mb-1">
				<GitBranch size={14} class="text-primary/70" />
				<span class="text-xs text-muted-foreground uppercase tracking-widest"> Timeline </span>
			</div>
			<p class="text-[11px] text-muted-foreground/60 leading-relaxed">
				Use "Branch" on any passage to explore an alternate path.
			</p>
		</div>

		<div class="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
			{#if roots.length === 0}
				<div class="text-center py-10 text-sm text-muted-foreground">
					No story yet — start writing to see the timeline.
				</div>
			{:else}
				{#each roots as root (root.id)}
					{@render branchNode(root, 0)}
				{/each}
			{/if}
		</div>

		{#if narrativeMessages.length > 0}
			<div class="border-t border-border">
				<div class="px-3 pt-2 pb-3">
					<div class="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
						Passages
					</div>
					<div class="relative pl-4">
						<div class="absolute left-1.5 top-0 bottom-0 w-px bg-white/8"></div>
						{#each narrativeMessages as message (message.id)}
							<div class="relative mb-3 last:mb-0">
								<div
									class="absolute -left-3 top-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 border border-primary/60"
								></div>
								<div class="text-[11px] text-muted-foreground">
									{formatTimeShort(message.timestamp)}
								</div>
								<p class="text-xs text-[#9992a6] leading-relaxed mt-0.5 line-clamp-2 font-serif">
									{message.content.slice(0, 90)}{message.content.length > 90 ? '…' : ''}
								</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class="flex-1 overflow-y-auto px-3 py-4">
			{#if visualizedMessages.length === 0}
				<div class="text-center py-10">
					<div
						class="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3"
					>
						<Image size={18} class="text-primary/40" />
					</div>
					<p class="text-sm text-muted-foreground">
						No scenes visualized yet. Use "Visualize" on any passage to generate an image.
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each visualizedMessages as message (message.id)}
						<div class="rounded-xl overflow-hidden border border-border bg-card">
							<div class="relative">
								<img
									src="data:image/png;base64,{message.visualization!.imageBase64}"
									alt="Scene visualization"
									class="w-full"
								/>
								<button
									onclick={() => onremovevisualization(message)}
									title="Remove visualization"
									class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur text-muted-foreground hover:text-red-400 hover:bg-black/80 transition-colors"
								>
									<X size={13} />
								</button>
							</div>
							<div class="px-3 py-2">
								<div class="text-[10px] text-muted-foreground">
									{formatTimeShort(message.timestamp)}
								</div>
								<p class="text-xs text-[#9992a6] leading-relaxed mt-0.5 line-clamp-2 font-serif">
									{message.content.slice(0, 100)}{message.content.length > 100 ? '…' : ''}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
