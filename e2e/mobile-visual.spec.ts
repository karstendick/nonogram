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
    await expect(page.getByRole('button', { name: 'Pre-made Puzzles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Puzzle' })).toBeVisible();
  });

  test('should display game board properly on mobile', async ({ page }) => {
    await page.goto('/');

    // Select the first puzzle
    const firstPuzzle = page.locator('button[class*="cursor-pointer"]').first();
    await firstPuzzle.click();

    // Wait for game board to load
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Take a screenshot of the game board
    await page.screenshot({
      path: `screenshots/game-board-${test.info().project.name}.png`,
      fullPage: true,
    });

    // Verify game elements are visible
    await expect(page.getByRole('button', { name: /Check Solution/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Clear Grid/i })).toBeVisible();
  });

  test('should show mobile mode toggle on small screens', async ({ page, isMobile }) => {
    await page.goto('/');

    // Navigate to game
    const firstPuzzle = page.locator('button[class*="cursor-pointer"]').first();
    await firstPuzzle.click();

    // Wait for game to load
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();

    // Check if mobile mode toggle exists based on viewport
    const modeToggle = page.locator('text=Fill Mode').or(page.locator('text=Mark Mode'));

    if (isMobile) {
      // On mobile, the mode toggle should be visible
      await expect(modeToggle).toBeVisible();

      // Take screenshot showing the mode toggle
      await page.screenshot({
        path: `screenshots/mobile-controls-${test.info().project.name}.png`,
        fullPage: true,
      });
    }
  });

  test('should check layout of instructions on mobile', async ({ page }) => {
    await page.goto('/');

    // Navigate to game
    const firstPuzzle = page.locator('button[class*="cursor-pointer"]').first();
    await firstPuzzle.click();

    // Scroll to instructions
    await page.locator('text=Desktop:').scrollIntoViewIfNeeded();

    // Take screenshot of instructions area
    await page.screenshot({
      path: `screenshots/instructions-${test.info().project.name}.png`,
      fullPage: true,
    });
  });

  test('should verify responsive layout of puzzle generation tab', async ({ page }) => {
    await page.goto('/');

    // Click on Generate Puzzle tab
    await page.getByRole('button', { name: 'Generate Puzzle' }).click();

    // Wait for form to be visible
    await expect(page.locator('text=Puzzle Size')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: `screenshots/generate-puzzle-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
});
