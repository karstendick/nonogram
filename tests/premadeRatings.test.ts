import { describe, it, expect } from 'vitest';
import puzzlesData from '../src/data/puzzles.json';
import { ratePuzzleData } from '../src/logic/difficulty/ratePuzzle';
import type { PuzzleCollection } from '../src/types';

/**
 * The premades' ratings are stored rather than computed at load, because they
 * never change and recomputing a constant on every page load would compete with
 * speculative generation for the one idle period that matters.
 *
 * Storing derived data means it can drift from the code that derives it. This
 * is the check that stops that happening silently — and it doubles as a
 * regression test on the scoring function.
 */
describe('premade puzzle ratings', () => {
  const data = puzzlesData as PuzzleCollection;

  it('every premade carries a rating', () => {
    expect(data.puzzles.length).toBeGreaterThan(0);
    for (const puzzle of data.puzzles) {
      expect(puzzle.rating, puzzle.id).toBeDefined();
    }
  });

  it('stored ratings match what the scoring code produces', () => {
    for (const puzzle of data.puzzles) {
      expect(
        ratePuzzleData(puzzle.solution),
        `${puzzle.id} — run \`npm run rate-premades\``
      ).toEqual(puzzle.rating);
    }
  });

  it('the two readings disagree on at least one puzzle', () => {
    // Not a style point: if every puzzle ranked the same way on both readings,
    // the deduction count would be carrying no information and reporting two
    // things would be unjustified. `flower` and `chess-knight` both need
    // reasoning by contradiction, but one takes 37 deductions and the other 103.
    const byRung = [...data.puzzles].sort((a, b) => a.rating.maxTechnique - b.rating.maxTechnique);
    const byLength = [...data.puzzles].sort((a, b) => a.rating.deductions - b.rating.deductions);
    expect(byRung.map((p) => p.id)).not.toEqual(byLength.map((p) => p.id));
  });
});
