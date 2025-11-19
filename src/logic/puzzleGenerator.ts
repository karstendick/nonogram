import { Puzzle } from '../types';
import { solvePuzzle } from './solver';
import {
  generateRandomPattern,
  calculateRowClues,
  calculateColumnClues,
  hasUniformArray,
} from './patternGenerator';

/**
 * Generate a puzzle with given size and seed
 * @param size Grid size (square grid)
 * @param seed Seed for reproducible generation
 * @returns Generated puzzle or null if generation failed
 */
export function generatePuzzle(size: number, seed: string): Puzzle | null {
  const maxAttempts = 100; // Prevent infinite loops

  for (let i = 0; i < maxAttempts; i++) {
    // Use seed + attempt number for deterministic generation
    const attemptSeed = `${seed}-${i}`;

    // 1. Generate random pattern with seeded RNG
    const pattern = generateRandomPattern(size, attemptSeed);

    // 2. Calculate clues
    const rowClues = calculateRowClues(pattern);
    const columnClues = calculateColumnClues(pattern);

    // 3. Verify no row/column is entirely uniform (degenerate case)
    if (hasUniformArray(rowClues, size) || hasUniformArray(columnClues, size)) {
      continue;
    }

    // 4. Attempt to solve
    const result = solvePuzzle({
      rowClues,
      columnClues,
      width: size,
      height: size,
    });

    // 5. Accept only if solvable with pure logic and has unique solution
    if (result.solved && result.unique && result.difficulty) {
      return {
        id: seed,
        title: `Generated ${size}×${size}`,
        difficulty: result.difficulty,
        width: size,
        height: size,
        rowClues,
        columnClues,
        solution: pattern,
      };
    }

    // If not solved → requires guessing (reject)
    // If not unique → multiple solutions (reject)
  }

  return null; // Failed to generate after max attempts
}
