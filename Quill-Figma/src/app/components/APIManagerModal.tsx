import { useState } from 'react';
import {
  X, Plus, Trash2, Pencil, Wifi, WifiOff, AlertTriangle, Camera, Scan,
  ChevronRight, ChevronDown, Check, RefreshCw, Loader2,
} from 'lucide-react';
import { Input } from './ui/input';

// ── Types ──────────────────────────────────────────────────────────────────
type Capability = 'text' | 'image';
type ProviderKind = 'openrouter' | 'nvidia' | 'lmstudio' | 'ollama' | 'comfyui';

interface APIConnection {
  id: string;
  provider: ProviderKind;
  label: string;
  model: string;
  capabilities: Capability[];
  status: 'online' | 'offline' | 'unknown';
}

interface RoutingConfig {
  storyGeneration: string;
  cardExtraction: string;
  stylePrompts: string;
  imageGeneration: string;
}

// ── Provider metadata ──────────────────────────────────────────────────────
const PROVIDERS: Record<ProviderKind, {
  name: string;
  description: string;
  host: 'cloud' | 'local';
  capabilities: Capability[];
  color: string;
  placeholder: string;
}> = {
  openrouter: {
    name: 'OpenRouter',
    description: 'Cloud · Text · Free & paid models',
    host: 'cloud',
    capabilities: ['text'],
    color: '#7c6dd8',
    placeholder: 'e.g. mistralai/mistral-7b-instruct',
  },
  nvidia: {
    name: 'NVIDIA NIM',
    description: 'Cloud · Image · FLUX & SDXL',
    host: 'cloud',
    capabilities: ['image'],
    color: '#76b900',
    placeholder: 'e.g. stabilityai/stable-diffusion-xl-base-1.0',
  },
  lmstudio: {
    name: 'LM Studio',
    description: 'Local · Text · GUI app',
    host: 'local',
    capabilities: ['text'],
    color: '#4ab5a3',
    placeholder: 'e.g. lmstudio-community/meta-llama-3',
  },
  ollama: {
    name: 'Ollama',
    description: 'Local · Text · CLI',
    host: 'local',
    capabilities: ['text'],
    color: '#c8922a',
    placeholder: 'e.g. llama3, mistral, phi3',
  },
  comfyui: {
    name: 'ComfyUI',
    description: 'Local · Image · Workflows',
    host: 'local',
    capabilities: ['image'],
    color: '#d4618a',
    placeholder: 'Workflow node name',
  },
};

const ROUTING_ROWS: { key: keyof RoutingConfig; label: string; cap: Capability }[] = [
  { key: 'storyGeneration', label: 'Story Generation', cap: 'text' },
  { key: 'cardExtraction', label: 'Card Extraction', cap: 'text' },
  { key: 'stylePrompts', label: 'Style Prompts', cap: 'text' },
  { key: 'imageGeneration', label: 'Image Generation', cap: 'image' },
];

// ── Demo data ──────────────────────────────────────────────────────────────
const DEMO_CONNECTIONS: APIConnection[] = [
  { id: 'c1', provider: 'ollama', label: 'Local Llama', model: 'llama3', capabilities: ['text'], status: 'online' },
  { id: 'c2', provider: 'openrouter', label: 'OpenRouter', model: 'mistralai/mistral-7b-instruct', capabilities: ['text'], status: 'offline' },
];

// ── Sub-components ─────────────────────────────────────────────────────────
function CapBadge({ cap }: { cap: Capability }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide ${
      cap === 'text'
        ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        : 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    }`}>
      {cap}
    </span>
  );
}

function StatusDot({ status }: { status: APIConnection['status'] }) {
  return (
    <div className={`w-1.5 h-1.5 rounded-full ${
      status === 'online' ? 'bg-emerald-400' :
      status === 'offline' ? 'bg-red-400' :
      'bg-[#72708a]'
    }`} />
  );
}

function ConnectionCard({
  conn,
  onEdit,
  onDelete,
}: {
  conn: APIConnection;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const prov = PROVIDERS[conn.provider];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#131318] border border-white/6 hover:border-white/10 transition-colors">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ background: `${prov.color}18`, color: prov.color, border: `1px solid ${prov.color}30` }}
      >
        {conn.provider === 'openrouter' ? 'OR' :
         conn.provider === 'nvidia' ? 'NV' :
         conn.provider === 'lmstudio' ? 'LS' :
         conn.provider === 'ollama' ? 'OL' : 'CF'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#e6e0d4] truncate">{conn.label}</span>
          <StatusDot status={conn.status} />
          <span className="text-[10px] text-[#72708a] hidden sm:inline">
            {conn.status}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-[#72708a] truncate">{conn.model}</span>
          {conn.capabilities.map(c => <CapBadge key={c} cap={c} />)}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/8 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-[#72708a] hover:text-red-400 hover:bg-red-400/8 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Overview view ──────────────────────────────────────────────────────────
function OverviewView({
  connections,
  routing,
  onRouteChange,
  onAddConnection,
  onEditConnection,
  onDeleteConnection,
}: {
  connections: APIConnection[];
  routing: RoutingConfig;
  onRouteChange: (k: keyof RoutingConfig, v: string) => void;
  onAddConnection: () => void;
  onEditConnection: (id: string) => void;
  onDeleteConnection: (id: string) => void;
}) {
  const [maxTokens, setMaxTokens] = useState('1024');
  const [temperature, setTemperature] = useState('0.85');
  const [artStyle, setArtStyle] = useState('');
  const [uncensored, setUncensored] = useState(false);
  const [sanitize, setSanitize] = useState(false);

  const connectionOptions = (cap: Capability) => [
    { value: 'auto', label: 'Auto (first available)' },
    ...connections
      .filter(c => c.capabilities.includes(cap))
      .map(c => ({ value: c.id, label: c.label })),
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 py-4 space-y-5">
      {/* Warning banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/8 border border-amber-400/20">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400/80 leading-relaxed">
          Everything is stored in your browser. Export backups regularly!
        </p>
      </div>

      {/* Connections */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-[#72708a] uppercase tracking-widest">Connections</h3>
          <button
            onClick={onAddConnection}
            className="flex items-center gap-1 text-xs text-[#c8922a] hover:text-[#d4a853] transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {connections.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#72708a] border border-dashed border-white/8 rounded-xl">
            No connections yet
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map(c => (
              <ConnectionCard
                key={c.id}
                conn={c}
                onEdit={() => onEditConnection(c.id)}
                onDelete={() => onDeleteConnection(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Feature Routing */}
      <section>
        <h3 className="text-xs text-[#72708a] uppercase tracking-widest mb-2">Feature Routing</h3>
        <div className="space-y-2">
          {ROUTING_ROWS.map(row => {
            const opts = connectionOptions(row.cap);
            return (
              <div key={row.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#131318] border border-white/6">
                <span className="text-sm text-[#b8b4aa] flex-1">{row.label}</span>
                <select
                  value={routing[row.key] || 'auto'}
                  onChange={e => onRouteChange(row.key, e.target.value)}
                  className="bg-[#1c1c24] border border-white/8 text-[#e6e0d4] text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#c8922a]/40 max-w-[140px]"
                >
                  {opts.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Defaults */}
      <section>
        <h3 className="text-xs text-[#72708a] uppercase tracking-widest mb-2">Defaults</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-[#131318] border border-white/6">
              <div className="text-[10px] text-[#72708a] mb-1.5">Max Tokens</div>
              <Input
                type="number"
                min={256}
                max={8192}
                value={maxTokens}
                onChange={e => setMaxTokens(e.target.value)}
                className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] text-sm h-8 focus-visible:ring-[#c8922a]/40"
              />
            </div>
            <div className="p-2.5 rounded-xl bg-[#131318] border border-white/6">
              <div className="text-[10px] text-[#72708a] mb-1.5">Temperature</div>
              <Input
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] text-sm h-8 focus-visible:ring-[#c8922a]/40"
              />
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#131318] border border-white/6">
            <div className="text-[10px] text-[#72708a] mb-1.5">Default Art Style</div>
            <Input
              value={artStyle}
              onChange={e => setArtStyle(e.target.value)}
              placeholder="e.g. ink illustration, soft watercolor, cinematic..."
              className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] text-sm h-8 placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
            />
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <h3 className="text-xs text-[#72708a] uppercase tracking-widest mb-2">Pipeline</h3>
        <div className="space-y-2">
          {[
            {
              id: 'uncensored',
              label: 'Uncensored rewrite',
              desc: 'Story generation → remote API → rewrite uncensored via local LLM. Requires one remote + one local text connection.',
              value: uncensored,
              onChange: setUncensored,
            },
            {
              id: 'sanitize',
              label: 'Sanitize requests for gated APIs',
              desc: 'Replaces trigger terms with placeholders before sending to OpenRouter/NVIDIA NIM. Restored in response.',
              value: sanitize,
              onChange: setSanitize,
            },
          ].map(item => (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#131318] border border-white/6">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#b8b4aa]">{item.label}</div>
                <p className="text-[11px] text-[#72708a] mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <button
                onClick={() => item.onChange(!item.value)}
                className={`relative shrink-0 w-9 h-5 rounded-full transition-colors mt-0.5 ${item.value ? 'bg-[#c8922a]' : 'bg-[#2a2a38]'}`}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: item.value ? '18px' : '2px' }}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="pb-4" />
    </div>
  );
}

// ── Stepper view ──────────────────────────────────────────────────────────
const STEP_LABELS = ['Provider', 'Credentials', 'Model', 'Assign'];
const CAPABILITIES_CHECKBOXES: { key: string; label: string }[] = [
  { key: 'story', label: 'Story Generation' },
  { key: 'cards', label: 'Card Extraction' },
  { key: 'style', label: 'Style Prompts' },
  { key: 'image', label: 'Image Generation' },
];

function StepperView({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<ProviderKind | null>(null);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('11434');
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');
  const [model, setModel] = useState('');
  const [assignments, setAssignments] = useState<Record<string, boolean>>({});

  const prov = selectedProvider ? PROVIDERS[selectedProvider] : null;
  const isLocal = prov?.host === 'local';

  const canNext =
    (step === 0 && selectedProvider !== null) ||
    (step === 1) ||
    (step === 2 && model.trim() !== '') ||
    step === 3;

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="px-5 py-4 border-b border-white/6">
        <div className="flex items-center gap-1">
          {STEP_LABELS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                i < step ? 'bg-[#c8922a] text-[#0c0c11]' :
                i === step ? 'bg-[#c8922a]/20 border-2 border-[#c8922a] text-[#c8922a]' :
                'bg-[#1c1c24] border border-white/12 text-[#72708a]'
              }`}>
                {i < step ? <Check size={11} /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? 'bg-[#c8922a]/40' : 'bg-white/8'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {STEP_LABELS.map((s, i) => (
            <span key={i} className={`text-[10px] ${i === step ? 'text-[#c8922a]' : 'text-[#72708a]'}`}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {step === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[#72708a] mb-3">Choose your API provider</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(PROVIDERS) as [ProviderKind, typeof PROVIDERS[ProviderKind]][]).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setSelectedProvider(key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedProvider === key
                      ? 'border-[#c8922a]/40 bg-[#c8922a]/8'
                      : 'border-white/8 bg-[#131318] hover:border-white/14'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30` }}
                  >
                    {key === 'openrouter' ? 'OR' :
                     key === 'nvidia' ? 'NV' :
                     key === 'lmstudio' ? 'LS' :
                     key === 'ollama' ? 'OL' : 'CF'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#e6e0d4]">{p.name}</div>
                    <div className="text-[11px] text-[#72708a] mt-0.5">{p.description}</div>
                  </div>
                  {selectedProvider === key && (
                    <Check size={15} className="text-[#c8922a] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-[#72708a] mb-1">
              {isLocal ? 'Enter the local server address' : 'Enter your API credentials'}
            </p>
            <div>
              <label className="text-xs text-[#72708a] block mb-1.5">Label</label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. My Ollama"
                className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
              />
            </div>
            {isLocal ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[#72708a] block mb-1.5">Host</label>
                  <Input
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="localhost"
                    className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-[#72708a] block mb-1.5">Port</label>
                  <Input
                    value={port}
                    onChange={e => setPort(e.target.value)}
                    placeholder="11434"
                    className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <button className="h-9 px-3 rounded-lg bg-[#1c1c24] border border-white/8 text-[#72708a] hover:text-[#e6e0d4] transition-colors">
                    <Scan size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-[#72708a] block mb-1.5">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && prov && (
          <div className="space-y-3">
            <p className="text-xs text-[#72708a]">Enter the model to use</p>
            <div>
              <label className="text-xs text-[#72708a] block mb-1.5">Model</label>
              <div className="relative">
                <Input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder={prov.placeholder}
                  className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 pr-9"
                />
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#72708a] hover:text-[#c8922a] transition-colors">
                  <RefreshCw size={13} />
                </button>
              </div>
              <p className="text-[10px] text-[#72708a]/60 mt-1.5">
                Press refresh to auto-fetch available models from the provider
              </p>
            </div>
            {model && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-400">Model accepted</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-[#72708a]">Choose how this connection will be used</p>
            <div className="space-y-2">
              {CAPABILITIES_CHECKBOXES.map(cb => (
                <button
                  key={cb.key}
                  onClick={() => setAssignments(a => ({ ...a, [cb.key]: !a[cb.key] }))}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                    assignments[cb.key]
                      ? 'bg-[#c8922a]/10 border-[#c8922a]/35 text-[#d4a853]'
                      : 'bg-[#131318] border-white/8 text-[#b8b4aa] hover:border-white/14'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                    assignments[cb.key] ? 'bg-[#c8922a] border-[#c8922a]' : 'border-white/20'
                  }`}>
                    {assignments[cb.key] && <Check size={10} className="text-[#0c0c11]" />}
                  </div>
                  <span className="text-sm">{cb.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <button
          onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}
          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/8 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/8 text-sm transition-colors"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          onClick={step === 3 ? onDone : () => setStep(s => s + 1)}
          disabled={!canNext}
          className="flex-1 py-2.5 rounded-xl bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] text-sm disabled:opacity-30 transition-colors"
        >
          {step === 3 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
interface APIManagerModalProps {
  onClose: () => void;
}

export function APIManagerModal({ onClose }: APIManagerModalProps) {
  const [view, setView] = useState<'overview' | 'stepper'>('overview');
  const [connections, setConnections] = useState<APIConnection[]>(DEMO_CONNECTIONS);
  const [routing, setRouting] = useState<RoutingConfig>({
    storyGeneration: 'auto',
    cardExtraction: 'auto',
    stylePrompts: 'auto',
    imageGeneration: 'auto',
  });

  const handleRouteChange = (k: keyof RoutingConfig, v: string) =>
    setRouting(r => ({ ...r, [k]: v }));

  const handleDeleteConnection = (id: string) =>
    setConnections(cs => cs.filter(c => c.id !== id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg h-[92vh] sm:h-[82vh] rounded-t-2xl sm:rounded-2xl bg-[#18181f] border border-white/8 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 shrink-0">
          <div className="flex items-center gap-2">
            {view === 'stepper' && (
              <button
                onClick={() => setView('overview')}
                className="p-1 rounded-md text-[#72708a] hover:text-[#e6e0d4] transition-colors mr-1"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            <h2 className="text-[#e6e0d4]">
              {view === 'overview' ? 'API Settings' : 'Add Connection'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* View content */}
        <div className="flex-1 min-h-0">
          {view === 'overview' ? (
            <OverviewView
              connections={connections}
              routing={routing}
              onRouteChange={handleRouteChange}
              onAddConnection={() => setView('stepper')}
              onEditConnection={() => setView('stepper')}
              onDeleteConnection={handleDeleteConnection}
            />
          ) : (
            <StepperView
              onDone={() => setView('overview')}
              onCancel={() => setView('overview')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
