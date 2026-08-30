import { test, expect } from '@playwright/test';

/**
 * The generation path end to end, in a real browser.
 *
 * This is the only place the Web Worker actually runs — jsdom has no Worker, so
 * the unit tests exercise the main-thread fallback. If the worker fails to
 * load or the message contract is wrong, this is what catches it.
 */
// Not run in parallel with each other: each test drives a real worker doing
// CPU-heavy puzzle generation, and several at once starve one another enough to
// look like a hang. Sequentially the whole file takes about three seconds.
test.describe.configure({ mode: 'default' });

test.describe('difficulty selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('offers difficulty levels and generates a puzzle at the chosen one', async ({ page }) => {
    await expect(page.getByRole('radio', { name: /Level 1/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Level 4/ })).toBeVisible();

    await page.getByRole('radio', { name: /Level 3/ }).click();
    await expect(page.getByRole('radio', { name: /Level 3/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await page.getByRole('button', { name: /Play Random Puzzle/i }).click();

    // The board arrives, and the puzzle reports its measured difficulty on both
    // axes rather than a single label.
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 30000 });
    // The mobile and desktop headers are both in the DOM, one hidden by CSS.
    await expect(page.getByLabel(/^Difficulty: needs /).locator('visible=true')).toBeVisible();
  });

  test('generating the hardest level keeps the page responsive', async ({ page }) => {
    await page.getByRole('radio', { name: /Level 4/ }).click();
    await page.getByRole('button', { name: /Play Random Puzzle/i }).click();

    // Level 4 needs reasoning by contradiction, which is the slowest thing the
    // generator does. Every query below needs the main thread, so a frozen tab
    // would time out here rather than pass.
    await expect(
      page.getByRole('button', { name: /Play Random Puzzle|Generating/i })
    ).toBeVisible();
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel(/^Difficulty: needs contradiction/).first()).toBeAttached();
  });

  test('remembers the level across a reload', async ({ page }) => {
    await page.getByRole('radio', { name: /Level 4/ }).click();
    await page.getByRole('button', { name: /Play Random Puzzle/i }).click();
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 30000 });

    await page.goto('/');
    await page.getByRole('button', { name: /Back to Home/i }).click();
    await expect(page.getByRole('radio', { name: /Level 4/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('premade puzzles show their measured ratings', async ({ page }) => {
    await page.getByText('Pre-made Puzzles').click();
    await expect(page.getByLabel(/^Difficulty: needs /).first()).toBeVisible();
  });
});
