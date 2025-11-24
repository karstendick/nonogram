import { test, expect } from '@playwright/test';

test.describe('Clue Visibility Tests', () => {
  test('all column and row clues should be fully visible', async ({ page }) => {
    await page.goto('/');

    // Navigate to Generate Puzzle tab to create a 15x15 with many clues
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();

    // Generate a 15x15 puzzle
    await page.getByLabel('Seed').fill('test-clue-visibility');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Find the game board container
    const gameBoard = page.locator('.bg-gray-50').first();
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

    // Navigate to a larger puzzle that has tall column clues
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();
    await page.getByLabel('Seed').fill('test-tall-clues');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Find the column clues container (top section)
    const gameBoard = page.locator('.bg-gray-50').first();
    const columnCluesSection = gameBoard.locator('.flex.gap-1').first();

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

    // Try multiple seeds to find one with very long clues (alternating pattern)
    // Alternating filled/empty creates the longest clues: "1 1 1 1 1 1 1"
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();
    await page.getByLabel('Seed').fill('test-long-clues-12345');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Get the game board
    const gameBoard = page.locator('.bg-gray-50').first();

    // Find the longest row clue (could have many numbers)
    const allRowClues = gameBoard
      .locator('.flex.gap-1')
      .last()
      .locator('.flex.flex-col')
      .first()
      .locator('.flex.items-center');

    const rowCount = await allRowClues.count();
    expect(rowCount).toBe(15);

    // Check each row clue container
    for (let i = 0; i < rowCount; i++) {
      const rowClueContainer = allRowClues.nth(i);
      const cluesInRow = rowClueContainer.locator('.font-semibold');
      const clueCount = await cluesInRow.count();

      // All individual clue numbers should be visible, even for long clues
      for (let j = 0; j < clueCount; j++) {
        const clue = cluesInRow.nth(j);
        await expect(clue).toBeVisible();

        const box = await clue.boundingBox();
        expect(box).not.toBeNull();

        // Each clue number should not be crushed
        if (box) {
          expect(box.width).toBeGreaterThan(5);
          expect(box.height).toBeGreaterThan(5);
        }
      }
    }

    // Check column clues too
    const columnCluesContainer = gameBoard.locator('.flex.gap-1').first().locator('.grid').first();
    const allColumnClues = columnCluesContainer.locator('.flex.flex-col');
    const colCount = await allColumnClues.count();

    expect(colCount).toBe(15);

    // Check each column clue
    for (let i = 0; i < colCount; i++) {
      const columnClueContainer = allColumnClues.nth(i);
      const cluesInCol = columnClueContainer.locator('.font-semibold');
      const clueCount = await cluesInCol.count();

      // All individual clue numbers should be visible
      for (let j = 0; j < clueCount; j++) {
        const clue = cluesInCol.nth(j);
        await expect(clue).toBeVisible();

        const box = await clue.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
          expect(box.width).toBeGreaterThan(5);
          expect(box.height).toBeGreaterThan(5);
        }
      }
    }
  });

  test('row clues should not be cut off on the left', async ({ page }) => {
    await page.goto('/');

    // Generate a 15x15 puzzle
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();
    await page.getByLabel('Seed').fill('test-row-clues');
    await page.getByLabel('15×15').check();
    await page.getByRole('button', { name: 'Generate Puzzle' }).last().click();

    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Find the row clues container (left section)
    const gameBoard = page.locator('.bg-gray-50').first();
    const rowCluesSection = gameBoard
      .locator('.flex.gap-1')
      .last()
      .locator('.flex.flex-col')
      .first();

    // Get all row clue containers
    const rowClueContainers = rowCluesSection.locator('.flex.items-center');
    const containerCount = await rowClueContainers.count();

    expect(containerCount).toBe(15); // Should have 15 rows

    // Check that each row clue container has all clues visible
    for (let i = 0; i < Math.min(containerCount, 5); i++) {
      // Sample first 5 rows
      const container = rowClueContainers.nth(i);

      // Get all clues in this row
      const cluesInRow = container.locator('.font-semibold');
      const clueCount = await cluesInRow.count();

      expect(clueCount).toBeGreaterThan(0);

      // All clues should be visible
      for (let j = 0; j < clueCount; j++) {
        await expect(cluesInRow.nth(j)).toBeVisible();
      }
    }
  });
});
