import { Puzzle } from '../../types';
import {
  DEFAULT_PATTERN_PARAMS,
  PatternParams,
  calculateColumnClues,
  calculateRowClues,
  generateRandomPattern,
  hasUniformArray,
} from '../patternGenerator';
import { provesAmbiguous, solveWithDepth1 } from '../difficulty/depth1';
import { blankGrid, solveToFixpoint } from '../difficulty/stratifiedSolver';
import { rateTrace } from '../difficulty/score';
import { DifficultyRating } from '../difficulty/types';
import { GenerationOptions, GenerationStats } from './strategy';

/**
 * Turning one candidate pattern into a rated puzzle, or rejecting it.
 *
 * Every strategy shares this, so a bake-off compares how strategies *search*
 * rather than how they happen to evaluate. It is also where the ambiguity
 * pre-filter earns or fails to earn its place.
 */

export interface Candidate {
  puzzle: Puzzle;
  rating: DifficultyRating;
}

export function patternToPuzzle(pattern: boolean[][], id: string): Puzzle {
  const size = pattern.length;
  return {
    id,
    title: `Generated ${size}×${size}`,
    width: size,
    height: pattern[0].length,
    rowClues: calculateRowClues(pattern),
    columnClues: calculateColumnClues(pattern),
    solution: pattern,
  };
}

/**
 * Evaluate one pattern. Returns null when it is rejected, recording why in stats.
 *
 * The order matters for cost: the cheap structural rejections come first, then
 * the sound ambiguity proof, and only then the expensive depth-1 search.
 */
export function evaluatePattern(
  pattern: boolean[][],
  id: string,
  options: GenerationOptions,
  stats: GenerationStats
): Candidate | null {
  stats.candidates++;
  const size = pattern.length;
  const rowClues = calculateRowClues(pattern);
  const columnClues = calculateColumnClues(pattern);

  if (hasUniformArray(rowClues, size) || hasUniformArray(columnClues, size)) {
    stats.rejectedDegenerate++;
    return null;
  }

  const lines = { rowClues, columnClues, width: size, height: size };

  if (options.useAmbiguityFilter) {
    // Sound but incomplete: when it fires the puzzle is definitely ambiguous,
    // so no good candidate is ever lost. Finding nothing means "no proof", not
    // "unique", and we fall through to the full solve.
    const settled = solveToFixpoint(lines) ?? blankGrid(size, size);
    if (provesAmbiguous(pattern, rowClues, columnClues, settled)) {
      stats.ambiguityProofs++;
      stats.rejectedUnsolvable++;
      return null;
    }
  }

  const result = solveWithDepth1(lines, options.allowDepth1 ? Infinity : 0);
  if (!result.solved) {
    stats.rejectedUnsolvable++;
    return null;
  }
  if (!result.lineSolvable) stats.depth1Solves++;

  const rating = rateTrace(result.trace, lines);
  return { puzzle: { ...patternToPuzzle(pattern, id), rating }, rating };
}

/** Draw and evaluate one seeded candidate. */
export function drawCandidate(
  size: number,
  seed: string,
  params: PatternParams = DEFAULT_PATTERN_PARAMS,
  options: GenerationOptions,
  stats: GenerationStats
): Candidate | null {
  return evaluatePattern(generateRandomPattern(size, seed, params), seed, options, stats);
}
