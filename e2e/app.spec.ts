import { test, expect } from '@playwright/test';
import { CODES, openPuzzleByCode } from './fixtures';

test.describe('Nonogram App - Basic Functionality', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Check that the title is visible
    await expect(page.getByRole('heading', { name: /Nonogram Puzzle/i })).toBeVisible();

    // Check that all three main options are present
    await expect(page.getByText('Quick Play')).toBeVisible();
    await expect(page.getByText('Enter a code')).toBeVisible();
    await expect(page.getByText('Pre-made Puzzles')).toBeVisible();
  });

  test('should navigate to pre-made puzzles and select one', async ({ page }) => {
    await page.goto('/');

    // Click on Pre-made Puzzles option
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Wait for puzzle list to load, then click on the first puzzle
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Check that we're on the game view
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();
  });

  test('should use Quick Play to start a random puzzle', async ({ page }) => {
    await page.goto('/');

    // Click the Play Random Puzzle button
    const playButton = page.getByRole('button', { name: /Play Random Puzzle/i });
    await playButton.click();

    // Wait for puzzle to generate and game to start
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Verify game grid cells are present
    const cells = page.getByRole('gridcell');
    await expect(cells.first()).toBeVisible();
  });

  test('reveals the code field in place, without leaving the landing page', async ({ page }) => {
    await page.goto('/');

    // Hidden until asked for: most players arrive without a code.
    await expect(page.getByLabel('Puzzle code')).toBeHidden();

    await page.getByRole('button', { name: /Enter a code/ }).click();

    await expect(page.getByLabel('Puzzle code')).toBeVisible();
    // Still on the landing page — this is a disclosure, not a navigation.
    await expect(page.getByText('Quick Play')).toBeVisible();
  });

  test('opens a puzzle from its code', async ({ page }) => {
    await page.goto('/');
    await openPuzzleByCode(page, CODES.easy5);

    // A 5x5 board, from six characters and no generation.
    await expect(page.getByRole('gridcell')).toHaveCount(25);
  });

  test('should show game board when playing', async ({ page }) => {
    await page.goto('/');

    // Use Quick Play to start a game
    const playButton = page.getByRole('button', { name: /Play Random Puzzle/i });
    await playButton.click();

    // Check for game elements
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Verify game grid cells are present
    const cells = page.getByRole('gridcell');
    await expect(cells.first()).toBeVisible();
  });
});
