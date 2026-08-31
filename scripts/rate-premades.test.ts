/**
 * Rewrites src/data/puzzles.json with computed difficulty ratings.
 *
 * The premades never change, so their ratings are constants — computing them on
 * every page load would be recomputing a constant, and doing it at exactly the
 * moment the app wants its first idle period for speculative generation. Run
 * this whenever the scoring function or the puzzle list changes; a test asserts
 * the stored values still match.
 *
 * Usage: npm run rate-premades
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { ratePuzzleData } from '../src/logic/difficulty/ratePuzzle';
import { TECHNIQUE_NAMES } from '../src/logic/difficulty/types';

const PATH = new URL('../src/data/puzzles.json', import.meta.url);

it('rate premades', () => {
  const data = JSON.parse(readFileSync(PATH, 'utf8')) as {
    puzzles: { id: string; solution: string[]; difficulty?: string }[];
  };

  for (const puzzle of data.puzzles) {
    const rating = ratePuzzleData(puzzle.solution);
    delete puzzle.difficulty;
    Object.assign(puzzle, { rating });
    console.log(
      `${puzzle.id.padEnd(14)} ${TECHNIQUE_NAMES[rating.maxTechnique].padEnd(22)} ${String(rating.deductions).padStart(4)} deductions`
    );
  }

  writeFileSync(PATH, `${JSON.stringify(data, null, 2)}\n`);
  console.log('\nWrote src/data/puzzles.json');
});
