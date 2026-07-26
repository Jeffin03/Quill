import { useState, useRef } from 'react';
import { X, Plus, Trash2, Wand2, Camera, ImagePlus, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import type { Story, ContextCard, LLMSettings, StorySegment } from '../types';

// ─── Shared Modal Shell ────────────────────────────────────────────────────
function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#18181f] border border-white/8 shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
      <h2 className="text-[#e6e0d4]">{title}</h2>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}

// ─── New / Edit Story Modal ────────────────────────────────────────────────
const GENRES = [
  'Romance', 'Dark Romance', 'Fantasy', 'Thriller', 'Angst',
  'Hurt/Comfort', 'Slice of Life', 'Action', 'Horror', 'Mystery', 'General Fiction',
];
const PACING_OPTIONS = ['Slow Burn', 'Moderate', 'Fast', 'Natural'];

interface StoryModalProps {
  initialData?: Partial<Story>;
  onSave: (data: { title: string; genres: string[]; pacing: string; tone: string }) => void;
  onClose: () => void;
}

export function StoryModal({ initialData, onSave, onClose }: StoryModalProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [genres, setGenres] = useState<string[]>(initialData?.genres ?? []);
  const [pacing, setPacing] = useState(initialData?.pacing ?? 'Natural');
  const [tone, setTone] = useState(initialData?.tone ?? '');
  const isEditing = !!initialData?.id;

  const toggleGenre = (g: string) =>
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), genres, pacing, tone });
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title={isEditing ? 'Edit Story' : 'New Story'} onClose={onClose} />
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give your story a name..."
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Genre</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1 rounded-full text-xs transition-all border ${
                  genres.includes(g)
                    ? 'bg-[#c8922a]/20 border-[#c8922a]/50 text-[#d4a853]'
                    : 'bg-white/4 border-white/8 text-[#72708a] hover:border-white/15 hover:text-[#e6e0d4]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Pacing</label>
          <div className="grid grid-cols-2 gap-2">
            {PACING_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => setPacing(p)}
                className={`py-2 px-3 rounded-lg text-sm border transition-all ${
                  pacing === p
                    ? 'bg-[#c8922a]/15 border-[#c8922a]/40 text-[#d4a853]'
                    : 'bg-white/4 border-white/8 text-[#72708a] hover:border-white/15 hover:text-[#e6e0d4]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Tone <span className="text-[#72708a]/60">(optional)</span></label>
          <Input
            value={tone}
            onChange={e => setTone(e.target.value)}
            placeholder="e.g. atmospheric, tender, gritty..."
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] disabled:opacity-40"
        >
          {isEditing ? 'Save Changes' : 'Create Story'}
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── LLM Settings Modal ───────────────────────────────────────────────────
interface LLMSettingsModalProps {
  settings: LLMSettings;
  onSave: (s: LLMSettings) => void;
  onClose: () => void;
}

export function LLMSettingsModal({ settings, onSave, onClose }: LLMSettingsModalProps) {
  const [form, setForm] = useState({ ...settings });

  const set = (k: keyof LLMSettings, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="LLM Connection" onClose={onClose} />
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="p-3 rounded-lg bg-[#1c1c24] border border-white/6 text-xs text-[#72708a] leading-relaxed">
          Your settings are stored locally on this device only. No data is sent to Quill's servers.
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">API URL</label>
          <div className="flex gap-2">
            <Input
              value={form.apiUrl}
              onChange={e => set('apiUrl', e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="flex-1 bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
            />
            <button
              className="px-3 rounded-lg bg-[#1c1c24] border border-white/8 text-[#72708a] hover:text-[#e6e0d4] hover:border-white/15 transition-colors"
              title="Scan QR code"
            >
              <Camera size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Model</label>
          <Input
            value={form.model}
            onChange={e => set('model', e.target.value)}
            placeholder="e.g. llama3, mistral, gpt-4o..."
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">API Key <span className="text-[#72708a]/60">(if required)</span></label>
          <Input
            type="password"
            value={form.apiKey}
            onChange={e => set('apiKey', e.target.value)}
            placeholder="sk-..."
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm text-[#72708a]">Max Tokens</label>
            <Input
              type="number"
              min={256}
              max={8192}
              value={form.maxTokens}
              onChange={e => set('maxTokens', parseInt(e.target.value) || 1024)}
              className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] focus-visible:ring-[#c8922a]/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[#72708a]">Temperature</label>
            <Input
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={form.temperature}
              onChange={e => set('temperature', parseFloat(e.target.value) || 0.85)}
              className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] focus-visible:ring-[#c8922a]/40"
            />
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={() => { onSave(form); onClose(); }}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11]"
        >
          Save
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Add Card Modal ────────────────────────────────────────────────────────
const CARD_TYPES: ContextCard['type'][] = ['character', 'relationship', 'plot', 'world', 'arc'];
const CARD_TYPE_LABELS: Record<ContextCard['type'], string> = {
  character: 'Character',
  relationship: 'Relationship',
  plot: 'Plot',
  world: 'World',
  arc: 'Arc',
};

interface AddCardModalProps {
  onAdd: (card: Omit<ContextCard, 'id'>) => void;
  onClose: () => void;
}

export function AddCardModal({ onAdd, onClose }: AddCardModalProps) {
  const [type, setType] = useState<ContextCard['type']>('character');
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  const addField = () => setFields(prev => [...prev, { key: '', value: '' }]);
  const removeField = (i: number) => setFields(prev => prev.filter((_, idx) => idx !== i));
  const updateField = (i: number, k: 'key' | 'value', v: string) =>
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, [k]: v } : f));

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ type, title: title.trim(), fields: fields.filter(f => f.key.trim()) });
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Add Context Card" onClose={onClose} />
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Type</label>
          <div className="flex flex-wrap gap-2">
            {CARD_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  type === t
                    ? 'bg-[#c8922a]/20 border-[#c8922a]/50 text-[#d4a853]'
                    : 'bg-white/4 border-white/8 text-[#72708a] hover:border-white/15 hover:text-[#e6e0d4]'
                }`}
              >
                {CARD_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Card name..."
            autoFocus
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Fields</label>
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={f.key}
                onChange={e => updateField(i, 'key', e.target.value)}
                placeholder="Field name"
                className="flex-1 bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 text-sm"
              />
              <Input
                value={f.value}
                onChange={e => updateField(i, 'value', e.target.value)}
                placeholder="Value"
                className="flex-[2] bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 text-sm"
              />
              <button
                onClick={() => removeField(i)}
                disabled={fields.length === 1}
                className="p-1.5 text-[#72708a] hover:text-red-400 transition-colors disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addField}
            className="flex items-center gap-1.5 text-xs text-[#c8922a] hover:text-[#d4a853] transition-colors"
          >
            <Plus size={13} /> Add Field
          </button>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          disabled={!title.trim()}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] disabled:opacity-40"
        >
          Add Card
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Auto Generate Cards Modal ─────────────────────────────────────────────
interface AutoGenerateModalProps {
  onGenerate: (premise: string) => void;
  onClose: () => void;
}

export function AutoGenerateModal({ onGenerate, onClose }: AutoGenerateModalProps) {
  const [premise, setPremise] = useState('');

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Generate Context Cards" onClose={onClose} />
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-[#72708a] leading-relaxed">
          Paste your story premise, prologue, or character ideas below. Quill will analyze it and automatically build your starting Context Cards.
        </p>
        <Textarea
          value={premise}
          onChange={e => setPremise(e.target.value)}
          placeholder="Two enemies trapped in a lighthouse during a storm discover they share a secret that changes everything..."
          rows={7}
          className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 resize-none"
          autoFocus
        />
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={() => { if (premise.trim()) { onGenerate(premise.trim()); onClose(); } }}
          disabled={!premise.trim()}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] gap-2 disabled:opacity-40"
        >
          <Wand2 size={15} />
          Generate Cards
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Delete / Rewind Segment Modal ─────────────────────────────────────────
interface DeleteSegmentModalProps {
  segment: StorySegment;
  onDeleteOnly: () => void;
  onRewindHere: () => void;
  onClose: () => void;
}

export function DeleteSegmentModal({ segment, onDeleteOnly, onRewindHere, onClose }: DeleteSegmentModalProps) {
  const preview = segment.content.slice(0, 80) + (segment.content.length > 80 ? '…' : '');

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Manage this passage" onClose={onClose} />
      <div className="px-5 py-4 space-y-4">
        <div className="p-3 rounded-lg bg-[#1c1c24] border border-white/8">
          <p className="text-sm text-[#72708a] italic leading-relaxed">{preview}</p>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => { onDeleteOnly(); onClose(); }}
            className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors text-sm text-left"
          >
            <div className="font-medium">Delete this passage</div>
            <div className="text-red-400/60 text-xs mt-0.5">Remove permanently. This cannot be undone.</div>
          </button>
          <button
            onClick={() => { onRewindHere(); onClose(); }}
            className="w-full p-3 rounded-xl bg-[#c8922a]/10 border border-[#c8922a]/25 text-[#d4a853] hover:bg-[#c8922a]/15 transition-colors text-sm text-left"
          >
            <div className="font-medium">Rewind to here</div>
            <div className="text-[#c8922a]/60 text-xs mt-0.5">Remove this and all passages after it. The story branches from this point.</div>
          </button>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-white/6">
        <Button variant="ghost" onClick={onClose} className="w-full text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Comic Modal ──────────────────────────────────────────────────────────
interface ComicModalProps {
  onCreate: (title: string) => void;
  onClose: () => void;
}

export function ComicModal({ onCreate, onClose }: ComicModalProps) {
  const [title, setTitle] = useState('');
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="New Comic" onClose={onClose} />
      <div className="px-5 py-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Comic Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give your comic a title..."
            autoFocus
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>
        <p className="text-xs text-[#72708a] leading-relaxed">
          You can add characters and panels after creating the comic project.
        </p>
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={() => { if (title.trim()) { onCreate(title.trim()); onClose(); } }}
          disabled={!title.trim()}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] disabled:opacity-40"
        >
          Create Comic
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Panel Modal ──────────────────────────────────────────────────────────
interface PanelModalProps {
  characters?: string[];
  onSave: (data: { sceneDescription: string; dialogue: string; characters: string[] }) => void;
  onClose: () => void;
}

export function PanelModal({ characters = [], onSave, onClose }: PanelModalProps) {
  const [sceneDescription, setSceneDescription] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const toggleChar = (c: string) =>
    setSelectedChars(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Edit Panel" onClose={onClose} />
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Scene Description</label>
          <Textarea
            value={sceneDescription}
            onChange={e => setSceneDescription(e.target.value)}
            placeholder="Describe the scene, setting, mood, action..."
            rows={3}
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Dialogue / Caption <span className="text-[#72708a]/60">(optional)</span></label>
          <Input
            value={dialogue}
            onChange={e => setDialogue(e.target.value)}
            placeholder='"What did you do?"'
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>
        {characters.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm text-[#72708a]">Characters in scene</label>
            <div className="flex flex-wrap gap-2">
              {characters.map(c => (
                <button
                  key={c}
                  onClick={() => toggleChar(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                    selectedChars.includes(c)
                      ? 'bg-[#c8922a]/20 border-[#c8922a]/50 text-[#d4a853]'
                      : 'bg-white/4 border-white/8 text-[#72708a] hover:border-white/15 hover:text-[#e6e0d4]'
                  }`}
                >
                  <User size={10} />
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Image Prompt</label>
          <div className="flex gap-2">
            <Textarea
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder="Describe the visual: style, lighting, composition, colors..."
              rows={3}
              className="flex-1 bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 resize-none"
            />
          </div>
          <Button
            disabled={!imagePrompt.trim()}
            className="w-full bg-[#c8922a]/15 hover:bg-[#c8922a]/25 border border-[#c8922a]/30 text-[#d4a853] gap-2 disabled:opacity-30"
          >
            <ImagePlus size={14} />
            Generate Image
          </Button>
          {/* Image preview area */}
          <div className="w-full rounded-xl overflow-hidden border border-white/8 bg-[#131318]" style={{ aspectRatio: '3/4' }}>
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImagePlus size={28} className="text-white/10" />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={() => { onSave({ sceneDescription, dialogue, characters: selectedChars }); onClose(); }}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11]"
        >
          Save Panel
        </Button>
      </div>
    </ModalBackdrop>
  );
}

// ─── Character Modal ───────────────────────────────────────────────────────
interface CharacterModalProps {
  onSave: (data: { name: string; description: string; stylePrompt: string }) => void;
  onClose: () => void;
}

export function CharacterModal({ onSave, onClose }: CharacterModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalHeader title="Character" onClose={onClose} />
      <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Character name..."
            autoFocus
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-[#72708a]">Description</label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Who is this character? Appearance, personality, role in the story..."
            rows={4}
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Reference Image <span className="text-[#72708a]/60">(optional)</span></label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 rounded-xl border border-dashed border-white/12 hover:border-[#c8922a]/40 flex items-center justify-center gap-2 text-[#72708a] hover:text-[#c8922a] transition-colors overflow-hidden"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <User size={16} />
                <span className="text-xs">Upload reference image</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#72708a]">Style Prompt</label>
          <Textarea
            value={stylePrompt}
            onChange={e => setStylePrompt(e.target.value)}
            placeholder="Describe how this character should look in generated images: hair color, eye color, clothing, art style..."
            rows={3}
            className="bg-[#1c1c24] border-white/8 text-[#e6e0d4] placeholder:text-[#72708a] focus-visible:ring-[#c8922a]/40 resize-none"
          />
          <Button
            disabled={!stylePrompt.trim() && !description.trim()}
            className="w-full bg-white/5 border border-white/8 text-[#b8b4aa] hover:bg-white/8 hover:text-[#e6e0d4] gap-2 disabled:opacity-30"
          >
            <Wand2 size={14} />
            Generate style prompt from description
          </Button>
          <p className="text-[10px] text-[#72708a]/60 leading-relaxed">
            This prompt is injected into every panel image for character consistency
          </p>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-white/6 flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/6">
          Cancel
        </Button>
        <Button
          onClick={() => { if (name.trim()) { onSave({ name: name.trim(), description, stylePrompt }); onClose(); } }}
          disabled={!name.trim()}
          className="flex-1 bg-[#c8922a] hover:bg-[#d4a853] text-[#0c0c11] disabled:opacity-40"
        >
          Save Character
        </Button>
      </div>
    </ModalBackdrop>
  );
}
