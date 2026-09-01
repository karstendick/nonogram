import { test, expect, type Page } from '@playwright/test';

// The pre-made "House" puzzle: filled cells of its 5x5 solution
const HOUSE_FILLED: Array<[number, number]> = [
  [0, 2],
  [1, 1],
  [1, 2],
  [1, 3],
  [2, 0],
  [2, 1],
  [2, 2],
  [2, 3],
  [2, 4],
  [3, 0],
  [3, 4],
  [4, 0],
  [4, 4],
];

const openHousePuzzle = async (page: Page) => {
  await page.goto('/');
  await page.getByText('Pre-made Puzzles').locator('..').click();
  await page.getByRole('button').filter({ hasText: 'House' }).first().click();
  await expect(page.getByRole('grid')).toBeVisible();
};

const solveHouse = async (page: Page) => {
  // A couple of X-marks first, so the replay has both kinds of mark
  for (const [row, col] of [
    [0, 0],
    [0, 1],
  ]) {
    await page.locator(`[data-row="${row}"][data-col="${col}"]`).click({ button: 'right' });
  }

  for (const [row, col] of HOUSE_FILLED) {
    await page.locator(`[data-row="${row}"][data-col="${col}"]`).click();
  }
};

test.describe('Solve replay', () => {
  test('replays the solve before showing the completion modal', async ({ page }) => {
    await openHousePuzzle(page);
    await solveHouse(page);

    // Replay runs first; the modal waits for it
    await expect(page.getByText('Replaying your solve…')).toBeVisible();
    await expect(page.getByText('Puzzle Complete!')).not.toBeVisible();

    // It finishes on its own and hands off to the modal
    await expect(page.getByText('Puzzle Complete!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Replaying your solve…')).not.toBeVisible();
  });

  test('does not flash the completion modal before the replay starts', async ({ page }) => {
    await openHousePuzzle(page);

    // Record whichever of the two paints first. Plain assertions cannot catch
    // this: they auto-wait, so a modal that appears for one frame and vanishes
    // still satisfies "eventually not visible". Deriving the replay phase in an
    // effect used to leave exactly that gap, because effects run after paint.
    await page.evaluate(() => {
      const w = window as unknown as { __firstSeen: string | null };
      w.__firstSeen = null;
      const check = () => {
        if (w.__firstSeen) return;
        const text = document.body.textContent ?? '';
        if (text.includes('Puzzle Complete!')) w.__firstSeen = 'modal';
        else if (text.includes('Replaying your solve')) w.__firstSeen = 'replay';
      };
      new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
      check();
    });

    await solveHouse(page);
    await expect(page.getByText('Replaying your solve…')).toBeVisible();

    const firstSeen = await page.evaluate(
      () => (window as unknown as { __firstSeen: string | null }).__firstSeen
    );
    expect(firstSeen).toBe('replay');
  });

  test('replays again from the completion modal', async ({ page }) => {
    await openHousePuzzle(page);
    await solveHouse(page);

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByText('Puzzle Complete!')).toBeVisible();

    await page.getByRole('button', { name: 'Watch Again' }).click();

    await expect(page.getByText('Replaying your solve…')).toBeVisible();
    await expect(page.getByText('Puzzle Complete!')).not.toBeVisible();
  });

  test('skipping goes straight to the completion modal', async ({ page }) => {
    await openHousePuzzle(page);
    await solveHouse(page);

    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByText('Puzzle Complete!')).toBeVisible();
    await expect(page.getByText('Replaying your solve…')).not.toBeVisible();
  });
});
