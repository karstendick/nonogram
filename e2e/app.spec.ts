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

    // Click on the first puzzle (assumes there are puzzle cards)
    const firstPuzzle = page.locator('button[class*="cursor-pointer"]').first();
    await firstPuzzle.click();

    // Check that we're on the game view
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();
  });

  test('should show game controls when playing', async ({ page }) => {
    await page.goto('/');

    // Select first puzzle
    const firstPuzzle = page.locator('button[class*="cursor-pointer"]').first();
    await firstPuzzle.click();

    // Check for controls
    await expect(page.getByRole('button', { name: /Check Solution/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Clear Grid/i })).toBeVisible();
  });
});
