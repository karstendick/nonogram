import { Puzzle } from '../types';
import { generatePuzzle } from './puzzleGenerator';

/**
 * Generate a random UUID v4 to use as a puzzle seed
 */
export function generateRandomSeed(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random puzzle of the given size using a fresh random seed.
 * Generation can fail for a given seed, so retry with new seeds a few times.
 * @returns Generated puzzle, or null if every attempt failed
 */
export function generateRandomPuzzle(size: number, maxAttempts = 5): Puzzle | null {
  for (let i = 0; i < maxAttempts; i++) {
    const puzzle = generatePuzzle(size, generateRandomSeed());
    if (puzzle) return puzzle;
    console.warn('Failed to generate puzzle, retrying with a new seed...');
  }
  return null;
}

/**
 * True if a puzzle came from the generator (vs. the pre-made collection).
 * Generated puzzles are always square and can be re-rolled at the same size.
 */
export function isGeneratedPuzzle(puzzle: Puzzle | null | undefined): boolean {
  return puzzle?.title.startsWith('Generated') ?? false;
}
