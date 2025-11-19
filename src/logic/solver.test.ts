import { describe, it, expect } from 'vitest';
import { solveArray } from './solver';
import { SolverCell } from '../types';

describe('solveArray', () => {
  it('should solve a simple single block that fills the entire array', () => {
    const clues = [5];
    const knownCells = Array<SolverCell>(5).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    expect(result).toEqual([
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Filled,
    ]);
  });

  it('should solve a block that must overlap', () => {
    // Clue [3] in array of length 5
    // Possible placements: ###.., .###., ..###
    // Overlap: middle cell must be filled, others remain unknown
    const clues = [3];
    const knownCells = Array<SolverCell>(5).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    expect(result).toEqual([
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Filled,
      SolverCell.Unknown,
      SolverCell.Unknown,
    ]);
  });

  it('should handle multiple blocks with forced positions', () => {
    // Clue [2, 2] in array of length 5
    // Only one valid placement: ##.##
    const clues = [2, 2];
    const knownCells = Array<SolverCell>(5).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    expect(result).toEqual([
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Empty,
      SolverCell.Filled,
      SolverCell.Filled,
    ]);
  });

  it('should handle empty array (no blocks)', () => {
    const clues: number[] = [];
    const knownCells = Array<SolverCell>(5).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    expect(result).toEqual([
      SolverCell.Empty,
      SolverCell.Empty,
      SolverCell.Empty,
      SolverCell.Empty,
      SolverCell.Empty,
    ]);
  });

  it('should respect already known filled cells', () => {
    const clues = [3];
    const knownCells = [
      SolverCell.Unknown,
      SolverCell.Filled,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
    ];
    const result = solveArray(clues, knownCells);
    // Block of 3 must include position 1, so valid placements: ###.., .###.
    // Positions 1 and 2 are filled in all placements, position 4 is empty in all
    expect(result).toEqual([
      SolverCell.Unknown,
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Unknown,
      SolverCell.Empty,
    ]);
  });

  it('should respect already known empty cells', () => {
    const clues = [2];
    const knownCells = [
      SolverCell.Empty,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
    ];
    const result = solveArray(clues, knownCells);
    // Block of 2 cannot be at position 0, so must be in positions 1-4
    // Valid placements: .##.., ..##., ...##
    expect(result).toEqual([
      SolverCell.Empty,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
    ]);
  });

  it('should handle edge fitting - block must touch edge', () => {
    // Clue [4] in array of length 6
    // Possible placements: ####.., .####., ..####
    // Overlap: positions 2 and 3 must be filled, others remain unknown
    const clues = [4];
    const knownCells = Array<SolverCell>(6).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    expect(result).toEqual([
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Unknown,
      SolverCell.Unknown,
    ]);
  });

  it('should handle complex multi-block scenario', () => {
    // Clue [1, 1, 1] in array of length 7
    // Possible placements: #.#.#.., #.#..#., #..#.#., .#.#.#., #..#..#, .#.#..#, .#..#.#, ..#.#.#
    // No cell is forced (too many valid placements)
    const clues = [1, 1, 1];
    const knownCells = Array<SolverCell>(7).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    // All cells should still be unknown (or at least most of them)
    const unknownCount = result.filter((c) => c === SolverCell.Unknown).length;
    expect(unknownCount).toBeGreaterThan(0);
  });

  it('should deduce cells when some are already known', () => {
    // Clue [3] in array of length 5
    // If position 4 is known to be filled, block must be at positions 2-4
    const clues = [3];
    const knownCells = [
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Unknown,
      SolverCell.Filled,
    ];
    const result = solveArray(clues, knownCells);
    expect(result).toEqual([
      SolverCell.Empty,
      SolverCell.Empty,
      SolverCell.Filled,
      SolverCell.Filled,
      SolverCell.Filled,
    ]);
  });

  it('should handle case where block positions are ambiguous', () => {
    // Clue [1] in array of length 5
    // Could be at any position - nothing can be deduced
    const clues = [1];
    const knownCells = Array<SolverCell>(5).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    expect(result).toEqual(knownCells); // Nothing changes
  });

  it('should handle multiple blocks with large gaps', () => {
    // Clue [2, 2] in array of length 10
    // Many valid placements possible
    const clues = [2, 2];
    const knownCells = Array<SolverCell>(10).fill(SolverCell.Unknown);
    const result = solveArray(clues, knownCells);
    // Can't deduce much without more constraints
    const unknownCount = result.filter((c) => c === SolverCell.Unknown).length;
    expect(unknownCount).toBeGreaterThan(0);
  });
});
