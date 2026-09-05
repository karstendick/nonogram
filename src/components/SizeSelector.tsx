import { SIZES } from '../logic/generation/levels';

interface SizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}

/**
 * Grid size, alongside difficulty rather than standing in for it.
 *
 * Size used to be the only difficulty control there was, and it was a poor one —
 * it mostly read the grid size back to the player. It is a separate axis now:
 * every level is reachable at every size, measured, so the two controls are
 * independent and no combination needs disabling.
 *
 * Small grids exist to be an on-ramp. A 5×5 is where someone learns what a clue
 * means, which is why this sits on the landing page rather than somewhere a new
 * player would never look.
 */
export function SizeSelector({ value, onChange, disabled }: SizeSelectorProps) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-2">Size</div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Size">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={value === size}
            aria-label={`${size} by ${size}`}
            disabled={disabled}
            onClick={() => onChange(size)}
            className={`py-2 px-1 text-sm rounded-md font-semibold transition-colors border-2 select-none ${
              value === size
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {size}×{size}
          </button>
        ))}
      </div>
    </div>
  );
}
