import type { StoredRating } from '../logic/difficulty/types';
import { describeRating } from '../logic/generation/levels';

interface RatingBadgeProps {
  rating?: StoredRating;
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
export function RatingBadge({ rating, className = '' }: RatingBadgeProps) {
  if (!rating) return null;
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
