import { describe, it, expect } from 'vitest';
import { generatePuzzle } from './puzzleGenerator';

describe('puzzleGenerator', () => {
  it('should generate a valid 5x5 puzzle with a given seed', () => {
    const puzzle = generatePuzzle(5, 'test-seed-123');
    expect(puzzle).not.toBeNull();

    if (puzzle) {
      expect(puzzle.id).toBe('test-seed-123');
      expect(puzzle.width).toBe(5);
      expect(puzzle.height).toBe(5);
      expect(puzzle.solution).toHaveLength(5);
      expect(puzzle.solution[0]).toHaveLength(5);
      expect(puzzle.rowClues).toHaveLength(5);
      expect(puzzle.columnClues).toHaveLength(5);
      expect(puzzle.rating).toBeDefined();
      expect(puzzle.rating!.technique).toBeGreaterThanOrEqual(0);
      expect(puzzle.rating!.work).toBeGreaterThanOrEqual(0);
    }
  });

  it('should generate a valid 10x10 puzzle with a given seed', () => {
    const puzzle = generatePuzzle(10, 'test-seed-456');
    expect(puzzle).not.toBeNull();

    if (puzzle) {
      expect(puzzle.width).toBe(10);
      expect(puzzle.height).toBe(10);
      expect(puzzle.solution).toHaveLength(10);
      expect(puzzle.solution[0]).toHaveLength(10);
    }
  });

  it('should generate a valid 15x15 puzzle with a given seed', () => {
    const puzzle = generatePuzzle(15, 'test-seed-789');
    expect(puzzle).not.toBeNull();

    if (puzzle) {
      expect(puzzle.width).toBe(15);
      expect(puzzle.height).toBe(15);
      expect(puzzle.solution).toHaveLength(15);
      expect(puzzle.solution[0]).toHaveLength(15);
    }
  });

  it('should generate the same puzzle for the same seed', () => {
    const seed = 'reproducible-seed';
    const puzzle1 = generatePuzzle(10, seed);
    const puzzle2 = generatePuzzle(10, seed);

    expect(puzzle1).toEqual(puzzle2);
  });

  it('should generate different puzzles for different seeds', () => {
    const puzzle1 = generatePuzzle(10, 'seed-1');
    const puzzle2 = generatePuzzle(10, 'seed-2');

    expect(puzzle1).not.toEqual(puzzle2);
  });
});
