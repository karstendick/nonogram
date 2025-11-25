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

    // Verify cell starts empty (white background)
    await expect(firstCell).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    // Tap the cell once
    await firstCell.tap();

    // Wait a bit for any potential double-fire events
    await page.waitForTimeout(100);

    // Verify the cell is filled (not empty). It could be gray-800 (correct) or red-600 (mistake)
    // The important thing is it's NOT white (empty), which would indicate a double-fire bug
    const backgroundColor = await firstCell.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // Should be either gray-800 (rgb(31, 41, 55)) or red-600 (rgb(220, 38, 38))
    // Should NOT be white (rgb(255, 255, 255)) or gray-50 (rgb(249, 250, 251))
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
    expect(backgroundColor).not.toBe('rgb(249, 250, 251)');
  });

  test('single tap should mark empty without immediate unmark', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Switch to mark empty mode
    const markEmptyButton = page.getByRole('button', { name: 'Mark Empty' });
    await markEmptyButton.click();

    // Get the first cell
    const firstCell = page.locator('[role="gridcell"][data-row="0"][data-col="0"]');

    // Verify cell starts empty (white background)
    await expect(firstCell).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    // Tap the cell once
    await firstCell.tap();

    // Wait a bit for any potential double-fire events
    await page.waitForTimeout(100);

    // Verify the cell shows an X (marked empty)
    // The important thing is the X is visible, meaning it stayed marked and wasn't toggled back
    const xMark = firstCell.locator('span:has-text("×")');
    await expect(xMark).toBeVisible();

    // Verify the cell is NOT filled (should be white/gray, not dark)
    const backgroundColor = await firstCell.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // Should NOT be gray-800 (filled) or red-600 (filled mistake)
    expect(backgroundColor).not.toBe('rgb(31, 41, 55)');
    expect(backgroundColor).not.toBe('rgb(220, 38, 38)');
  });
});
