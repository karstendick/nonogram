import seedrandom from 'seedrandom';
import _ from 'lodash';

/**
 * Get neighbors of a cell (8-connected, including diagonals)
 */
function getNeighbors(grid: number[][], row: number, col: number): number[] {
  const neighbors: number[] = [];
  const height = grid.length;
  const width = grid[0].length;

  for (const dr of [-1, 0, 1]) {
    for (const dc of [-1, 0, 1]) {
      if (dr === 0 && dc === 0) continue; // Skip self

      const r = row + dr;
      const c = col + dc;

      if (0 <= r && r < height && 0 <= c && c < width) {
        neighbors.push(grid[r][c]);
      }
    }
  }

  return neighbors;
}

/**
 * Calculate average of an array of numbers
 */
function average(numbers: number[]): number {
  return _.mean(numbers) || 0;
}

/**
 * How a pattern is shaped. Both knobs move difficulty, measurably: denser and
 * smoother patterns are easier on every signal, and sparser ones are harder but
 * far more likely to admit multiple solutions. They were hardcoded (median
 * threshold, one smoothing round) before difficulty targeting needed them.
 */
export interface PatternParams {
  /** Share of cells to fill, 0-1. The strongest single difficulty knob. */
  fillRatio: number;
  /** Rounds of neighbour averaging. More rounds means blobbier shapes. */
  smoothingRounds: number;
}

export const DEFAULT_PATTERN_PARAMS: PatternParams = { fillRatio: 0.5, smoothingRounds: 1 };

/** Take the value at the given quantile of a grid, used as the fill threshold. */
function quantile(grid: number[][], q: number): number {
  const values = _.flatten(grid).sort((a, b) => a - b);
  const index = Math.min(values.length - 1, Math.max(0, Math.floor((1 - q) * values.length)));
  return values[index];
}

function smoothOnce(grid: number[][]): number[][] {
  return grid.map((row, r) =>
    row.map((_value, c) => average([grid[r][c], ...getNeighbors(grid, r, c)]))
  );
}

/**
 * Generate a random pattern using cellular automaton smoothing
 * @param size Grid size (square grid)
 * @param seed Seed for reproducible randomness
 * @param params Fill ratio and smoothing, defaulting to the original behaviour
 * @returns Binary grid (true = filled, false = empty)
 */
export function generateRandomPattern(
  size: number,
  seed: string,
  params: PatternParams = DEFAULT_PATTERN_PARAMS
): boolean[][] {
  const rng = seedrandom(seed);

  let grid: number[][] = Array(size)
    .fill(0)
    .map(() =>
      Array(size)
        .fill(0)
        .map(() => rng())
    );

  for (let i = 0; i < params.smoothingRounds; i++) {
    grid = smoothOnce(grid);
  }

  // Thresholding at the fill-ratio quantile hits the requested density
  // regardless of how smoothing narrowed the distribution.
  const threshold = quantile(grid, params.fillRatio);
  return grid.map((row) => row.map((value) => value >= threshold));
}

/**
 * Calculate clues for a single array (row or column)
 * @param array Array of booleans (true = filled, false = empty)
 * @returns Array of block sizes
 */
export function calculateArrayClues(array: boolean[]): number[] {
  const clues: number[] = [];
  let currentBlock = 0;

  for (const cell of array) {
    if (cell) {
      currentBlock++;
    } else if (currentBlock > 0) {
      clues.push(currentBlock);
      currentBlock = 0;
    }
  }

  if (currentBlock > 0) {
    clues.push(currentBlock);
  }

  return clues.length > 0 ? clues : [0]; // Empty row = [0]
}

/**
 * Calculate row clues from a pattern
 * @param pattern Binary grid
 * @returns Array of row clues
 */
export function calculateRowClues(pattern: boolean[][]): number[][] {
  return pattern.map((row) => calculateArrayClues(row));
}

/**
 * Calculate column clues from a pattern
 * @param pattern Binary grid
 * @returns Array of column clues
 */
export function calculateColumnClues(pattern: boolean[][]): number[][] {
  const width = pattern[0].length;
  return _.times(width, (c) => calculateArrayClues(pattern.map((row) => row[c])));
}

/**
 * Check if any array (row or column) is entirely uniform (all filled or all empty)
 * @param clues Array of clue sets (one per row/column)
 * @param dimension Grid dimension (width for rows, height for columns)
 * @returns true if any array is degenerate
 */
export function hasUniformArray(clues: number[][], dimension: number): boolean {
  return clues.some((clue) => {
    if (clue.length === 1 && clue[0] === 0) return true; // All empty
    if (clue.length === 1 && clue[0] === dimension) return true; // All filled
    return false;
  });
}
