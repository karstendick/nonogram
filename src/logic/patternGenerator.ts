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
 * Calculate median of an array of numbers
 */
function calculateMedian(grid: number[][]): number {
  const values = _.flatten(grid);
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}

/**
 * Generate a random pattern using cellular automaton smoothing
 * @param size Grid size (square grid)
 * @param seed Seed for reproducible randomness
 * @returns Binary grid (true = filled, false = empty)
 */
export function generateRandomPattern(size: number, seed: string): boolean[][] {
  const rng = seedrandom(seed);

  // Step 1: Generate random values [0.0, 1.0]
  const grid: number[][] = Array(size)
    .fill(0)
    .map(() =>
      Array(size)
        .fill(0)
        .map(() => rng())
    );

  // Step 2: Cellular automaton smoothing
  // Average each cell with its neighbors
  const smoothed: number[][] = grid.map((row, r) =>
    row.map((_, c) => {
      const neighbors = getNeighbors(grid, r, c);
      const cellValue = grid[r][c];
      return average([cellValue, ...neighbors]);
    })
  );

  // Step 3: Threshold at median (targets ~50% fill rate)
  const median = calculateMedian(smoothed);
  const binary: boolean[][] = smoothed.map((row) => row.map((val) => val >= median));

  return binary;
}

/**
 * Calculate clues for a single array (row or column)
 * @param array Array of booleans (true = filled, false = empty)
 * @returns Array of block sizes
 */
function calculateArrayClues(array: boolean[]): number[] {
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
