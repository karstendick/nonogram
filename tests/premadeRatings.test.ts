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

  it('the two axes disagree on at least one puzzle', () => {
    // Not a style point: if every puzzle ranked the same way on both axes, the
    // second axis would be carrying no information and the whole two-axis
    // design would be unjustified. `flower` needs the hardest technique on the
    // ladder but almost no work, which is exactly the case a single number
    // cannot describe.
    const byTechnique = [...data.puzzles].sort((a, b) => a.rating.technique - b.rating.technique);
    const byWork = [...data.puzzles].sort((a, b) => a.rating.work - b.rating.work);
    expect(byTechnique.map((p) => p.id)).not.toEqual(byWork.map((p) => p.id));
  });
});
