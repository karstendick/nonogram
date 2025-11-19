import { CellState, Difficulty, SolverCell } from '../types';
import _ from 'lodash';

/**
 * Convert SolverCell to CellState
 */
function toCellState(cell: SolverCell): CellState {
  switch (cell) {
    case SolverCell.Empty:
      return CellState.Empty;
    case SolverCell.Filled:
      return CellState.Filled;
    case SolverCell.Unknown:
      return CellState.Empty; // Default to empty for output (shouldn't happen in valid solutions)
  }
}

/**
 * Result of solving a puzzle
 */
export interface SolverResult {
  solved: boolean; // Puzzle was completed
  unique: boolean; // Has exactly one solution
  difficulty?: Difficulty; // Only set if solved
  passes: number; // Number of solving passes required
  grid?: CellState[][]; // Final grid state (if solved)
}

/**
 * Input for puzzle solver
 */
export interface PuzzleInput {
  rowClues: number[][];
  columnClues: number[][];
  width: number;
  height: number;
}

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
export function solveArray(clues: number[], knownCells: SolverCell[]): SolverCell[] {
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

/**
 * Count unknown cells in a grid
 */
function countUnknown(grid: SolverCell[][]): number {
  return _.sumBy(grid, (row) => _.sumBy(row, (cell) => (cell === SolverCell.Unknown ? 1 : 0)));
}

/**
 * Solve a puzzle using logical deduction only (no guessing)
 * @param puzzle Puzzle input with clues and dimensions
 * @returns Solver result with completion status and difficulty
 */
export function solvePuzzle(puzzle: PuzzleInput): SolverResult {
  const { rowClues, columnClues, width, height } = puzzle;

  // Initialize grid with unknown cells
  const grid: SolverCell[][] = Array.from({ length: height }, () =>
    Array<SolverCell>(width).fill(SolverCell.Unknown)
  );

  let pass = 0;
  const maxPasses = 100; // Prevent infinite loops

  while (pass < maxPasses) {
    let madeProgress = false;
    pass++;

    // Solve all rows
    for (let r = 0; r < height; r++) {
      const before = [...grid[r]];
      grid[r] = solveArray(rowClues[r], grid[r]);

      if (!_.isEqual(grid[r], before)) {
        madeProgress = true;
      }
    }

    // Solve all columns
    for (let c = 0; c < width; c++) {
      const column = grid.map((row) => row[c]);
      const before = [...column];
      const solved = solveArray(columnClues[c], column);

      if (!_.isEqual(solved, before)) {
        madeProgress = true;
      }

      // Update grid with solved column
      for (let r = 0; r < height; r++) {
        grid[r][c] = solved[r];
      }
    }

    // Check if puzzle is complete
    const unknownCount = countUnknown(grid);
    if (unknownCount === 0) {
      // Puzzle is solved! Convert to CellState for output
      const cellStateGrid = grid.map((row) => row.map((cell) => toCellState(cell)));
      return {
        solved: true,
        unique: true, // Assumed unique if solved with pure logic
        difficulty: rateDifficulty(pass),
        passes: pass,
        grid: cellStateGrid,
      };
    }

    if (!madeProgress) {
      // Stuck - puzzle requires guessing
      const cellStateGrid = grid.map((row) => row.map((cell) => toCellState(cell)));
      return {
        solved: false,
        unique: false,
        passes: pass,
        grid: cellStateGrid,
      };
    }
  }

  // Exceeded max passes
  const cellStateGrid = grid.map((row) => row.map((cell) => toCellState(cell)));
  return {
    solved: false,
    unique: false,
    passes: maxPasses,
    grid: cellStateGrid,
  };
}

/**
 * Rate puzzle difficulty based on number of solving passes
 */
function rateDifficulty(passes: number): Difficulty {
  if (passes <= 3) return Difficulty.Easy;
  if (passes <= 10) return Difficulty.Medium;
  return Difficulty.Hard;
}
