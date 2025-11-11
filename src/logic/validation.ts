import { CellState } from '../types';

/**
 * Check if the player's grid matches the solution
 */
export function isSolutionCorrect(playerGrid: CellState[][], solution: boolean[][]): boolean {
  const height = solution.length;
  const width = solution[0]?.length || 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const playerCell = playerGrid[row]?.[col];
      const solutionCell = solution[row]?.[col];

      // Solution cell should be filled => player cell should be Filled
      // Solution cell should be empty => player cell should NOT be Filled
      if (solutionCell && playerCell !== CellState.Filled) {
        return false;
      }
      if (!solutionCell && playerCell === CellState.Filled) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a specific row is complete and matches the solution
 */
export function isRowComplete(
  playerGrid: CellState[][],
  solution: boolean[][],
  rowIndex: number
): boolean {
  const width = solution[0]?.length || 0;

  for (let col = 0; col < width; col++) {
    const playerCell = playerGrid[rowIndex]?.[col];
    const solutionCell = solution[rowIndex]?.[col];

    if (solutionCell && playerCell !== CellState.Filled) {
      return false;
    }
    if (!solutionCell && playerCell === CellState.Filled) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a specific column is complete and matches the solution
 */
export function isColumnComplete(
  playerGrid: CellState[][],
  solution: boolean[][],
  colIndex: number
): boolean {
  const height = solution.length;

  for (let row = 0; row < height; row++) {
    const playerCell = playerGrid[row]?.[colIndex];
    const solutionCell = solution[row]?.[colIndex];

    if (solutionCell && playerCell !== CellState.Filled) {
      return false;
    }
    if (!solutionCell && playerCell === CellState.Filled) {
      return false;
    }
  }

  return true;
}

/**
 * Check if there are any errors in the player's grid (cells that don't match solution)
 */
export function findErrors(
  playerGrid: CellState[][],
  solution: boolean[][]
): Array<{ row: number; col: number }> {
  const errors: Array<{ row: number; col: number }> = [];
  const height = solution.length;
  const width = solution[0]?.length || 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const playerCell = playerGrid[row]?.[col];
      const solutionCell = solution[row]?.[col];

      // Check for contradictions
      if (solutionCell && playerCell === CellState.MarkedEmpty) {
        errors.push({ row, col });
      } else if (!solutionCell && playerCell === CellState.Filled) {
        errors.push({ row, col });
      }
    }
  }

  return errors;
}
