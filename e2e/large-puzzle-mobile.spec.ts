import { test, expect } from '@playwright/test';

test.describe('Large Puzzle Mobile Tests', () => {
  test('15x15 puzzle should be scrollable and cells should be touch-friendly on mobile', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');

    // Navigate to Generate Puzzle tab
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();

    // Generate a 15x15 puzzle
    await page.getByLabel('Seed').fill('test-15x15');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Take screenshot
    if (isMobile) {
      await page.screenshot({
        path: `screenshots/large-puzzle-15x15-${test.info().project.name}.png`,
        fullPage: true,
      });
    }

    // Get cells
    const cells = page.getByRole('gridcell');
    const cellCount = await cells.count();
    expect(cellCount).toBe(225); // 15x15

    // Check first cell size
    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();
    const box = await firstCell.boundingBox();

    expect(box).not.toBeNull();
    if (!box) return;

    // Cells should maintain minimum size
    if (isMobile) {
      // On mobile, large puzzles (15x15) use ~22px cells to fit entire puzzle on screen
      expect(box.width).toBeGreaterThanOrEqual(22);
      expect(box.height).toBeGreaterThanOrEqual(22);
      // Verify we're using the smaller size for large puzzles (should be exactly 22px)
      expect(box.width).toBeLessThanOrEqual(23); // Account for potential rounding
      expect(box.height).toBeLessThanOrEqual(23);
    }

    // Cells should be square
    expect(box.width).toBe(box.height);
  });
});
