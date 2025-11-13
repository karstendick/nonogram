import { useGameStore } from '../store/gameStore';
import { InteractionMode } from '../types';

export function ModeToggle() {
  const { currentMode, setMode } = useGameStore();

  return (
    <div className="flex gap-2 p-2 bg-gray-100 rounded-lg">
      <button
        onClick={() => setMode(InteractionMode.Fill)}
        className={`
          flex-1 px-4 py-2 rounded-md font-medium transition-colors
          ${
            currentMode === InteractionMode.Fill
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }
        `}
      >
        Fill
      </button>
      <button
        onClick={() => setMode(InteractionMode.MarkEmpty)}
        className={`
          flex-1 px-4 py-2 rounded-md font-medium transition-colors
          ${
            currentMode === InteractionMode.MarkEmpty
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }
        `}
      >
        Mark Empty
      </button>
    </div>
  );
}
