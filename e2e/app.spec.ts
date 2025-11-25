import { test, expect } from '@playwright/test';

test.describe('Nonogram App - Basic Functionality', () => {
  test('should load the puzzle selection screen', async ({ page }) => {
    await page.goto('/');

    // Check that the title is visible
    await expect(page.getByRole('heading', { name: 'Nonogram Puzzle' })).toBeVisible();

    // Check that the tabs are present
    await expect(page.getByRole('button', { name: 'Pre-made Puzzles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Puzzle' })).toBeVisible();
  });

  test('should navigate to game view when puzzle is selected', async ({ page }) => {
    await page.goto('/');

    // Wait for puzzle list to load, then click on the first puzzle
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Check that we're on the game view
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();
  });

  test('should show game board when playing', async ({ page }) => {
    await page.goto('/');

    // Wait for puzzle list and select first puzzle
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Check for game elements
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Verify game grid cells are present
    const cells = page.getByRole('gridcell');
    await expect(cells.first()).toBeVisible();
  });
});
