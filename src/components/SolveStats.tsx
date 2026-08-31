import type { StoredRating } from '../logic/difficulty/types';
import { TECHNIQUE_NAMES } from '../logic/difficulty/types';

interface SolveStatsProps {
  moves: number;
  rating?: StoredRating;
}

/**
 * How the solve went, against what the puzzle actually required.
 *
 * The comparison is meaningful because the two counts are in the same units. A
 * solver deduction is one act of reading a line and marking what follows; a
 * player move is the same thing — a drag along a row counts once, as does
 * clicking a finished clue to sweep the rest of its line. So the ratio says
 * something real about how directly the puzzle was solved, in the spirit of
 * Minesweeper's efficiency stat.
 *
 * Beating the solver is possible and not a bug: one drag can cover ground the
 * solver needed several separate deductions to justify.
 */
export function SolveStats({ moves, rating }: SolveStatsProps) {
  if (!rating) {
    return (
      <p className="text-center text-gray-600 mb-6">
        Congratulations! You solved the puzzle in {moves} move{moves !== 1 ? 's' : ''}.
      </p>
    );
  }

  const efficiency = Math.round((rating.deductions / moves) * 100);

  return (
    <div className="mb-6">
      <p className="text-center text-gray-600 mb-4">
        Congratulations! You solved the puzzle in {moves} move{moves !== 1 ? 's' : ''}.
      </p>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-md py-2 px-1">
          <dt className="text-xs text-gray-500">Your moves</dt>
          <dd className="text-lg font-semibold text-gray-800">{moves}</dd>
        </div>
        <div className="bg-gray-50 rounded-md py-2 px-1">
          <dt className="text-xs text-gray-500">Deductions needed</dt>
          <dd className="text-lg font-semibold text-gray-800">{rating.deductions}</dd>
        </div>
        <div className="bg-purple-50 rounded-md py-2 px-1">
          <dt className="text-xs text-gray-500">Efficiency</dt>
          <dd className="text-lg font-semibold text-purple-700">{efficiency}%</dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-xs text-gray-500">
        Solving it by pure logic takes {rating.deductions} deductions, the hardest being{' '}
        {TECHNIQUE_NAMES[rating.maxTechnique]}.
      </p>
    </div>
  );
}
