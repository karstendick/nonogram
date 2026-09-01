import { Puzzle } from '../types';
import { DEFAULT_LEVEL_ID, levelById } from './generation/levels';
import { generateForTarget } from './generation/strategies';

/**
 * Generate a puzzle for a seed and difficulty level.
 *
 * Uses the strategy that won the bake-off (knob-biased sampling: a 100% hit
 * rate in every band, and the fewest candidates burned). Difficulty is now an
 * input rather than something reported after the fact, so a shared puzzle is
 * identified by seed, size AND level — the same seed at a different level is a
 * different puzzle.
 *
 * Runs on the calling thread. The app generates in a worker instead; this is
 * for callers that want a puzzle synchronously, such as tests.
 *
 * @returns Generated puzzle, or null if nothing solvable was found at all
 */
export function generatePuzzle(
  size: number,
  seed: string,
  levelId: number = DEFAULT_LEVEL_ID
): Puzzle | null {
  const level = levelById(levelId);
  const result = generateForTarget({ size, rung: level.rung }, seed, { budgetMs: 5000 });
  return result.puzzle;
}
