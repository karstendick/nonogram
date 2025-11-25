import { test, expect } from '@playwright/test';

test.describe('Mobile Touch Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to game view
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();
  });

  test('single tap should fill cell without immediate unfill', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Get the first cell
    const firstCell = page.locator('[role="gridcell"][data-row="0"][data-col="0"]');

    // Verify cell starts empty (no inner fill div)
    const initialFillDiv = firstCell.locator('div.absolute.inset-\\[2px\\]');
    await expect(initialFillDiv).not.toBeVisible();

    // Tap the cell once
    await firstCell.tap();

    // Wait a bit for any potential double-fire events
    await page.waitForTimeout(100);

    // Verify the cell is filled by checking for the inner fill div
    // The important thing is the fill div exists, which would NOT happen if there was a double-fire bug
    const fillDiv = firstCell.locator('div.absolute.inset-\\[2px\\]');
    await expect(fillDiv).toBeVisible();

    // Verify the fill div has a filled color (not empty)
    const fillColor = await fillDiv.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Should be a filled color (gray-800, gray-700, red-600, red-500, etc.)
    // NOT white or transparent
    expect(fillColor).not.toBe('rgb(255, 255, 255)');
    expect(fillColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(fillColor).not.toBe('transparent');
  });

  test('single tap should mark empty without immediate unmark', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Switch to mark empty mode
    const markEmptyButton = page.getByRole('button', { name: 'Mark empty mode' });
    await markEmptyButton.click();

    // Get the first cell
    const firstCell = page.locator('[role="gridcell"][data-row="0"][data-col="0"]');

    // Verify cell starts empty (no X mark, no fill div)
    const initialXMark = firstCell.locator('span:has-text("×")');
    await expect(initialXMark).not.toBeVisible();
    const initialFillDiv = firstCell.locator('div.absolute.inset-\\[2px\\]');
    await expect(initialFillDiv).not.toBeVisible();

    // Tap the cell once
    await firstCell.tap();

    // Wait a bit for any potential double-fire events
    await page.waitForTimeout(100);

    // Verify the cell shows an X (marked empty)
    // The important thing is the X is visible, meaning it stayed marked and wasn't toggled back
    const xMark = firstCell.locator('span:has-text("×")');
    await expect(xMark).toBeVisible();

    // Verify the cell is NOT filled (should not have an inner fill div)
    const fillDiv = firstCell.locator('div.absolute.inset-\\[2px\\]');
    await expect(fillDiv).not.toBeVisible();
  });
});
