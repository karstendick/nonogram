import { LEVELS } from '../logic/generation/levels';

interface LevelSelectorProps {
  value: number;
  onChange: (levelId: number) => void;
  disabled?: boolean;
}

/**
 * Difficulty as one of four levels, each being a rung of the technique ladder.
 *
 * The level says what kind of thinking the puzzle will demand, which is exactly
 * what is measured. How long it takes is reported afterwards rather than chosen:
 * see the spec for why a length control was measured and dropped.
 */
export function LevelSelector({ value, onChange, disabled }: LevelSelectorProps) {
  const selected = LEVELS.find((level) => level.id === value);

  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-2">Difficulty</div>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Difficulty">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            role="radio"
            aria-checked={value === level.id}
            aria-label={`${level.name}: ${level.hint}`}
            disabled={disabled}
            onClick={() => onChange(level.id)}
            className={`py-2 px-1 text-sm rounded-md font-semibold transition-colors border-2 select-none ${
              value === level.id
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {level.name}
          </button>
        ))}
      </div>
      {selected && <p className="mt-2 text-xs text-gray-500 text-center">{selected.hint}</p>}
    </div>
  );
}
