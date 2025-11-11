import type { PuzzleData, Puzzle } from '../types';
import { generateClues } from './clueGenerator';

/**
 * Parse puzzle data from human-readable string format to game-ready format
 * Converts string[] (with # and .) to boolean[][] and generates clues
 */
export function parsePuzzle(data: PuzzleData): Puzzle {
  // Parse solution from string format to boolean array
  const solution = data.solution.map((row) => row.split('').map((char) => char === '#'));

  // Calculate dimensions
  const height = solution.length;
  const width = solution[0]?.length || 0;

  // Validate that all rows have the same length
  if (solution.some((row) => row.length !== width)) {
    throw new Error(`Puzzle "${data.id}" has inconsistent row lengths`);
  }

  // Generate clues from the solution
  const { rowClues, columnClues } = generateClues(solution);

  return {
    id: data.id,
    title: data.title,
    difficulty: data.difficulty,
    width,
    height,
    solution,
    rowClues,
    columnClues,
  };
}
