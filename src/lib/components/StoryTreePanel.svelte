<script lang="ts">
	import type { Story, Message } from '$lib/types';
	import { formatTimeShort } from '$lib/utils';
	import { SvelteSet } from 'svelte/reactivity';
	import { GitBranch, Circle, GitFork, Image, X, ChevronDown } from '@lucide/svelte';

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

	function extractLabel(content: string): string {
		const prefixes = [
			/^write\s+(?:a\s+)?(?:scene|chapter|passage|section|part|paragraph|segment|bit|page|entry|fragment|excerpt|snippet|piece|portion|segment|segment)\s+(?:where|in which|about|describing|showing|featuring|that (?:shows|depicts|describes|features|includes))?/i,
			/^continue\s+(?:the\s+)?(?:story|scene|narrative|tale|chapter|passage|writing|prose)?\s*(?:where|with|by|in which|showing|about)?/i,
			/^add\s+(?:a\s+)?(?:scene|chapter|passage|section|part|paragraph|bit|page|entry)?\s*(?:where|with|in which|about|showing|featuring)?/i,
			/^now\s+(?:write|continue|add|show|have|make|describe|include)?\s*(?:a\s+)?(?:scene|chapter|passage)?\s*(?:where|with|in which|about)?/i,
			/^(?:please|kindly|could you|can you|would you)\s+(?:write|continue|add|show|have|make|describe)?\s*(?:a\s+)?(?:scene|chapter|passage)?\s*(?:where|with|in which|about)?/i,
			/^let'?s\s+(?:write|continue|add|have|see|show|move|proceed|shift|jump|cut|transition)?\s*(?:a\s+)?(?:scene|chapter|passage)?\s*(?:where|with|in which|about|to)?/i,
			/^(?:then|next|after that|afterwards|meanwhile|simultaneously|subsequently),?\s*/i
		];

		let text = content.trim();
		for (const re of prefixes) {
			text = text.replace(re, '').trim();
		}

		if (!text) return content.slice(0, 50) + (content.length > 50 ? '…' : '');

		const sentenceEnd = text.match(/^[^.!?;:—–-]+[.!?;:—–-]/);
		if (sentenceEnd && sentenceEnd[0].length <= 55) {
			return sentenceEnd[0].trim();
		}

		const commaBreak = text.match(/^[^,]{8,50},/);
		if (commaBreak) {
			return commaBreak[0].trim().replace(/,$/, '') + '…';
		}

		if (text.length <= 50) return text;
		const spaceIdx = text.lastIndexOf(' ', 48);
		return text.slice(0, spaceIdx > 20 ? spaceIdx : 48) + '…';
	}

	let narrativeMessages = $derived(activeMessages().filter((m) => m.role === 'assistant'));

	let visualizedMessages = $derived(
		story.messages.filter((m) => m.role === 'assistant' && m.visualization)
	);

	let hasPassages = $derived(narrativeMessages.length > 0);

	// ── Timeline layout ────────────────────────────────────────────────
	// Rows indent for the first MAX_INDENT_LEVELS levels, then fold into a fixed
	// column so long branches can't drift diagonally out of the panel. Each row
	// draws its own rails + elbow connectors, so hierarchy stays readable at any depth.
	const INDENT_PX = 16;
	const MAX_INDENT_LEVELS = 2;
	const FOLD_X = MAX_INDENT_LEVELS * INDENT_PX + 8; // 40px — gutter holds the fold rail

	function iconX(depth: number): number {
		return depth < MAX_INDENT_LEVELS ? depth * INDENT_PX : FOLD_X;
	}

	function railX(depth: number): number {
		return depth < MAX_INDENT_LEVELS ? depth * INDENT_PX + 7 : FOLD_X - 7;
	}

	// ── Collapsible branch groups ──────────────────────────────────────
	let userExpanded = new SvelteSet<string>();
	let userCollapsed = new SvelteSet<string>();

	// Ancestors of the row holding the LAST successful generation. Kept open by default
	// so the latest content is always reachable without expanding branches by hand.
	let latestChain = $derived.by(() => {
		const set = new SvelteSet<string>();
		const map = new Map(story.messages.map((m) => [m.id, m]));
		let leaf: Message | null = null;
		for (const m of story.messages) {
			if (!m.content.trim() || m.role !== 'assistant') continue;
			if (!leaf || m.timestamp > leaf.timestamp) leaf = m;
		}
		if (!leaf) {
			// No successful generation yet — keep the newest direction reachable instead.
			for (const m of story.messages) {
				if (m.role === 'user' && m.content.trim() && (!leaf || m.timestamp > leaf.timestamp))
					leaf = m;
			}
		}
		if (!leaf) return set;
		// Rows are user messages: the content row is the leaf itself (user) or its parent (assistant).
		const rowId = leaf.role === 'assistant' ? leaf.parentId : leaf.id;
		if (!rowId) return set;
		let current = map.get(rowId)?.parentId ?? null;
		while (current) {
			const msg = map.get(current);
			if (!msg) break;
			if (msg.role === 'user') set.add(msg.id);
			current = msg.parentId ?? null;
		}
		return set;
	});

	function defaultExpanded(msg: Message, depth: number): boolean {
		// Top-level branches, the active path, and the last successful generation's chain
		// stay open; everything else starts collapsed.
		return depth === 0 || isOnActivePath(msg) || latestChain.has(msg.id);
	}

	function isGroupExpanded(msg: Message, depth: number): boolean {
		if (userCollapsed.has(msg.id)) return false;
		if (userExpanded.has(msg.id)) return true;
		return defaultExpanded(msg, depth);
	}

	function toggleExpand(msg: Message, expanded: boolean) {
		if (expanded) {
			userCollapsed.add(msg.id);
			userExpanded.delete(msg.id);
		} else {
			userExpanded.add(msg.id);
			userCollapsed.delete(msg.id);
		}
	}

	type TimelineRow = {
		msg: Message;
		depth: number;
		iconX: number;
		parentRailX: number;
		parentRailEndsHere: boolean;
		ancestorRails: number[];
		outgoingRailX: number;
		hookedOutgoing: boolean;
		expanded: boolean;
		kidsCount: number;
		hiddenCount: number;
	};

	function countDescendants(msg: Message): number {
		let total = 0;
		for (const kid of childrenOf(msg)) total += 1 + countDescendants(kid);
		return total;
	}

	function buildTimeline(): TimelineRow[] {
		const rows: TimelineRow[] = [];

		const walk = (msg: Message, depth: number, ancestors: Message[]) => {
			const kids = childrenOf(msg);
			const expanded = kids.length > 0 && isGroupExpanded(msg, depth);
			const parent = depth > 0 ? ancestors[depth - 1] : null;
			const siblings = parent ? childrenOf(parent) : [];
			const isLastKid = parent !== null && siblings[siblings.length - 1]?.id === msg.id;

			// Ancestor columns whose guide line continues past this row.
			const ancestorRails: number[] = [];
			for (let k = 0; k < depth - 1; k++) {
				const ancestor = ancestors[k];
				const next = ancestors[k + 1];
				const ancestorKids = childrenOf(ancestor);
				const x = railX(k);
				// Deeper ancestors share the fold rail — keep each x only once.
				if (ancestorKids[ancestorKids.length - 1]?.id !== next.id && !ancestorRails.includes(x)) {
					ancestorRails.push(x);
				}
			}

			rows.push({
				msg,
				depth,
				iconX: iconX(depth),
				parentRailX: depth > 0 ? railX(depth - 1) : -1,
				parentRailEndsHere: isLastKid,
				ancestorRails,
				outgoingRailX: expanded ? railX(depth) : -1,
				hookedOutgoing: expanded && depth >= MAX_INDENT_LEVELS,
				expanded,
				kidsCount: kids.length,
				hiddenCount: kids.length > 0 && !expanded ? countDescendants(msg) : 0
			});

			if (expanded) for (const kid of kids) walk(kid, depth + 1, [...ancestors, msg]);
		};

		for (const root of roots) walk(root, 0, []);
		return rows;
	}

	let timelineRows = $derived(buildTimeline());

	let allGroupIds = $derived(
		story.messages.filter((m) => m.role === 'user' && childrenOf(m).length > 0).map((m) => m.id)
	);

	/** True when every branch group in the story is visible and open right now. */
	let allExpanded = $derived(
		allGroupIds.length > 0 &&
			allGroupIds.every((id) => {
				const row = timelineRows.find((r) => r.msg.id === id);
				return row ? row.expanded : false;
			})
	);

	function toggleExpandAll() {
		if (allExpanded) {
			// Back to the default view: active path + latest generation chain open.
			userExpanded.clear();
			userCollapsed.clear();
		} else {
			for (const id of allGroupIds) {
				userExpanded.add(id);
				userCollapsed.delete(id);
			}
		}
	}
</script>

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
		<div class="flex-1 min-h-0 flex flex-col">
			<!-- Timeline: 70% of the body (falls back to full height when there are no passages) -->
			<div class="min-h-0 flex flex-col {hasPassages ? 'basis-[70%] shrink-0 grow-0' : 'flex-1'}">
				<div class="px-3 pt-4 pb-2 shrink-0">
					<div class="flex items-center gap-2 mb-1">
						<GitBranch size={14} class="text-primary/70" />
						<span class="text-xs text-muted-foreground uppercase tracking-widest"> Timeline </span>
						<button
							onclick={toggleExpandAll}
							class="ml-auto px-1.5 py-0.5 rounded-md border border-border text-[10px] uppercase
								tracking-wider text-muted-foreground hover:text-[#d4a853] hover:border-primary/40
								transition-colors"
							title={allExpanded
								? 'Back to the default view — active path and latest generation open'
								: 'Expand every branch in the timeline'}
						>
							{allExpanded ? 'Reset view' : 'Expand all'}
						</button>
					</div>
					<p class="text-[11px] text-muted-foreground/60 leading-relaxed">
						Use "Branch" on any passage to explore an alternate path. Tap the chevron to fold or
						unfold a branch — the latest generation always stays visible.
					</p>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
					{#if roots.length === 0}
						<div class="text-center py-10 text-sm text-muted-foreground">
							No story yet — start writing to see the timeline.
						</div>
					{:else}
						{#each timelineRows as row (row.msg.id)}
							{@const reply = replyTo(row.msg)}
							{@const onPath = isOnActivePath(row.msg)}
							{@const isActive = reply
								? story.activeBranchId === reply.id
								: story.activeBranchId === row.msg.id}
							<div
								class="relative flex items-stretch overflow-hidden rounded-xl border transition-all
									{isActive
									? 'bg-primary/10 border-primary/25'
									: onPath
										? 'hover:bg-white/4 border-transparent'
										: 'opacity-60 hover:opacity-100 hover:bg-white/4 border-transparent'}"
								style:padding-left="{row.iconX}px"
							>
								{#each row.ancestorRails as x (x)}
									<span class="absolute inset-y-0 w-px bg-primary/30" style:left="{x}px"></span>
								{/each}
								{#if row.parentRailX >= 0}
									<span
										class="absolute w-px bg-primary/30 {row.parentRailEndsHere
											? 'top-0 h-[21px]'
											: 'inset-y-0'}"
										style:left="{row.parentRailX}px"
									></span>
									<span
										class="absolute h-px bg-primary/30"
										style="left: {row.parentRailX}px; top: 21px; width: {row.iconX -
											row.parentRailX}px"
									></span>
								{/if}
								{#if row.outgoingRailX >= 0}
									{#if row.hookedOutgoing}
										<span
											class="absolute h-px bg-primary/30"
											style="left: {row.outgoingRailX}px; top: 28px; width: {row.iconX -
												row.outgoingRailX}px"
										></span>
									{/if}
									<span
										class="absolute w-px bg-primary/30"
										style="left: {row.outgoingRailX}px; top: 28px; bottom: 0"
									></span>
								{/if}

								<button
									onclick={() => onswitchbranch(reply?.id ?? row.msg.id)}
									class="flex-1 min-w-0 flex items-start gap-3 py-3 pr-1 text-left"
								>
									<span
										class="mt-0.5 shrink-0 {isActive
											? 'text-primary'
											: onPath
												? 'text-[#b8b4aa]'
												: 'text-muted-foreground'}"
									>
										{#if row.depth === 0}
											<Circle size={14} fill="currentColor" />
										{:else}
											<GitFork size={14} />
										{/if}
									</span>
									<span class="min-w-0 flex-1">
										<span
											class="block text-sm truncate {isActive
												? 'text-[#d4a853]'
												: 'text-[#b8b4aa]'}"
										>
											{extractLabel(row.msg.content)}
										</span>
										{#if reply}
											<span
												class="block text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2 font-serif"
											>
												{extractLabel(reply.content)}
											</span>
										{/if}
									</span>
								</button>

								{#if row.kidsCount > 0}
									<button
										onclick={() => toggleExpand(row.msg, row.expanded)}
										aria-expanded={row.expanded}
										title={row.expanded
											? 'Collapse branch'
											: `Show ${row.hiddenCount} hidden item${row.hiddenCount === 1 ? '' : 's'}`}
										class="shrink-0 self-center mr-1.5 flex items-center gap-1 px-1.5 py-1 rounded-md
											text-[10px] transition-colors
											{row.expanded
											? 'text-muted-foreground hover:text-[#d4a853] hover:bg-white/6'
											: 'text-[#d4a853] bg-primary/15 hover:bg-primary/25'}"
									>
										{#if !row.expanded}
											<span class="tabular-nums">{row.hiddenCount}</span>
										{/if}
										<ChevronDown
											size={12}
											class="transition-transform {row.expanded ? '' : '-rotate-90'}"
										/>
									</button>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Passages: 30% of the body, scrolls independently -->
			{#if hasPassages}
				<div class="basis-[30%] shrink-0 grow-0 min-h-0 flex flex-col border-t border-border">
					<div class="px-3 pt-2 pb-2 shrink-0">
						<div class="text-[10px] text-muted-foreground uppercase tracking-widest">Passages</div>
					</div>
					<div class="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
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
										{extractLabel(message.content)}
									</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
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
									{extractLabel(message.content)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
