<script lang="ts">
	import type { ContextCard } from '$lib/types';
	import { TYPE_CONFIG, FILTER_ORDER } from '$lib/utils';
	import { generateCharacterStylePrompt } from '$lib/services/imageGen';
	import { addToast } from '$lib/stores';
	import {
		Plus,
		Wand2,
		BookOpen,
		ChevronDown,
		ChevronUp,
		Pencil,
		Trash2,
		X,
		Check,
		Upload,
		LoaderCircle
	} from '@lucide/svelte';

	let {
		cards,
		syncing,
		onaddcard,
		onautogenerate,
		onupdatecard,
		ondeletecard
	}: {
		cards: ContextCard[];
		syncing: boolean;
		onaddcard: (data: {
			type: ContextCard['type'];
			title: string;
			fields: Record<string, string>;
		}) => void;
		onautogenerate: (premise: string) => void;
		onupdatecard: (id: string, data: Partial<ContextCard>) => void;
		ondeletecard: (id: string) => void;
	} = $props();

	let filter = $state<ContextCard['type'] | 'all'>('all');
	let openCardId = $state<string | null>(null);

	let editingId = $state<string | null>(null);
	let editType = $state<ContextCard['type']>('character');
	let editTitle = $state('');
	let editFields = $state<{ key: string; value: string }[]>([]);
	let editRefImage = $state('');
	let editStylePrompt = $state('');

	let adding = $state(false);
	let addType = $state<ContextCard['type']>('character');
	let addTitle = $state('');
	let addFields = $state<{ key: string; value: string }[]>([]);
	let addRefImage = $state('');
	let addStylePrompt = $state('');

	let autogenOpen = $state(false);
	let premise = $state('');
	let generatingPrompt = $state(false);

	const RESERVED_FIELDS = ['referenceImage', 'stylePrompt'];

	// ── Card highlight tracking ──────────
	// Plain object (not $state) to avoid infinite effect loops
	let prevTracking = { ids: new Set<string>(), fields: new Map<string, string>() };
	let highlights = $state<Record<string, 'new' | 'updated'>>({});

	$effect(() => {
		const current = cards;
		const h: Record<string, 'new' | 'updated'> = {};

		if (prevTracking.ids.size > 0) {
			for (const card of current) {
				if (!prevTracking.ids.has(card.id)) {
					h[card.id] = 'new';
				} else {
					const oldJson = prevTracking.fields.get(card.id);
					const newJson = JSON.stringify(card.fields);
					if (oldJson && oldJson !== newJson) {
						h[card.id] = 'updated';
					}
				}
			}
		}

		highlights = h;
		prevTracking.ids = new Set(current.map((c) => c.id));
		prevTracking.fields = new Map(current.map((c) => [c.id, JSON.stringify(c.fields)]));
	});

	let filtered = $derived(filter === 'all' ? cards : cards.filter((c) => c.type === filter));

	function countFor(t: ContextCard['type'] | 'all') {
		return t === 'all' ? cards.length : cards.filter((c) => c.type === t).length;
	}

	function isCharacter(t: ContextCard['type']) {
		return t === 'character';
	}

	function pushRow(rows: { key: string; value: string }[]) {
		rows.push({ key: '', value: '' });
	}

	function removeRow(rows: { key: string; value: string }[], i: number) {
		rows.splice(i, 1);
	}

	function collectFields(rows: { key: string; value: string }[]): Record<string, string> {
		const fields: Record<string, string> = {};
		for (const f of rows) if (f.key.trim()) fields[f.key.trim()] = f.value;
		return fields;
	}

	function visibleFields(card: ContextCard) {
		return Object.entries(card.fields).filter(([key]) => !RESERVED_FIELDS.includes(key));
	}

	function startEdit(card: ContextCard) {
		editingId = card.id;
		editType = card.type;
		editTitle = card.title;
		editFields = visibleFields(card).map(([key, value]) => ({ key, value }));
		if (editFields.length === 0) editFields = [{ key: '', value: '' }];
		editRefImage = card.fields?.referenceImage ?? '';
		editStylePrompt = card.fields?.stylePrompt ?? '';
		openCardId = card.id;
		adding = false;
		autogenOpen = false;
	}

	function saveEdit() {
		if (!editingId) return;
		const fields = collectFields(editFields);
		if (isCharacter(editType)) {
			if (editRefImage) fields.referenceImage = editRefImage;
			if (editStylePrompt.trim()) fields.stylePrompt = editStylePrompt.trim();
		}
		onupdatecard(editingId, {
			type: editType,
			title: editTitle.trim() || 'Untitled Card',
			fields
		});
		editingId = null;
	}

	function startAdd() {
		adding = true;
		autogenOpen = false;
		editingId = null;
		addType = 'character';
		addTitle = '';
		addFields = [{ key: '', value: '' }];
		addRefImage = '';
		addStylePrompt = '';
	}

	function submitAdd() {
		const fields = collectFields(addFields);
		if (isCharacter(addType)) {
			if (addRefImage) fields.referenceImage = addRefImage;
			if (addStylePrompt.trim()) fields.stylePrompt = addStylePrompt.trim();
		}
		onaddcard({
			type: addType,
			title: addTitle.trim() || 'Untitled Card',
			fields
		});
		adding = false;
	}

	function toggleAutogen() {
		autogenOpen = !autogenOpen;
		premise = '';
		adding = false;
		editingId = null;
	}

	function submitAutogen() {
		if (!premise.trim()) return;
		onautogenerate(premise.trim());
		autogenOpen = false;
	}

	function closeForms() {
		adding = false;
		autogenOpen = false;
		editingId = null;
	}

	function handleRefImage(e: Event, target: 'edit' | 'add') {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			if (target === 'edit') editRefImage = dataUrl;
			else addRefImage = dataUrl;
		};
		reader.readAsDataURL(file);
	}

	async function generatePrompt(target: 'edit' | 'add') {
		if (generatingPrompt) return;
		const type = target === 'edit' ? editType : addType;
		if (!isCharacter(type)) return;
		const title = target === 'edit' ? editTitle : addTitle;
		const rows = target === 'edit' ? editFields : addFields;
		const referenceImage = target === 'edit' ? editRefImage : addRefImage;
		const description = Object.entries(collectFields(rows))
			.map(([k, v]) => `${k}: ${v}`)
			.join(', ');
		generatingPrompt = true;
		try {
			const prompt = await generateCharacterStylePrompt({
				name: title.trim() || undefined,
				description: description || undefined,
				referenceImage: referenceImage || null
			});
			if (target === 'edit') editStylePrompt = prompt;
			else addStylePrompt = prompt;
		} catch (err) {
			addToast((err as Error).message, 'error');
		} finally {
			generatingPrompt = false;
		}
	}
</script>

<div class="flex flex-col h-full">
	<div class="px-3 pt-3 pb-2 flex gap-1.5 overflow-x-auto">
		{#each FILTER_ORDER as t (t)}
			{@const cfg = t !== 'all' ? TYPE_CONFIG[t] : null}
			{@const count = countFor(t)}
			<button
				onclick={() => (filter = t)}
				class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border shrink-0 transition-all
					{filter === t
					? cfg
						? `${cfg.color} ${cfg.bg} ${cfg.border}`
						: 'text-[#d4a853] bg-primary/12 border-primary/30'
					: 'text-muted-foreground bg-white/4 border-border hover:border-white/14 hover:text-[#b8b4aa]'}"
			>
				{#if cfg}
					<cfg.icon size={13} class={filter === t ? cfg.color : 'opacity-60'} />
				{/if}
				<span class="capitalize">{t}</span>
				{#if count > 0}
					<span class="opacity-60 text-[10px] {filter === t ? '' : 'text-muted-foreground'}"
						>{count}</span
					>
				{/if}
			</button>
		{/each}
	</div>

	{#if syncing}
		<div
			class="flex items-center gap-1.5 px-3 pb-2 text-[10px] text-muted-foreground"
			style="animation: syncPulse 1.5s infinite"
		>
			<LoaderCircle size={11} class="animate-spin text-primary" />
			Extracting cards…
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
		{#if adding}
			<div class="rounded-xl border border-primary/30 bg-secondary/40 overflow-hidden">
				<div class="px-3.5 pt-3 space-y-2">
					<div class="flex gap-2">
						<select
							bind:value={addType}
							class="shrink-0 bg-input-background border border-border text-foreground text-xs rounded-lg px-2 py-2 outline-none focus:border-primary/40"
						>
							{#each Object.entries(TYPE_CONFIG) as [type, cfg] (type)}
								<option value={type}>{cfg.label}</option>
							{/each}
						</select>
						<input
							bind:value={addTitle}
							placeholder="Card title"
							class="flex-1 min-w-0 bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg px-3 py-2 outline-none focus:border-primary/40"
						/>
					</div>
					{#each addFields as field, i (i)}
						<div class="flex gap-1.5">
							<input
								bind:value={field.key}
								placeholder="Field name"
								class="w-24 shrink-0 bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-lg px-2 py-1.5 outline-none focus:border-primary/40"
							/>
							<input
								bind:value={field.value}
								placeholder="Value"
								class="flex-1 min-w-0 bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-lg px-2 py-1.5 outline-none focus:border-primary/40"
							/>
							<button
								onclick={() => removeRow(addFields, i)}
								class="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/8 transition-colors"
								aria-label="Remove field"
							>
								<X size={13} />
							</button>
						</div>
					{/each}
					<button
						onclick={() => pushRow(addFields)}
						class="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#b8b4aa] transition-colors"
					>
						<Plus size={12} /> Add field
					</button>
				</div>
				{#if isCharacter(addType)}
					<div class="px-3.5 pb-3 space-y-2">
						<div class="rounded-xl border border-border bg-white/4 p-2.5 space-y-2">
							<div class="text-[10px] text-muted-foreground uppercase tracking-widest">
								Reference Image
							</div>
							<input
								type="file"
								accept="image/*"
								id="add-ref-image-input"
								class="hidden"
								onchange={(e) => handleRefImage(e, 'add')}
							/>
							<label
								for="add-ref-image-input"
								class="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-[#b8b4aa] hover:border-white/14 cursor-pointer transition-colors"
							>
								<Upload size={13} />
								Upload reference image
							</label>
							{#if addRefImage}
								<div class="relative w-20">
									<img
										src={addRefImage}
										alt="Reference"
										class="w-20 h-24 object-cover rounded-lg border border-border"
									/>
									<button
										onclick={() => (addRefImage = '')}
										class="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
										aria-label="Remove reference image"
									>
										<X size={10} />
									</button>
								</div>
							{/if}
							<label for="add-style-prompt" class="text-[10px] text-muted-foreground block">
								Style Prompt
							</label>
							<textarea
								id="add-style-prompt"
								bind:value={addStylePrompt}
								rows={3}
								placeholder="Visual prompt injected into every scene this character appears in…"
								class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-lg px-2.5 py-2 resize-none outline-none focus:border-primary/40"
							></textarea>
							<button
								onclick={() => generatePrompt('add')}
								disabled={generatingPrompt}
								class="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary/10 border border-primary/25 text-[#d4a853] hover:bg-primary/15 disabled:opacity-40 text-xs transition-colors"
							>
								{#if generatingPrompt}
									<LoaderCircle size={13} class="animate-spin" />
									Generating…
								{:else}
									<Wand2 size={13} />
									Generate style prompt
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>
			<div class="flex gap-2 px-3.5 py-3 border-t border-white/5 mt-3">
				<button
					onclick={() => (adding = false)}
					class="flex-1 py-2 rounded-lg bg-white/5 border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={submitAdd}
					class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-[#d4a853] text-xs transition-colors"
				>
					<Check size={13} /> Save Card
				</button>
			</div>
		{/if}

		{#if filtered.length === 0 && !adding}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div
					class="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center mb-3"
				>
					{#if filter !== 'all'}
						{@const Icon = TYPE_CONFIG[filter].icon}
						<Icon size={18} class={TYPE_CONFIG[filter].color} />
					{:else}
						<BookOpen size={18} class="text-muted-foreground" />
					{/if}
				</div>
				<p class="text-sm text-muted-foreground">
					{filter === 'all'
						? 'No context cards yet'
						: `No ${TYPE_CONFIG[filter].label.toLowerCase()} cards`}
				</p>
				<p class="text-xs text-muted-foreground/60 mt-1">
					Add cards to help the AI understand your story
				</p>
			</div>
		{:else if filtered.length > 0}
			{#each filtered as card (card.id)}
				{@const cfg = TYPE_CONFIG[card.type]}
				{#if editingId === card.id}
					<div class="rounded-xl border border-border bg-secondary/40 overflow-hidden">
						<div class="px-3.5 pt-3 space-y-2">
							<div class="flex gap-2">
								<select
									bind:value={editType}
									class="shrink-0 bg-input-background border border-border text-foreground text-xs rounded-lg px-2 py-2 outline-none focus:border-primary/40"
								>
									{#each Object.entries(TYPE_CONFIG) as [type, tcfg] (type)}
										<option value={type}>{tcfg.label}</option>
									{/each}
								</select>
								<input
									bind:value={editTitle}
									placeholder="Card title"
									class="flex-1 min-w-0 bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-sm rounded-lg px-3 py-2 outline-none focus:border-primary/40"
								/>
							</div>
							{#each editFields as field, i (i)}
								<div class="flex gap-1.5">
									<input
										bind:value={field.key}
										placeholder="Field name"
										class="w-24 shrink-0 bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-lg px-2 py-1.5 outline-none focus:border-primary/40"
									/>
									<input
										bind:value={field.value}
										placeholder="Value"
										class="flex-1 min-w-0 bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-lg px-2 py-1.5 outline-none focus:border-primary/40"
									/>
									<button
										onclick={() => removeRow(editFields, i)}
										class="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/8 transition-colors"
										aria-label="Remove field"
									>
										<X size={13} />
									</button>
								</div>
							{/each}
							<button
								onclick={() => pushRow(editFields)}
								class="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-[#b8b4aa] transition-colors"
							>
								<Plus size={12} /> Add field
							</button>
						</div>
						{#if isCharacter(editType)}
							<div class="px-3.5 pb-3 space-y-2">
								<div class="rounded-xl border border-border bg-white/4 p-2.5 space-y-2">
									<div class="text-[10px] text-muted-foreground uppercase tracking-widest">
										Reference Image
									</div>
									<input
										type="file"
										accept="image/*"
										id="edit-ref-image-input"
										class="hidden"
										onchange={(e) => handleRefImage(e, 'edit')}
									/>
									<label
										for="edit-ref-image-input"
										class="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-[#b8b4aa] hover:border-white/14 cursor-pointer transition-colors"
									>
										<Upload size={13} />
										{editRefImage ? 'Replace reference image' : 'Upload reference image'}
									</label>
									{#if editRefImage}
										<div class="relative w-20">
											<img
												src={editRefImage}
												alt="Reference"
												class="w-20 h-24 object-cover rounded-lg border border-border"
											/>
											<button
												onclick={() => (editRefImage = '')}
												class="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500/90 text-white hover:bg-red-500 transition-colors"
												aria-label="Remove reference image"
											>
												<X size={10} />
											</button>
										</div>
									{/if}
									<label for="edit-style-prompt" class="text-[10px] text-muted-foreground block">
										Style Prompt
									</label>
									<textarea
										id="edit-style-prompt"
										bind:value={editStylePrompt}
										rows={3}
										placeholder="Visual prompt injected into every scene this character appears in…"
										class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-lg px-2.5 py-2 resize-none outline-none focus:border-primary/40"
									></textarea>
									<button
										onclick={() => generatePrompt('edit')}
										disabled={generatingPrompt}
										class="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary/10 border border-primary/25 text-[#d4a853] hover:bg-primary/15 disabled:opacity-40 text-xs transition-colors"
									>
										{#if generatingPrompt}
											<LoaderCircle size={13} class="animate-spin" />
											Generating…
										{:else}
											<Wand2 size={13} />
											Generate style prompt
										{/if}
									</button>
								</div>
							</div>
						{/if}
					</div>
					<div class="flex gap-2 px-3.5 py-3 border-t border-white/5 mt-3">
						<button
							onclick={() => (editingId = null)}
							class="flex-1 py-2 rounded-lg bg-white/5 border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
						>
							Cancel
						</button>
						<button
							onclick={saveEdit}
							class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-[#d4a853] text-xs transition-colors"
						>
							<Check size={13} /> Save
						</button>
					</div>
				{:else}
					<div
						class="rounded-xl border {cfg.border} {cfg.bg} overflow-hidden transition-all {highlights[
							card.id
						] === 'new'
							? 'card-new'
							: highlights[card.id] === 'updated'
								? 'card-updated'
								: ''}"
					>
						<div
							role="button"
							tabindex="0"
							onclick={() => (openCardId = openCardId === card.id ? null : card.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openCardId = openCardId === card.id ? null : card.id;
								}
							}}
							class="w-full flex items-center justify-between px-3.5 py-3 text-left cursor-pointer"
						>
							<div class="flex items-center gap-2.5 min-w-0">
								<span class={cfg.color}>
									<cfg.icon size={13} />
								</span>
								<span class="text-sm text-foreground truncate">{card.title}</span>
							</div>
							<span class="ml-2 shrink-0 flex items-center gap-0.5">
								<button
									onclick={(e) => {
										e.stopPropagation();
										startEdit(card);
									}}
									class="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
									aria-label="Edit card"
								>
									<Pencil size={12} />
								</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										ondeletecard(card.id);
									}}
									class="p-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/8 transition-colors"
									aria-label="Delete card"
								>
									<Trash2 size={12} />
								</button>
								<span class={cfg.color} class:opacity-60={openCardId !== card.id}>
									{#if openCardId === card.id}
										<ChevronUp size={13} />
									{:else}
										<ChevronDown size={13} />
									{/if}
								</span>
							</span>
						</div>

						{#if openCardId === card.id && (visibleFields(card).length > 0 || card.fields?.referenceImage || card.fields?.stylePrompt)}
							<div class="px-3.5 pb-3 pt-0 space-y-1.5 border-t border-white/5">
								{#if isCharacter(card.type) && card.fields?.referenceImage}
									<img
										src={card.fields.referenceImage}
										alt={card.title}
										class="w-16 h-20 object-cover rounded-lg border border-border"
									/>
								{/if}
								{#if isCharacter(card.type) && card.fields?.stylePrompt}
									<div class="flex items-baseline gap-2">
										<span class="text-[11px] text-muted-foreground shrink-0 w-28 truncate"
											>Style Prompt</span
										>
										<span class="text-[11px] text-[#b8b4aa] leading-relaxed"
											>{card.fields.stylePrompt}</span
										>
									</div>
								{/if}
								{#each visibleFields(card) as [key, value] (key)}
									<div class="flex items-baseline gap-2">
										<span class="text-[11px] text-muted-foreground shrink-0 w-28 truncate"
											>{key}</span
										>
										<span class="text-[11px] text-[#b8b4aa] leading-relaxed">{value}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{/if}
	</div>

	{#if autogenOpen}
		<div class="px-3 py-3 border-t border-border space-y-2">
			<textarea
				bind:value={premise}
				rows={3}
				placeholder="Describe your story premise so the AI can generate context cards…"
				class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl px-3 py-2.5 resize-none outline-none focus:border-primary/40"
			></textarea>
			<div class="flex gap-2">
				<button
					onclick={toggleAutogen}
					class="flex-1 py-2 rounded-lg bg-white/5 border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={submitAutogen}
					disabled={!premise.trim()}
					class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-[#d4a853] disabled:opacity-30 text-xs transition-colors"
				>
					<Wand2 size={13} />
					Generate
				</button>
			</div>
		</div>
	{:else if !adding && !editingId}
		<div class="px-3 py-3 border-t border-border flex gap-2">
			<button
				onclick={toggleAutogen}
				class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 border border-primary/25 text-[#d4a853] hover:bg-primary/15 text-xs transition-colors"
			>
				<Wand2 size={13} />
				Auto-generate
			</button>
			<button
				onclick={startAdd}
				class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-border text-[#b8b4aa] hover:bg-white/8 hover:text-foreground text-xs transition-colors"
			>
				<Plus size={13} />
				Add Card
			</button>
		</div>
	{:else}
		<div class="px-3 py-3 border-t border-border flex justify-center">
			<button
				onclick={closeForms}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				Cancel
			</button>
		</div>
	{/if}
</div>
