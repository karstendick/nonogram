import { useGameStore } from '../store/gameStore';
import { InteractionMode } from '../types';

export function ModeToggle() {
  const { currentMode, setMode } = useGameStore();

  return (
    <div className="flex gap-2 p-1.5 bg-gray-100 rounded-lg">
      <button
        onClick={() => setMode(InteractionMode.Fill)}
        className={`
          flex-1 px-3 py-2 rounded-md text-2xl font-bold transition-colors
          ${
            currentMode === InteractionMode.Fill
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }
        `}
        aria-label="Fill mode"
      >
        ■
      </button>
      <button
        onClick={() => setMode(InteractionMode.MarkEmpty)}
        className={`
          flex-1 px-3 py-2 rounded-md text-2xl font-bold transition-colors
          ${
            currentMode === InteractionMode.MarkEmpty
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-400 hover:bg-gray-50'
          }
        `}
        aria-label="Mark empty mode"
      >
        ×
      </button>
    </div>
  );
}
