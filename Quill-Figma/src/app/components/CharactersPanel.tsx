import { useState } from 'react';
import { UserPlus, Pencil, Trash2, User } from 'lucide-react';

export interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  stylePrompt: string;
}

function CharacterAvatar({ character }: { character: Character }) {
  if (character.imageUrl) {
    return (
      <img
        src={character.imageUrl}
        alt={character.name}
        className="w-10 h-10 rounded-xl object-cover shrink-0"
      />
    );
  }
  const initials = character.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  // Give each character a consistent hue based on name
  const hue = character.name.charCodeAt(0) * 37 % 360;
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-medium"
      style={{
        background: `hsl(${hue} 30% 25%)`,
        color: `hsl(${hue} 60% 75%)`,
        border: `1px solid hsl(${hue} 30% 35%)`,
      }}
    >
      {initials || <User size={14} />}
    </div>
  );
}

interface CharactersPanelProps {
  characters: Character[];
  onAddCharacter: () => void;
  onEditCharacter: (c: Character) => void;
  onDeleteCharacter: (id: string) => void;
}

export function CharactersPanel({
  characters,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
}: CharactersPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {characters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-5">
          <div className="w-11 h-11 rounded-xl bg-[#1c1c24] border border-white/6 flex items-center justify-center mb-3">
            <User size={18} className="text-[#72708a]" />
          </div>
          <p className="text-sm text-[#72708a]">No characters yet</p>
          <p className="text-xs text-[#72708a]/55 mt-1.5 leading-relaxed max-w-[180px]">
            Create one to add a style prompt for consistent image generation
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {characters.map(c => (
            <div
              key={c.id}
              className="group flex items-start gap-3 p-3 rounded-xl bg-[#131318] border border-white/6 hover:border-white/10 transition-colors"
            >
              <CharacterAvatar character={c} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#e6e0d4] font-medium truncate">{c.name}</div>
                {c.description && (
                  <p className="text-[11px] text-[#72708a] mt-0.5 line-clamp-1 leading-relaxed">
                    {c.description}
                  </p>
                )}
                {c.stylePrompt && (
                  <div className="mt-1.5 text-[10px] text-[#c8922a]/60 bg-[#c8922a]/8 border border-[#c8922a]/15 px-2 py-0.5 rounded-md line-clamp-1">
                    {c.stylePrompt}
                  </div>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => onEditCharacter(c)}
                  className="p-1.5 rounded-lg text-[#72708a] hover:text-[#e6e0d4] hover:bg-white/8 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDeleteCharacter(c.id)}
                  className="p-1.5 rounded-lg text-[#72708a] hover:text-red-400 hover:bg-red-400/8 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-3 border-t border-white/6">
        <button
          onClick={onAddCharacter}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/8 text-[#b8b4aa] hover:bg-white/8 hover:text-[#e6e0d4] text-xs transition-colors"
        >
          <UserPlus size={13} />
          Add Character
        </button>
      </div>
    </div>
  );
}
