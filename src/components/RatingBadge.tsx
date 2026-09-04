import type { StoredRating } from '../logic/difficulty/types';
import { describeRating, levelForRating } from '../logic/generation/levels';

interface RatingBadgeProps {
  rating?: StoredRating;
  /**
   * Whether to show the measurement itself. A puzzle still being solved does
   * not: naming the technique it needs reads as an instruction for what to go
   * looking for, and the deduction count is a progress bar nobody asked for.
   * The level name stands in — that is the player's own choice echoed back, not
   * a measurement given away.
   */
  reveal?: boolean;
  className?: string;
}

/**
 * A puzzle's difficulty, on both axes.
 *
 * Two readings rather than one label, because how tricky the reasoning is and
 * how much of it there is are genuinely different things: a long grind of
 * obvious moves and a short puzzle with one nasty step are both "hard" in ways
 * a single word cannot tell apart. The premade `flower` is the case in point —
 * it needs reasoning by contradiction in remarkably few deductions.
 */
export function RatingBadge({ rating, reveal = true, className = '' }: RatingBadgeProps) {
  if (!rating) return null;

  if (!reveal) {
    const { name } = levelForRating(rating);
    return (
      <span className={`inline-flex items-center ${className}`} aria-label={`Difficulty: ${name}`}>
        <span className="text-gray-700">{name}</span>
      </span>
    );
  }

  const { technique, length } = describeRating(rating);

  // Labelled as one phrase: read out cell by cell it would be three fragments,
  // and the two readings only mean something together.
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={`Difficulty: ${technique}, ${length}`}
    >
      <span className="text-gray-700">{technique}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-700">{length}</span>
    </span>
  );
}
