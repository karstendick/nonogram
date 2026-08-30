import { LEVELS } from '../logic/generation/levels';

interface LevelSelectorProps {
  value: number;
  onChange: (levelId: number) => void;
  disabled?: boolean;
}

/**
 * Difficulty as a numbered level.
 *
 * Numbered rather than named on purpose. How many tiers there should be and
 * what to call them is still open — naming one is a claim about how a puzzle
 * feels, and that is answered by playing a spread of them rather than by
 * argument. Numbers are ordinal without claiming anything, and the puzzle's
 * measured rating is shown once it is generated.
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
            aria-label={`Level ${level.id}: ${level.hint}`}
            disabled={disabled}
            onClick={() => onChange(level.id)}
            className={`py-2 rounded-md font-semibold transition-colors border-2 select-none ${
              value === level.id
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {level.id}
          </button>
        ))}
      </div>
      {selected && <p className="mt-2 text-xs text-gray-500 text-center">{selected.hint}</p>}
    </div>
  );
}
