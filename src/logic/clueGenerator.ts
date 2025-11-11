/**
 * Generate clues (row and column) from a solution grid
 * Returns the count of consecutive filled cells for each row and column
 */

export function generateClues(solution: boolean[][]): {
  rowClues: number[][];
  columnClues: number[][];
} {
  const width = solution[0]?.length || 0;

  // Generate row clues
  const rowClues = solution.map((row) => generateArrayClues(row));

  // Generate column clues
  const columnClues: number[][] = [];
  for (let col = 0; col < width; col++) {
    const columnArray = solution.map((row) => row[col]);
    columnClues.push(generateArrayClues(columnArray));
  }

  return { rowClues, columnClues };
}

/**
 * Generate clues for a single array (row or column)
 * Returns array of numbers representing consecutive filled cells
 * Example: [true, true, false, true] => [2, 1]
 */
function generateArrayClues(array: boolean[]): number[] {
  const clues: number[] = [];
  let currentCount = 0;

  for (const cell of array) {
    if (cell) {
      currentCount++;
    } else if (currentCount > 0) {
      clues.push(currentCount);
      currentCount = 0;
    }
  }

  // Don't forget the last group if the array ends with filled cells
  if (currentCount > 0) {
    clues.push(currentCount);
  }

  // If no filled cells, return [0] to indicate an empty row/column
  return clues.length > 0 ? clues : [0];
}
