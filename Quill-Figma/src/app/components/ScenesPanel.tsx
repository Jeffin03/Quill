import { ImagePlus, Trash2 } from 'lucide-react';

export interface Scene {
  id: string;
  imageUrl?: string;
  text: string;
  timestamp: string;
}

interface ScenesPanelProps {
  scenes: Scene[];
  onDeleteScene?: (id: string) => void;
}

export function ScenesPanel({ scenes, onDeleteScene }: ScenesPanelProps) {
  if (scenes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-14 text-center px-5">
        <div className="w-11 h-11 rounded-xl bg-[#1c1c24] border border-white/6 flex items-center justify-center mb-3">
          <ImagePlus size={19} className="text-[#72708a]" />
        </div>
        <p className="text-sm text-[#72708a]">No scenes visualized yet</p>
        <p className="text-xs text-[#72708a]/55 mt-1.5 leading-relaxed">
          Hover over any passage and press the image icon to generate a visual
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {scenes.map(scene => (
          <div key={scene.id} className="group relative rounded-xl overflow-hidden border border-white/8 bg-[#131318]">
            <div className="aspect-[4/3] relative bg-gradient-to-br from-[#1c1c24] to-[#131318] flex items-center justify-center overflow-hidden">
              {scene.imageUrl ? (
                <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={22} className="text-white/10" />
              )}
              {onDeleteScene && (
                <button
                  onClick={() => onDeleteScene(scene.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-black/80 transition-all"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
            <div className="px-2.5 py-2">
              <p className="text-[11px] text-[#9992a6] line-clamp-2 leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
                {scene.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
