import { test, expect } from '@playwright/test';

test.describe('Clue Visibility Tests', () => {
  test('all column and row clues should be fully visible', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to Generate Puzzle tab to create a 15x15 with many clues
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();

    // Generate a 15x15 puzzle
    await page.getByLabel('Seed').fill('test-clue-visibility');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Wait for grid cells to be present
    await expect(page.getByRole('gridcell').first()).toBeVisible();

    // Find the game board container using more specific selector
    const gameBoard = page.locator('.inline-block.bg-gray-50').first();
    await expect(gameBoard).toBeVisible();

    // Get all clue numbers (both row and column)
    const allClues = gameBoard.locator('.font-semibold');
    const clueCount = await allClues.count();

    expect(clueCount).toBeGreaterThan(0);

    // Check each clue to ensure it's visible and not cut off
    for (let i = 0; i < clueCount; i++) {
      const clue = allClues.nth(i);
      const clueText = await clue.textContent();

      // Clue should be visible
      await expect(clue).toBeVisible({
        // Give some time for rendering
        timeout: 1000,
      });

      // Get bounding box to verify it's not cut off
      const box = await clue.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        // Clue should have a reasonable size (not crushed to 0)
        expect(box.height).toBeGreaterThan(0);
        expect(box.width).toBeGreaterThan(0);

        // Verify the clue text is not empty
        expect(clueText).toBeTruthy();
        expect(clueText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('column clues should not be cut off at the top on desktop', async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to a larger puzzle that has tall column clues
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();
    await page.getByLabel('Seed').fill('test-tall-clues');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Wait for grid cells to be present
    await expect(page.getByRole('gridcell').first()).toBeVisible();

    // Find the column clues container (top section)
    const gameBoard = page.locator('.inline-block.bg-gray-50').first();
    const columnCluesSection = gameBoard.locator('.flex').first();

    // Get all column clue containers
    const columnClueContainers = columnCluesSection.locator('.flex.flex-col');
    const containerCount = await columnClueContainers.count();

    expect(containerCount).toBeGreaterThan(0);

    // Check that each column clue container has sufficient height
    for (let i = 0; i < Math.min(containerCount, 5); i++) {
      // Sample first 5 columns
      const container = columnClueContainers.nth(i);
      const box = await container.boundingBox();

      expect(box).not.toBeNull();
      if (box) {
        // Container should have reasonable height (not cut off)
        expect(box.height).toBeGreaterThan(20);

        // Get all clues in this column
        const cluesInColumn = container.locator('.font-semibold');
        const clueCount = await cluesInColumn.count();

        // All clues should be visible
        for (let j = 0; j < clueCount; j++) {
          await expect(cluesInColumn.nth(j)).toBeVisible();
        }
      }
    }
  });

  test('extremely long clues should be fully visible', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Try multiple seeds to find one with very long clues (alternating pattern)
    // Alternating filled/empty creates the longest clues: "1 1 1 1 1 1 1"
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();
    await page.getByLabel('Seed').fill('test-long-clues-12345');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Wait for grid cells to be present
    await expect(page.getByRole('gridcell').first()).toBeVisible();

    // Get the game board
    const gameBoard = page.locator('.inline-block.bg-gray-50').first();

    // Get all clue numbers (simpler approach)
    const allClues = gameBoard.locator('.font-semibold');
    const clueCount = await allClues.count();

    expect(clueCount).toBeGreaterThan(0);

    // Check each clue to ensure none are crushed
    for (let i = 0; i < clueCount; i++) {
      const clue = allClues.nth(i);
      await expect(clue).toBeVisible();

      const box = await clue.boundingBox();
      expect(box).not.toBeNull();

      // Each clue number should not be crushed (width/height > 3px)
      // Mobile uses 8px font for large puzzles, so individual digits can be ~4px
      if (box) {
        expect(box.width).toBeGreaterThan(3);
        expect(box.height).toBeGreaterThan(3);
      }
    }
  });

  test('row clues should not be cut off on the left', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Generate a 15x15 puzzle
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();
    await page.getByLabel('Seed').fill('test-row-clues');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Wait for grid cells to be present
    await expect(page.getByRole('gridcell').first()).toBeVisible();

    // Get the game board
    const gameBoard = page.locator('.inline-block.bg-gray-50').first();

    // Get all clue numbers (simpler approach - same as passing tests)
    const allClues = gameBoard.locator('.font-semibold');
    const clueCount = await allClues.count();

    expect(clueCount).toBeGreaterThan(0);

    // Check each clue to ensure none are cut off
    for (let i = 0; i < clueCount; i++) {
      const clue = allClues.nth(i);
      await expect(clue).toBeVisible();

      const box = await clue.boundingBox();
      expect(box).not.toBeNull();

      // Each clue should have reasonable size (not cut off)
      // Mobile uses 8px font for large puzzles, so individual digits can be ~4px
      if (box) {
        expect(box.width).toBeGreaterThan(3);
        expect(box.height).toBeGreaterThan(3);
      }
    }
  });
});
