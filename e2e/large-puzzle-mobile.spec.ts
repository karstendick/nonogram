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
      // On mobile, cells should still be at least 40px even for large puzzles
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    // Cells should be square
    expect(box.width).toBe(box.height);
  });
});
