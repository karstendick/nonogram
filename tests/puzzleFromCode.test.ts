import { describe, it, expect } from 'vitest';
import { generatePuzzle, puzzleFromCode } from '../src/logic/puzzleGenerator';
import { encodePuzzleCode } from '../src/logic/puzzleCode';
import { parsePuzzle } from '../src/logic/puzzleParser';
import puzzlesData from '../src/data/puzzles.json';
import { SIZES } from '../src/logic/generation/levels';
import type { PuzzleData } from '../src/types';

const premades = (puzzlesData as { puzzles: PuzzleData[] }).puzzles;

describe('puzzleFromCode', () => {
  it('reproduces a generated puzzle exactly', () => {
    for (const size of SIZES) {
      const original = generatePuzzle(size, `code-${size}`, 2)!;
      const loaded = puzzleFromCode(encodePuzzleCode(original.solution))!;

      expect(loaded.solution).toEqual(original.solution);
      expect(loaded.rowClues).toEqual(original.rowClues);
      expect(loaded.columnClues).toEqual(original.columnClues);
      expect(loaded.width).toBe(size);
      expect(loaded.height).toBe(size);
    }
  });

  it('re-derives the rating the generator measured', () => {
    // Nothing about the rating travels in the code; it is recomputed from the
    // grid. If the two disagreed, a shared puzzle would misreport its difficulty.
    const original = generatePuzzle(15, 'rating-check', 4)!;
    const loaded = puzzleFromCode(encodePuzzleCode(original.solution))!;
    expect(loaded.rating).toEqual(original.rating);
  });

  it('is identified by its code', () => {
    const original = generatePuzzle(10, 'id-check', 2)!;
    const code = encodePuzzleCode(original.solution);
    expect(puzzleFromCode(code)!.id).toBe(code);
  });

  it('rejects a code whose grid is not a valid puzzle', () => {
    // Structurally fine — right length, right alphabet — but an empty grid has
    // uniform clues and is not a puzzle. This is the hand-edited-code case.
    const empty = encodePuzzleCode(
      Array.from({ length: 15 }, () => Array<boolean>(15).fill(false))
    );
    expect(empty).toHaveLength(39);
    expect(puzzleFromCode(empty)).toBeNull();

    const full = encodePuzzleCode(Array.from({ length: 5 }, () => Array<boolean>(5).fill(true)));
    expect(puzzleFromCode(full)).toBeNull();
  });

  it('rejects a malformed code without trying to solve it', () => {
    expect(puzzleFromCode('nope')).toBeNull();
    expect(puzzleFromCode('')).toBeNull();
  });

  describe('pre-made puzzles', () => {
    it('are all at a calibrated size', () => {
      // The collection and the generator offer the same sizes, which is what
      // keeps the code format's length-implies-size rule complete.
      for (const data of premades) {
        const puzzle = parsePuzzle(data);
        expect(SIZES).toContain(puzzle.width as (typeof SIZES)[number]);
        expect(puzzle.height).toBe(puzzle.width);
      }
    });

    it('come back with their name, id and stored rating', () => {
      // A code carries a grid and nothing else, so without the lookup a shared
      // "Cat" would return as "Generated 15×15".
      for (const data of premades) {
        const parsed = parsePuzzle(data);
        const loaded = puzzleFromCode(encodePuzzleCode(parsed.solution))!;

        expect(loaded.title).toBe(data.title);
        expect(loaded.id).toBe(data.id);
        expect(loaded.rating).toEqual(data.rating);
        expect(loaded.solution).toEqual(parsed.solution);
      }
    });
  });
});
