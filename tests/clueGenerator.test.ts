import { describe, it, expect } from 'vitest';
import { generateClues } from '../src/logic/clueGenerator';

describe('generateClues', () => {
  it('should generate correct row clues for a simple pattern', () => {
    const solution = [
      [true, true, false, true],
      [false, false, false, false],
      [true, true, true, true],
    ];

    const { rowClues } = generateClues(solution);

    expect(rowClues).toEqual([
      [2, 1], // Two filled, one filled
      [0], // Empty row
      [4], // Four filled
    ]);
  });

  it('should generate correct column clues for a simple pattern', () => {
    const solution = [
      [true, false, true],
      [true, false, true],
      [false, false, true],
    ];

    const { columnClues } = generateClues(solution);

    expect(columnClues).toEqual([
      [2], // Column 0: two filled
      [0], // Column 1: empty
      [3], // Column 2: three filled
    ]);
  });

  it('should handle alternating pattern correctly', () => {
    const solution = [[true, false, true, false, true]];

    const { rowClues } = generateClues(solution);

    expect(rowClues).toEqual([[1, 1, 1]]);
  });

  it('should handle all-empty grid', () => {
    const solution = [
      [false, false],
      [false, false],
    ];

    const { rowClues, columnClues } = generateClues(solution);

    expect(rowClues).toEqual([[0], [0]]);
    expect(columnClues).toEqual([[0], [0]]);
  });

  it('should handle all-filled grid', () => {
    const solution = [
      [true, true],
      [true, true],
    ];

    const { rowClues, columnClues } = generateClues(solution);

    expect(rowClues).toEqual([[2], [2]]);
    expect(columnClues).toEqual([[2], [2]]);
  });
});
