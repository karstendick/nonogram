import puzzlesData from '../data/puzzles.json';
import { Puzzle, PuzzleData } from '../types';
import { DEFAULT_LEVEL_ID, levelById } from './generation/levels';
import { evaluatePattern } from './generation/evaluate';
import { DEFAULT_OPTIONS, emptyStats } from './generation/strategy';
import { generateForTarget } from './generation/strategies';
import { decodePuzzleCode, encodePuzzleCode } from './puzzleCode';
import { parsePuzzle } from './puzzleParser';

/**
 * Generate a puzzle for a seed and difficulty level.
 *
 * Uses the strategy that won the bake-off (knob-biased sampling: a 100% hit
 * rate in every band, and the fewest candidates burned). Difficulty is an input
 * rather than something reported after the fact.
 *
 * The app no longer calls this: Quick Play generates through the worker in
 * `generation/service.ts`, and shared puzzles arrive as codes rather than
 * seeds. It remains for tests and the calibration scripts, which want a puzzle
 * synchronously.
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

/**
 * The pre-made puzzles, by their code.
 *
 * A code carries a grid and nothing else, so a shared "Cat" would come back
 * titled "Generated 15×15". Looking it up restores the curated title, the real
 * id, and the rating `npm run rate-premades` computed offline — which also
 * skips the solve. Ten entries, built once.
 */
const PREMADES_BY_CODE = new Map<string, PuzzleData>(
  (puzzlesData as { puzzles: PuzzleData[] }).puzzles.map((data) => [
    encodePuzzleCode(parsePuzzle(data).solution),
    data,
  ])
);

/**
 * The puzzle a code describes, or null if the code is not a valid puzzle.
 *
 * Validation is the generator's own `evaluatePattern`: an edited code decodes to
 * an arbitrary grid, which may be degenerate, ambiguous or unsolvable. Reusing
 * it means a pasted grid is vetted by exactly the code that vets a generated
 * one, and returns the rating as a by-product.
 */
export function puzzleFromCode(code: string): Puzzle | null {
  const premade = PREMADES_BY_CODE.get(code);
  if (premade) return parsePuzzle(premade);

  const grid = decodePuzzleCode(code);
  if (!grid) return null;

  const candidate = evaluatePattern(grid, code, DEFAULT_OPTIONS, emptyStats());
  if (!candidate) return null;

  return { ...candidate.puzzle, id: code, rating: candidate.rating };
}
