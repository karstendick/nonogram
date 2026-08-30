import { calculateColumnClues, calculateRowClues } from '../patternGenerator';
import { solveWithDepth1 } from './depth1';
import { rateTrace } from './score';
import { StoredRating, DifficultyRating } from './types';

/**
 * Rate a puzzle from its solution.
 *
 * Used both to precompute the premade puzzles' ratings and to check, in CI,
 * that the stored values still match what the scoring code produces — which is
 * the risk that comes with storing derived data.
 */
export function ratePuzzle(solution: boolean[][]): DifficultyRating {
  const lines = {
    rowClues: calculateRowClues(solution),
    columnClues: calculateColumnClues(solution),
    width: solution[0].length,
    height: solution.length,
  };
  return rateTrace(solveWithDepth1(lines).trace, lines);
}

/** Rate a puzzle written in the `#`/`.` notation puzzles.json uses. */
export function ratePuzzleData(rows: string[]): StoredRating {
  const rating = ratePuzzle(rows.map((row) => [...row].map((cell) => cell === '#')));
  return {
    technique: rating.technique,
    work: rating.work,
    maxTechnique: rating.maxTechnique,
  };
}
