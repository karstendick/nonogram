import { test, expect } from '@playwright/test';

test.describe('Cell Sizing Tests', () => {
  test('cells should be uniform, square, and touch-friendly on mobile', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to a puzzle
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Get all cells
    const cells = page.getByRole('gridcell');
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    // Test first cell
    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();
    const firstBox = await firstCell.boundingBox();

    expect(firstBox).not.toBeNull();
    if (!firstBox) return;

    // Verify cells are square (width === height)
    expect(firstBox.width).toBe(firstBox.height);

    // Verify minimum size based on device type
    if (isMobile) {
      // On mobile, cells should be at least 40px for touch targets
      // Apple HIG recommends 44pt, but 40px is a reasonable compromise
      expect(firstBox.width).toBeGreaterThanOrEqual(40);
      expect(firstBox.height).toBeGreaterThanOrEqual(40);
    } else {
      // On desktop, cells should be at least 48px
      expect(firstBox.width).toBeGreaterThanOrEqual(48);
      expect(firstBox.height).toBeGreaterThanOrEqual(48);
    }

    // Verify uniformity - check a few more cells
    const cellsToCheck = Math.min(5, cellCount);
    for (let i = 0; i < cellsToCheck; i++) {
      const cell = cells.nth(i);
      const box = await cell.boundingBox();

      expect(box).not.toBeNull();
      if (!box) continue;

      // All cells should have the same dimensions
      expect(box.width).toBe(firstBox.width);
      expect(box.height).toBe(firstBox.height);

      // All cells should be square
      expect(box.width).toBe(box.height);
    }
  });

  test('cells should remain square on larger puzzles', async ({ page }) => {
    await page.goto('/');

    // Navigate to Enter a Seed page
    const seedButton = page.getByText('Enter a Seed').locator('..');
    await seedButton.click();

    // Generate a larger puzzle (15x15)
    await page.getByLabel('Seed').fill('test-15x15-puzzle');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();

    // Wait for game board to load - wait for actual cells to appear
    const cells = page.getByRole('gridcell');
    await expect(cells.first()).toBeVisible({ timeout: 10000 });

    // Verify cell count
    const cellCount = await cells.count();
    expect(cellCount).toBe(225); // 15x15

    // Check first and last cells to ensure uniformity across the grid
    const firstCell = cells.first();
    const lastCell = cells.last();

    const firstBox = await firstCell.boundingBox();
    const lastBox = await lastCell.boundingBox();

    expect(firstBox).not.toBeNull();
    expect(lastBox).not.toBeNull();

    if (!firstBox || !lastBox) return;

    // Both should be square
    expect(firstBox.width).toBe(firstBox.height);
    expect(lastBox.width).toBe(lastBox.height);

    // Both should have the same size
    expect(firstBox.width).toBe(lastBox.width);
    expect(firstBox.height).toBe(lastBox.height);
  });

  test('cells should maintain aspect ratio after interaction', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to a puzzle
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    const cell = page.getByRole('gridcell').first();

    // Get initial dimensions
    const initialBox = await cell.boundingBox();
    expect(initialBox).not.toBeNull();
    if (!initialBox) return;

    expect(initialBox.width).toBe(initialBox.height);

    // Click the cell to fill it
    await cell.click({ force: true });

    // Wait for any animations/transitions
    await page.waitForTimeout(100);

    // Get dimensions after interaction
    const afterBox = await cell.boundingBox();
    expect(afterBox).not.toBeNull();
    if (!afterBox) return;

    // Size should remain the same
    expect(afterBox.width).toBe(initialBox.width);
    expect(afterBox.height).toBe(initialBox.height);

    // Should still be square
    expect(afterBox.width).toBe(afterBox.height);
  });
});
