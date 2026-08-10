<script lang="ts">
	import type { APIEntry, FeatureRouting } from '$lib/types';
	import * as db from '$lib/services/db';
	import { uuid } from '$lib/utils';
	import { addToast } from '$lib/stores';
	import { NIM_MODELS } from '$lib/services/imageGen';
	import {
		X,
		Plus,
		Trash2,
		Pencil,
		AlertTriangle,
		ChevronRight,
		Check,
		QrCode
	} from '@lucide/svelte';
	import QRScannerModal from './QRScannerModal.svelte';

	let { onclose }: { onclose: () => void } = $props();

	type View = 'overview' | 'stepper';
	type Capabilities = { text?: boolean; image?: boolean };

	let view = $state<View>('overview');
	let config = $state<db.AppConfig | null>(null);

	let maxTokens = $state(2048);
	let temperature = $state(0.85);
	let artStyle = $state('');

	$effect(() => {
		db.getConfig().then((cfg) => {
			config = cfg;
			maxTokens = cfg.maxTokens ?? 2048;
			temperature = cfg.temperature ?? 0.85;
			artStyle = cfg.artStyle ?? '';
		});
	});

	const PROVIDERS = [
		{
			id: 'openrouter',
			name: 'OpenRouter',
			description: 'Cloud · Text · Free & paid models',
			host: 'cloud' as const,
			color: '#7c6dd8',
			placeholder: 'e.g. mistralai/mistral-7b-instruct'
		},
		{
			id: 'nim',
			name: 'NVIDIA NIM',
			description: 'Cloud · Image · NVIDIA API',
			host: 'cloud' as const,
			color: '#76b900',
			placeholder: 'e.g. black-forest-labs/flux.1-dev'
		},
		{
			id: 'lmstudio',
			name: 'LM Studio',
			description: 'Local · Text · GUI app',
			host: 'local' as const,
			color: '#4ab5a3',
			placeholder: 'e.g. lmstudio-community/meta-llama-3'
		},
		{
			id: 'ollama',
			name: 'Ollama',
			description: 'Local · Text · CLI',
			host: 'local' as const,
			color: '#c8922a',
			placeholder: 'e.g. llama3, mistral, phi3'
		},
		{
			id: 'comfyui',
			name: 'ComfyUI',
			description: 'Local · Image · Node workflow server',
			host: 'local' as const,
			color: '#d45d2b',
			placeholder: 'e.g. sd_xl_base_1.0.safetensors'
		}
	];

	const ROUTING_ROWS: { key: keyof FeatureRouting; label: string }[] = [
		{ key: 'story', label: 'Story Generation' },
		{ key: 'cards', label: 'Card Extraction' },
		{ key: 'prompts', label: 'Style Prompts' },
		{ key: 'image', label: 'Image Generation' }
	];

	const TEXT_FEATURES: { key: keyof FeatureRouting; label: string }[] = [
		{ key: 'story', label: 'Story Generation' },
		{ key: 'cards', label: 'Card Extraction' },
		{ key: 'prompts', label: 'Style Prompts' }
	];

	const IMAGE_FEATURES: { key: keyof FeatureRouting; label: string }[] = [
		{ key: 'image', label: 'Image Generation' }
	];

	const LOCAL_DEFAULT_PORT: Record<string, string> = {
		lmstudio: '1234',
		ollama: '11434',
		comfyui: '8188'
	};

	let providerBadge = (p: string) =>
		p === 'openrouter'
			? 'OR'
			: p === 'nim'
				? 'NI'
				: p === 'lmstudio'
					? 'LS'
					: p === 'ollama'
						? 'OL'
						: p === 'comfyui'
							? 'CF'
							: '?';

	function isTextEntry(e: APIEntry) {
		return !!e.capabilities?.text;
	}

	function isImageEntry(e: APIEntry) {
		return !!e.capabilities?.image;
	}

	// ── Overview actions ─────────────────────

	function removeConnection(id: string) {
		if (!config) return;
		const apiEntries = (config.apiEntries ?? []).filter((e) => e.id !== id);
		const featureRouting = { ...(config.featureRouting ?? {}) };
		(Object.keys(featureRouting) as (keyof FeatureRouting)[]).forEach((k) => {
			if (featureRouting[k] === id) delete featureRouting[k];
		});
		db.saveConfig({ apiEntries, featureRouting }).then((c) => (config = c));
	}

	function setRouting(key: keyof FeatureRouting, value: string) {
		if (!config) return;
		const featureRouting = {
			...(config.featureRouting ?? {}),
			[key]: value === 'auto' ? undefined : value
		};
		db.saveConfig({ featureRouting }).then((c) => (config = c));
	}

	function saveDefaults() {
		if (!config) return;
		db.saveConfig({ maxTokens, temperature, artStyle }).then((c) => (config = c));
	}

	// ── Stepper state ────────────────────────

	const STEPS = ['Provider', 'Credentials', 'Model', 'Assign'];

	let step = $state(0);
	let showQR = $state(false);
	let editingEntryId = $state<string | null>(null);
	let selectedProvider = $state<string | null>(null);
	let label = $state('');
	let host = $state('localhost');
	let port = $state('11434');
	let apiKey = $state('');
	let model = $state('');
	let entryCapabilities = $state<Capabilities>({ text: true });
	let assignments = $state<Record<string, boolean>>({ story: true, cards: true, prompts: false });

	let prov = $derived(PROVIDERS.find((p) => p.id === selectedProvider) ?? null);
	let isLocal = $derived(prov?.host === 'local');

	let assignableFeatures = $derived(
		entryCapabilities.text ? TEXT_FEATURES : entryCapabilities.image ? IMAGE_FEATURES : []
	);

	type DiscoveredModel = { id: string; name: string; free: boolean };

	let discoveredModels = $state<DiscoveredModel[]>([]);
	let discoveringModels = $state(false);

	// Auto-discover models when entering step 2
	$effect(() => {
		if (step === 2) {
			if (isLocal && host) {
				discoverModels();
			} else if (!isLocal && apiKey) {
				discoverModels();
			}
		}
	});

	let canNext = $derived(
		(step === 0 && selectedProvider !== null) ||
			step === 1 ||
			(step === 2 && model.trim() !== '') ||
			step === 3
	);

	function selectProvider(id: string) {
		selectedProvider = id;
		const image = id === 'nim' || id === 'comfyui';
		entryCapabilities = image ? { image: true } : { text: true };
		assignments = image ? { image: true } : { story: true, cards: true, prompts: false };
		port = LOCAL_DEFAULT_PORT[id] || port;
	}

	function parseHostPort(url: string) {
		const m = url.match(/^https?:\/\/([^:/]+)(?::(\d+))?/);
		return { host: m?.[1] || 'localhost', port: m?.[2] || '' };
	}

	function startAdd() {
		view = 'stepper';
		step = 0;
		editingEntryId = null;
		selectedProvider = null;
		label = '';
		host = 'localhost';
		port = '11434';
		apiKey = '';
		model = '';
		entryCapabilities = { text: true };
		assignments = { story: true, cards: true, prompts: false };
		discoveredModels = [];
	}

	function startEdit(entry: APIEntry) {
		const split = parseHostPort(entry.host || '');
		view = 'stepper';
		step = 0;
		editingEntryId = entry.id;
		selectedProvider = entry.provider;
		entryCapabilities = entry.capabilities || { text: true };
		label = entry.label || '';
		host = split.host;
		port = split.port || LOCAL_DEFAULT_PORT[entry.provider] || '11434';
		apiKey = entry.apiKey || '';
		model = entry.model;

		const routing = config?.featureRouting ?? {};
		if (entryCapabilities.text) {
			assignments = {
				story: routing.story === entry.id,
				cards: routing.cards === entry.id,
				prompts: routing.prompts === entry.id
			};
		} else {
			assignments = { image: routing.image === entry.id };
		}
	}

	function resetStepper() {
		step = 0;
		editingEntryId = null;
		selectedProvider = null;
		label = '';
		host = 'localhost';
		port = '11434';
		apiKey = '';
		model = '';
		entryCapabilities = { text: true };
		assignments = { story: true, cards: true, prompts: false };
	}

	function handleQRScan(url: string) {
		showQR = false;
		try {
			const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
			host = parsed.hostname || host;
			if (parsed.port) port = parsed.port;
			addToast('QR code scanned', 'success');
		} catch {
			host = url;
		}
	}

	async function discoverModels() {
		discoveringModels = true;
		discoveredModels = [];
		try {
			let models: DiscoveredModel[] = [];
			if (selectedProvider === 'ollama') {
				const baseUrl = `http://${host}:${port}`;
				const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
				if (res.ok) {
					const data = await res.json();
					models = (data.models ?? []).map((m: { name: string }) => ({
						id: m.name,
						name: m.name,
						free: true
					}));
				}
			} else if (selectedProvider === 'lmstudio') {
				const baseUrl = `http://${host}:${port}`;
				const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(5000) });
				if (res.ok) {
					const data = await res.json();
					models = (data.data ?? []).map((m: { id: string }) => ({
						id: m.id,
						name: m.id,
						free: true
					}));
				}
			} else if (selectedProvider === 'openrouter' && apiKey) {
				const res = await fetch('https://openrouter.ai/api/v1/models', {
					headers: { Authorization: `Bearer ${apiKey}` },
					signal: AbortSignal.timeout(10000)
				});
				if (res.ok) {
					const data = await res.json();
					models = (data.data ?? []).map(
						(m: {
							id: string;
							name: string;
							pricing?: { prompt?: string; completion?: string };
						}) => ({
							id: m.id,
							name: m.name || m.id,
							free: m.pricing?.prompt === '0' && m.pricing?.completion === '0'
						})
					);
					models.sort((a, b) =>
						a.free === b.free ? a.name.localeCompare(b.name) : a.free ? -1 : 1
					);
				}
			} else if (selectedProvider === 'nim' && apiKey) {
				try {
					const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
						headers: { Authorization: `Bearer ${apiKey}` },
						signal: AbortSignal.timeout(10000)
					});
					if (res.ok) {
						const data = await res.json();
						models = (data.data ?? []).map((m: { id: string }) => ({
							id: m.id,
							name: m.id,
							free: true
						}));
					}
				} catch {
					// NIM API may be blocked by CORS — fall back to known models
				}
				if (models.length === 0) {
					models = NIM_MODELS.map((m) => ({ id: m.id, name: m.name, free: true }));
				}
			}
			discoveredModels = models;
			if (models.length > 0) {
				addToast(`Found ${models.length} model${models.length === 1 ? '' : 's'}`, 'success');
			}
		} catch {
			// Silently fail — user can still type manually
		} finally {
			discoveringModels = false;
		}
	}

	async function finishAdd() {
		if (!config || !prov) return;
		const entry: APIEntry = {
			id: editingEntryId || uuid(),
			provider: prov.id as APIEntry['provider'],
			host: isLocal ? `http://${host}:${port}` : '',
			apiKey: isLocal ? undefined : apiKey || undefined,
			model: model.trim(),
			label: label.trim() || prov.name,
			capabilities: entryCapabilities
		};

		let apiEntries = [...(config.apiEntries ?? [])];
		if (editingEntryId) {
			apiEntries = apiEntries.map((e) => (e.id === editingEntryId ? entry : e));
		} else {
			apiEntries = [...apiEntries, entry];
		}

		// Persist feature assignments
		const featureRouting = { ...(config.featureRouting ?? {}) };
		for (const feat of assignableFeatures) {
			if (assignments[feat.key]) {
				featureRouting[feat.key] = entry.id;
			} else if (featureRouting[feat.key] === entry.id) {
				delete featureRouting[feat.key];
			}
		}
		if (!entry.capabilities?.text) {
			delete featureRouting.story;
			delete featureRouting.cards;
			delete featureRouting.prompts;
		}
		if (!entry.capabilities?.image) {
			delete featureRouting.image;
		}

		await db.saveConfig({ apiEntries, featureRouting });
		config = await db.getConfig();
		view = 'overview';
		resetStepper();
		addToast(`Saved "${entry.label}"`, 'success');
	}
</script>

<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
	<button
		type="button"
		aria-label="Close settings"
		class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
		onclick={onclose}
	></button>
	<div
		class="relative w-full sm:max-w-lg h-[92dvh] sm:h-[82dvh] rounded-t-2xl sm:rounded-2xl bg-popover border border-border shadow-2xl flex flex-col overflow-hidden"
	>
		<div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
			<div class="flex items-center gap-2">
				{#if view === 'stepper'}
					<button
						onclick={() => (view = 'overview')}
						class="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors mr-1"
					>
						<ChevronRight size={16} class="rotate-180" />
					</button>
				{/if}
				<h2 class="text-foreground">
					{view === 'overview'
						? 'API Settings'
						: editingEntryId
							? 'Edit Connection'
							: 'Add Connection'}
				</h2>
			</div>
			<button
				onclick={onclose}
				class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
			>
				<X size={18} />
			</button>
		</div>

		{#if view === 'overview'}
			<div class="flex flex-col h-full overflow-y-auto px-5 py-4 space-y-5">
				<div
					class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/8 border border-amber-400/20"
				>
					<AlertTriangle size={14} class="text-amber-400 shrink-0 mt-0.5" />
					<p class="text-xs text-amber-400/80 leading-relaxed">
						Everything is stored in your browser. Export backups regularly!
					</p>
				</div>

				<section>
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-xs text-muted-foreground uppercase tracking-widest">Connections</h3>
						<button
							onclick={startAdd}
							class="flex items-center gap-1 text-xs text-primary hover:text-[#d4a853] transition-colors"
						>
							<Plus size={12} /> Add
						</button>
					</div>
					{#if !config || (config.apiEntries ?? []).length === 0}
						<div
							class="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl"
						>
							No connections yet
						</div>
					{:else}
						<div class="space-y-2">
							{#each config.apiEntries as entry (entry.id)}
								{@const p = PROVIDERS.find((x) => x.id === entry.provider)}
								<div
									class="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-white/10 transition-colors"
								>
									<div
										class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
										style="background: {p?.color}18; color: {p?.color}; border: 1px solid {p?.color}30"
									>
										{providerBadge(entry.provider)}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-1.5">
											<span class="text-sm text-foreground truncate">{entry.label}</span>
											<div class="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
										</div>
										<div class="flex items-center gap-1.5 mt-0.5">
											<span class="text-[11px] text-muted-foreground truncate">{entry.model}</span>
											{#if isTextEntry(entry)}
												<span
													class="text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide text-blue-400 bg-blue-400/10 border-blue-400/20"
												>
													text
												</span>
											{/if}
											{#if isImageEntry(entry)}
												<span
													class="text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide text-green-400 bg-green-400/10 border-green-400/20"
												>
													image
												</span>
											{/if}
										</div>
									</div>
									<div class="flex gap-1 shrink-0">
										<button
											onclick={() => startEdit(entry)}
											class="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
										>
											<Pencil size={13} />
										</button>
										<button
											onclick={() => removeConnection(entry.id)}
											class="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/8 transition-colors"
										>
											<Trash2 size={13} />
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<section>
					<h3 class="text-xs text-muted-foreground uppercase tracking-widest mb-2">
						Feature Routing
					</h3>
					<div class="space-y-2">
						{#each ROUTING_ROWS as row (row.key)}
							{@const entries = (config?.apiEntries ?? []).filter((e) =>
								row.key === 'image' ? isImageEntry(e) : isTextEntry(e)
							)}
							<div class="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
								<span class="text-sm text-[#b8b4aa] flex-1">{row.label}</span>
								<select
									value={config?.featureRouting?.[row.key] ?? 'auto'}
									onchange={(e) => setRouting(row.key, e.currentTarget.value)}
									class="bg-input-background border border-border text-foreground text-xs rounded-lg px-2 py-1.5 outline-none focus:border-primary/40 max-w-[140px]"
								>
									<option value="auto">Auto (first available)</option>
									{#each entries as entry (entry.id)}
										<option value={entry.id}>{entry.label}</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
				</section>

				<section>
					<h3 class="text-xs text-muted-foreground uppercase tracking-widest mb-2">Defaults</h3>
					<div class="space-y-2">
						<div class="p-2.5 rounded-xl bg-card border border-border">
							<div class="text-[10px] text-muted-foreground mb-1.5">Default Art Style</div>
							<input
								type="text"
								bind:value={artStyle}
								placeholder="e.g. dark fantasy ink, manhwa, cinematic, studio ghibli…"
								onchange={saveDefaults}
								class="w-full bg-input-background border border-border text-foreground text-sm h-8 rounded-lg px-2 outline-none focus:border-primary/40"
							/>
							<p class="text-[10px] text-muted-foreground/60 mt-1">
								Applied to every image generation prompt.
							</p>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div class="p-2.5 rounded-xl bg-card border border-border">
								<div class="text-[10px] text-muted-foreground mb-1.5">Max Tokens</div>
								<input
									type="number"
									min={256}
									max={8192}
									bind:value={maxTokens}
									onchange={saveDefaults}
									class="w-full bg-input-background border border-border text-foreground text-sm h-8 rounded-lg px-2 outline-none focus:border-primary/40"
								/>
							</div>
							<div class="p-2.5 rounded-xl bg-card border border-border">
								<div class="text-[10px] text-muted-foreground mb-1.5">Temperature</div>
								<input
									type="number"
									min={0}
									max={2}
									step={0.05}
									bind:value={temperature}
									onchange={saveDefaults}
									class="w-full bg-input-background border border-border text-foreground text-sm h-8 rounded-lg px-2 outline-none focus:border-primary/40"
								/>
							</div>
						</div>
					</div>
				</section>

				<div class="pb-4"></div>
			</div>
		{:else}
			<div class="flex flex-col h-full">
				<div class="px-5 py-4 border-b border-border">
					<div class="flex items-center gap-1">
						{#each STEPS as stepLabel, i (stepLabel)}
							<div class="flex items-center gap-1 flex-1">
								<div
									class="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0
										{i < step
										? 'bg-primary text-primary-foreground'
										: i === step
											? 'bg-primary/20 border-2 border-primary text-primary'
											: 'bg-secondary border border-border text-muted-foreground'}"
								>
									{#if i < step}
										<Check size={11} />
									{:else}
										{i + 1}
									{/if}
								</div>
								{#if i < STEPS.length - 1}
									<div class="flex-1 h-px {i < step ? 'bg-primary/40' : 'bg-border'}"></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<div class="flex-1 overflow-y-auto px-5 py-4">
					{#if step === 0}
						<div class="space-y-2">
							<p class="text-xs text-muted-foreground mb-3">Choose your API provider</p>
							{#each PROVIDERS as p (p.id)}
								<button
									onclick={() => selectProvider(p.id)}
									class="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
										{selectedProvider === p.id
										? 'border-primary/40 bg-primary/8'
										: 'border-border bg-card hover:border-white/14'}"
								>
									<div
										class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
										style="background: {p.color}18; color: {p.color}; border: 1px solid {p.color}30"
									>
										{providerBadge(p.id)}
									</div>
									<div class="flex-1 min-w-0">
										<div class="text-sm text-foreground">{p.name}</div>
										<div class="text-[11px] text-muted-foreground mt-0.5">
											{p.description}
										</div>
									</div>
									{#if selectedProvider === p.id}
										<Check size={15} class="text-primary shrink-0" />
									{/if}
								</button>
							{/each}
						</div>
					{:else if step === 1}
						<div class="space-y-3">
							<p class="text-xs text-muted-foreground mb-1">
								{isLocal ? 'Enter the local server address' : 'Enter your API credentials'}
							</p>
							<div>
								<label for="api-label" class="text-xs text-muted-foreground block mb-1.5"
									>Label</label
								>
								<input
									id="api-label"
									bind:value={label}
									placeholder={prov?.name}
									class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
								/>
							</div>
							{#if isLocal}
								<div class="flex items-end gap-2">
									<div class="flex-1">
										<label for="api-host" class="text-xs text-muted-foreground block mb-1.5"
											>Host</label
										>
										<input
											id="api-host"
											bind:value={host}
											placeholder="localhost"
											class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
										/>
									</div>
									<div class="w-24">
										<label for="api-port" class="text-xs text-muted-foreground block mb-1.5"
											>Port</label
										>
										<input
											id="api-port"
											bind:value={port}
											placeholder="11434"
											class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
										/>
									</div>
									<button
										onclick={() => (showQR = true)}
										title="Scan QR code to fill server address"
										class="shrink-0 p-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors mb-0.5"
									>
										<QrCode size={16} />
									</button>
								</div>
							{:else}
								<div>
									<label for="api-key" class="text-xs text-muted-foreground block mb-1.5"
										>API Key</label
									>
									<input
										id="api-key"
										type="password"
										bind:value={apiKey}
										placeholder={prov?.id === 'nim' ? 'nvapi-...' : 'sk-...'}
										class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
									/>
								</div>
							{/if}
						</div>
					{:else if step === 2 && prov}
						<div class="space-y-3">
							<p class="text-xs text-muted-foreground">
								{#if discoveringModels}
									Discovering available models...
								{:else if discoveredModels.length > 0}
									{@const freeCount = discoveredModels.filter((m) => m.free).length}
									Found {discoveredModels.length} model{discoveredModels.length === 1
										? ''
										: 's'}{#if freeCount > 0}
										({freeCount} free){/if}
									— select or type a model name
								{:else}
									Enter the model to use
								{/if}
							</p>
							<div>
								<label for="api-model" class="text-xs text-muted-foreground block mb-1.5"
									>Model</label
								>
								<input
									id="api-model"
									bind:value={model}
									placeholder={prov.placeholder}
									list={discoveredModels.length > 0 ? 'discovered-models' : undefined}
									class="w-full bg-input-background border border-border text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
								/>
								{#if discoveredModels.length > 0}
									<datalist id="discovered-models">
										{#each discoveredModels as m (m.id)}
											<option value={m.id}>{m.name}{m.free ? ' (free)' : ''}</option>
										{/each}
									</datalist>
								{/if}
								<p class="text-[10px] text-muted-foreground/60 mt-1.5">
									Use the model name exactly as your provider expects it.
								</p>
							</div>
							{#if model}
								<div
									class="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-400/8 border border-emerald-400/20"
								>
									<div class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
									<span class="text-xs text-emerald-400">Model accepted</span>
								</div>
							{/if}
						</div>
					{:else if step === 3}
						<div class="space-y-3">
							<p class="text-xs text-muted-foreground">Choose how this connection will be used</p>
							<div class="space-y-2">
								{#each assignableFeatures as feat (feat.key)}
									<button
										onclick={() =>
											(assignments = { ...assignments, [feat.key]: !assignments[feat.key] })}
										class="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all
											{assignments[feat.key]
											? 'bg-primary/10 border-primary/35 text-[#d4a853]'
											: 'bg-card border-border text-[#b8b4aa] hover:border-white/14'}"
									>
										<div
											class="w-4 h-4 rounded flex items-center justify-center border
												{assignments[feat.key] ? 'bg-primary border-primary' : 'border-white/20'}"
										>
											{#if assignments[feat.key]}
												<Check size={10} class="text-primary-foreground" />
											{/if}
										</div>
										<span class="text-sm">{feat.label}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="px-5 py-4 border-t border-border flex gap-3">
					<button
						onclick={step === 0 ? onclose : () => step--}
						class="flex-1 py-2.5 rounded-xl bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:bg-white/8 text-sm transition-colors"
					>
						{step === 0 ? 'Cancel' : 'Back'}
					</button>
					<button
						onclick={step === 3 ? finishAdd : () => step++}
						disabled={!canNext}
						class="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#d4a853] text-primary-foreground text-sm disabled:opacity-30 transition-colors"
					>
						{step === 3 ? 'Finish' : 'Next'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showQR}
	<QRScannerModal onclose={() => (showQR = false)} onscan={handleQRScan} />
{/if}
