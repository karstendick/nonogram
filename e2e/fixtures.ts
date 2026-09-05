import type { Page } from '@playwright/test';

/**
 * Puzzle codes used as test fixtures.
 *
 * The suite used to build its puzzles by typing a seed and waiting for
 * generation. Pasting a code is better on both counts: the puzzle is fixed
 * rather than whatever generation happened to produce, and it opens in
 * milliseconds instead of running a search.
 */
export const CODES = {
  /** A 15×15 Medium — the size most layout tests care about. */
  medium15: '3y3rth_m-me193770j3rz_d26_ze67a4n_f9sIA',
  /** A 5×5 Easy, for tests that only need a board on screen. */
  easy5: 'xw53gA',
};

/** Open a puzzle from its code, from the landing page. */
export async function openPuzzleByCode(page: Page, code: string) {
  await page.getByRole('button', { name: /Enter a code/ }).click();
  await page.getByLabel('Puzzle code').fill(code);
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await page.waitForSelector('[role="gridcell"]');
}
