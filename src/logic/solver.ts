import { SolverCell } from '../types';
import _ from 'lodash';

/**
 * Placement enumeration for a single line.
 *
 * This is the strongest thing that can be said about a line: intersect every
 * placement still consistent with what is known. It is deliberately NOT used to
 * measure difficulty — a solver this strong cannot tell an obvious deduction
 * from a fiendish one, which is why the technique ladder in logic/difficulty
 * exists. Here it serves as that ladder's top rung and last resort.
 */

/**
 * Generate all possible placements of blocks for given clues in an array
 * @param clues Array of block sizes (e.g., [2, 3] means blocks of size 2 and 3)
 * @param length Length of the array
 * @returns Array of possible placements, where each placement is an array of booleans
 */
function generatePlacements(clues: number[], length: number): boolean[][] {
  if (clues.length === 0) {
    // No blocks - all empty
    return [Array<boolean>(length).fill(false)];
  }

  const placements: boolean[][] = [];

  // Calculate minimum space needed
  const minSpace = _.sum(clues) + (clues.length - 1);

  if (minSpace > length) {
    // Impossible to fit all blocks
    return [];
  }

  function backtrack(clueIndex: number, position: number, current: boolean[]): void {
    if (clueIndex === clues.length) {
      // All blocks placed - rest is empty
      const remaining = Array<boolean>(length - position).fill(false);
      placements.push([...current, ...remaining]);
      return;
    }

    const blockSize = clues[clueIndex];
    const remainingBlocks = clues.length - clueIndex - 1;
    const remainingSpace =
      remainingBlocks > 0 ? remainingBlocks + _.sum(clues.slice(clueIndex + 1)) : 0;

    // Try placing block at each valid position
    for (let pos = position; pos <= length - blockSize - remainingSpace; pos++) {
      const emptyBefore = Array<boolean>(pos - position).fill(false);
      const block = Array<boolean>(blockSize).fill(true);
      const newCurrent: boolean[] = [...current, ...emptyBefore, ...block];

      if (clueIndex < clues.length - 1) {
        // Add at least one empty cell after the block (separator)
        newCurrent.push(false);
        backtrack(clueIndex + 1, pos + blockSize + 1, newCurrent);
      } else {
        // Last block - no separator needed
        backtrack(clueIndex + 1, pos + blockSize, newCurrent);
      }
    }
  }

  backtrack(0, 0, []);
  return placements;
}

/**
 * Check if a placement is compatible with known cell states
 * @param placement Proposed placement (boolean array)
 * @param knownCells Known cell states
 * @returns true if placement is compatible with known states
 */
function isCompatible(placement: boolean[], knownCells: SolverCell[]): boolean {
  for (let i = 0; i < placement.length; i++) {
    const known = knownCells[i];
    const proposed = placement[i];

    if (known === SolverCell.Filled && !proposed) {
      return false; // Known filled but placement says empty
    }
    if (known === SolverCell.Empty && proposed) {
      return false; // Known empty but placement says filled
    }
  }
  return true;
}

/**
 * Solve a single array (row or column) using constraint propagation
 * @param clues Array of block sizes
 * @param knownCells Current known cell states
 * @returns Updated cell states with newly deduced cells
 */
/**
 * Cache of line solves.
 *
 * Enumerating placements is the most expensive thing in the solver, and the
 * same (clues, line) states recur enormously — a depth-1 search re-propagates
 * almost the same grid hundreds of times, and most lines are untouched between
 * one hypothesis and the next. Caching turns that repetition into lookups.
 *
 * Bounded so a long session cannot grow it without limit; the whole map is
 * dropped when it fills rather than tracking recency, which is cheap and good
 * enough for a cache with this much locality.
 */
const CACHE_LIMIT = 20000;
const solveCache = new Map<string, SolverCell[]>();

function cacheKey(clues: number[], knownCells: SolverCell[]): string {
  return `${clues.join(',')}|${knownCells.join('')}`;
}

export function solveArray(clues: number[], knownCells: SolverCell[]): SolverCell[] {
  const key = cacheKey(clues, knownCells);
  const cached = solveCache.get(key);
  if (cached) return [...cached];

  const result = computeSolvedArray(clues, knownCells);
  if (solveCache.size >= CACHE_LIMIT) solveCache.clear();
  solveCache.set(key, [...result]);
  return result;
}

function computeSolvedArray(clues: number[], knownCells: SolverCell[]): SolverCell[] {
  const length = knownCells.length;

  // Generate all possible placements
  const allPlacements = generatePlacements(clues, length);

  // Filter to only compatible placements
  const validPlacements = allPlacements.filter((placement) => isCompatible(placement, knownCells));

  if (validPlacements.length === 0) {
    // No valid placements - puzzle is unsolvable
    return knownCells;
  }

  // Find cells that are the same in ALL valid placements
  const result = [...knownCells];
  for (let i = 0; i < length; i++) {
    if (result[i] !== SolverCell.Unknown) {
      continue; // Already known
    }

    const firstValue = validPlacements[0][i];
    const allSame = validPlacements.every((placement) => placement[i] === firstValue);

    if (allSame) {
      result[i] = firstValue ? SolverCell.Filled : SolverCell.Empty;
    }
  }

  return result;
}
