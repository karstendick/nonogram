import { Puzzle } from '../types';

/**
 * True if a puzzle came from the generator (vs. the pre-made collection).
 * Generated puzzles are always square and can be re-rolled at the same size.
 */
export function isGeneratedPuzzle(puzzle: Puzzle | null | undefined): boolean {
  return puzzle?.title.startsWith('Generated') ?? false;
}
