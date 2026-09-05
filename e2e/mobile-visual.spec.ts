import { test, expect } from '@playwright/test';

test.describe('Mobile Visual Tests', () => {
  test('should display puzzle selection properly on mobile', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await expect(page.getByRole('heading', { name: 'Nonogram Puzzle' })).toBeVisible();

    // Take a screenshot of the puzzle selection screen
    await page.screenshot({
      path: `screenshots/puzzle-selection-${test.info().project.name}.png`,
      fullPage: true,
    });

    // Verify key elements are visible
    await expect(page.getByText('Quick Play')).toBeVisible();
    await expect(page.getByText('Enter a code')).toBeVisible();
    await expect(page.getByText('Pre-made Puzzles')).toBeVisible();
  });

  test('should display game board properly on mobile', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Select the first puzzle
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Take a screenshot of the game board
    await page.screenshot({
      path: `screenshots/game-board-${test.info().project.name}.png`,
      fullPage: true,
    });

    // Verify game elements are visible
    const cells = page.getByRole('gridcell');
    await expect(cells.first()).toBeVisible();
  });

  test('should show mobile mode toggle on small screens', async ({ page, isMobile }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to game
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();

    // Check if mobile mode toggle exists based on viewport
    const fillButton = page.getByRole('button', { name: 'Fill' });
    const markButton = page.getByRole('button', { name: 'Mark Empty' });

    if (isMobile) {
      // On mobile, the mode toggle buttons should be visible
      await expect(fillButton).toBeVisible();
      await expect(markButton).toBeVisible();

      // Take screenshot showing the mode toggle
      await page.screenshot({
        path: `screenshots/mobile-controls-${test.info().project.name}.png`,
        fullPage: true,
      });
    }
  });

  test('should check layout of full game view', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to game
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Scroll to bottom to see controls
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Take screenshot of full game layout
    await page.screenshot({
      path: `screenshots/full-game-layout-${test.info().project.name}.png`,
      fullPage: true,
    });

    // Verify game grid is visible
    const cells = page.getByRole('gridcell');
    await expect(cells.first()).toBeVisible();
  });

  test('should verify responsive layout of the code field', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Enter a code/ }).click();
    await expect(page.getByLabel('Puzzle code')).toBeVisible();

    // The input and its Enter button share a row; this is the shot that would
    // show them wrapping or overflowing on a narrow screen.
    await page.screenshot({
      path: `screenshots/enter-code-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
});
