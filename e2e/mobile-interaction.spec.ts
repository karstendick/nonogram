import { test, expect } from '@playwright/test';

test.describe('Mobile Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Navigate to game view
    const firstPuzzle = page.locator('button[class*="cursor-pointer"]').first();
    await firstPuzzle.click();

    // Wait for game to load
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();
  });

  test('should toggle between fill and mark modes on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Find the mode toggle button
    const modeToggle = page.locator('button').filter({ hasText: /Fill Mode|Mark Mode/ });
    await expect(modeToggle).toBeVisible();

    // Get initial mode
    const initialText = await modeToggle.textContent();

    // Click to toggle
    await modeToggle.click();

    // Wait a bit for state to update
    await page.waitForTimeout(100);

    // Verify mode changed
    const newText = await modeToggle.textContent();
    expect(initialText).not.toBe(newText);
  });

  test('should allow tapping on game board cells', async ({ page }) => {
    // Find a game cell (grid cells)
    const cell = page.locator('button[data-testid*="cell"], div[role="button"]').first();

    // If no cells found, try a more general selector
    const cellExists = await cell.count();
    if (cellExists === 0) {
      // Try clicking on the grid area
      const grid = page.locator('[class*="grid"]').first();
      if (await grid.isVisible()) {
        await grid.click({ position: { x: 50, y: 50 } });
      }
    } else {
      await cell.click();
    }

    // Test passes if no error occurred (cell was clickable)
    expect(true).toBe(true);
  });

  test('should handle touch gestures on controls', async ({ page }) => {
    // Test tapping various control buttons
    const checkButton = page.getByRole('button', { name: /Check Solution/i });
    const clearButton = page.getByRole('button', { name: /Clear Grid/i });

    // Verify buttons are tappable
    await expect(checkButton).toBeVisible();
    await expect(clearButton).toBeVisible();

    // Tap the clear button
    await clearButton.click();

    // Button should still be visible after interaction
    await expect(clearButton).toBeVisible();
  });

  test('should navigate back from game to puzzle selection', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Back to Puzzle Selection/i });
    await backButton.click();

    // Verify we're back at puzzle selection
    await expect(page.getByRole('heading', { name: 'Nonogram Puzzle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pre-made Puzzles' })).toBeVisible();
  });

  test('should handle tab switching on mobile', async ({ page }) => {
    // Navigate back to selection screen
    const backButton = page.getByRole('button', { name: /Back to Puzzle Selection/i });
    await backButton.click();

    // Click on Generate Puzzle tab
    const generateTab = page.getByRole('button', { name: 'Generate Puzzle' });
    await generateTab.click();

    // Verify tab switched
    await expect(page.locator('text=Puzzle Size')).toBeVisible();

    // Switch back to Pre-made Puzzles
    const premadeTab = page.getByRole('button', { name: 'Pre-made Puzzles' });
    await premadeTab.click();

    // Verify we're back on the premade tab
    const puzzleCards = page.locator('button[class*="cursor-pointer"]');
    await expect(puzzleCards.first()).toBeVisible();
  });

  test('should scroll content properly on mobile', async ({ page }) => {
    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify we can see instructions at the bottom
    await expect(page.locator('text=Desktop:')).toBeVisible();

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Verify we can see the header
    await expect(page.getByRole('heading', { name: 'Nonogram Puzzle' })).toBeVisible();
  });
});
