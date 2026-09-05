import { test, expect } from '@playwright/test';
import { CODES, openPuzzleByCode } from './fixtures';

/**
 * The round trip the whole change exists for: a puzzle you are playing can be
 * handed to someone else and come back as the same puzzle.
 */
test.describe('sharing a puzzle', () => {
  test('a code opens the same grid it came from', async ({ page }) => {
    await page.goto('/');
    await openPuzzleByCode(page, CODES.easy5);

    // The filled cells of the board we opened.
    const shape = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="gridcell"]')).map((c) => c.className)
    );

    // Go home, open the same code again, and expect the same board.
    await page.getByRole('button', { name: /Back to Home/i }).click();
    await openPuzzleByCode(page, CODES.easy5);

    const again = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="gridcell"]')).map((c) => c.className)
    );
    expect(again).toEqual(shape);
  });

  test('a link opens straight into its puzzle', async ({ page }) => {
    await page.goto(`/#${CODES.easy5}`);

    await expect(page.getByRole('gridcell')).toHaveCount(25);
    // The hash is consumed on arrival, so a reload resumes rather than
    // restarting the puzzle and discarding the player's work.
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the header offers a link for the puzzle being played', async ({ page }) => {
    await page.goto('/');
    await openPuzzleByCode(page, CODES.easy5);

    const code = page.getByRole('button', { name: /Copy link to puzzle/ }).first();
    await expect(code).toBeVisible();
    await expect(code).toContainText(CODES.easy5);
  });

  test('a link that is not a puzzle says so instead of showing nothing', async ({ page }) => {
    await page.goto('/#AAAAAA');

    await expect(page.getByText(/does not point at a valid puzzle/)).toBeVisible();
    await expect(page.getByText('Quick Play')).toBeVisible();
  });

  test('pre-made puzzles are shareable too', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Pre-made Puzzles').locator('..').click();
    await page.getByRole('button').filter({ hasText: /×/ }).first().click();
    await page.waitForSelector('[role="gridcell"]');

    await expect(page.getByRole('button', { name: /Copy link to puzzle/ }).first()).toBeVisible();
  });
});
