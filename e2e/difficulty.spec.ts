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
    await expect(page.getByRole('radio', { name: /Easy/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Evil/ })).toBeVisible();

    await page.getByRole('radio', { name: /Hard/ }).click();
    await expect(page.getByRole('radio', { name: /Hard/ })).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: /Play Random Puzzle/i }).click();

    // The board arrives, and the puzzle reports its measured difficulty on both
    // axes rather than a single label.
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 30000 });
    // The mobile and desktop headers are both in the DOM, one hidden by CSS.
    await expect(page.getByLabel(/^Difficulty: needs /).locator('visible=true')).toBeVisible();
  });

  test('generating the hardest level keeps the page responsive', async ({ page }) => {
    await page.getByRole('radio', { name: /Evil/ }).click();
    await page.getByRole('button', { name: /Play Random Puzzle/i }).click();

    // Evil needs reasoning by contradiction, which is the slowest thing the
    // generator does. Every query below needs the main thread, so a frozen tab
    // would time out here rather than pass.
    await expect(
      page.getByRole('button', { name: /Play Random Puzzle|Generating/i })
    ).toBeVisible();
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel(/^Difficulty: needs contradiction/).first()).toBeAttached();
  });

  test('remembers the level across a reload', async ({ page }) => {
    await page.getByRole('radio', { name: /Evil/ }).click();
    await page.getByRole('button', { name: /Play Random Puzzle/i }).click();
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 30000 });

    await page.goto('/');
    await page.getByRole('button', { name: /Back to Home/i }).click();
    await expect(page.getByRole('radio', { name: /Evil/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('premade puzzles show their measured ratings', async ({ page }) => {
    await page.getByText('Pre-made Puzzles').click();
    await expect(page.getByLabel(/^Difficulty: needs /).first()).toBeVisible();
  });
});

test('the completion screen compares your moves to the deductions required', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Pre-made Puzzles').click();
  await page.getByText('House').click();

  // Fill the solution by clicking every filled cell of the 5x5 house.
  const house = ['..#..', '.###.', '#####', '#...#', '#...#'];
  for (let r = 0; r < house.length; r++) {
    for (let c = 0; c < house[r].length; c++) {
      if (house[r][c] === '#') await page.locator(`[data-row="${r}"][data-col="${c}"]`).click();
    }
  }

  // The solve replays before the completion screen; skip it. Waiting for the
  // Skip button rather than probing for it, since it takes a moment to appear
  // and a race here made this test depend on a one-frame flash of the modal.
  await page.getByRole('button', { name: /Skip/i }).click({ timeout: 20000 });

  await expect(page.getByText('Your moves')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Deductions needed')).toBeVisible();
  await expect(page.getByText('Efficiency')).toBeVisible();
});
