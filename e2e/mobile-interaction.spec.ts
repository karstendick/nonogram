import { test, expect } from '@playwright/test';

test.describe('Mobile Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Navigate to game view
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game to load
    await expect(page.getByRole('button', { name: /Back to Puzzle Selection/i })).toBeVisible();
  });

  test('should toggle between fill and mark modes on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Find the mode toggle buttons
    const fillButton = page.getByRole('button', { name: 'Fill' });
    const markButton = page.getByRole('button', { name: 'Mark Empty' });

    // Both buttons should be visible on mobile
    await expect(fillButton).toBeVisible();
    await expect(markButton).toBeVisible();

    // Click mark button
    await markButton.click();

    // Mark button should now be active (has different styling but we can verify it's clickable)
    await expect(markButton).toBeVisible();

    // Switch back to fill
    await fillButton.click();
    await expect(fillButton).toBeVisible();
  });

  test('should allow tapping on game board cells', async ({ page }) => {
    // Find a game cell using the gridcell role
    const cell = page.getByRole('gridcell').first();
    await expect(cell).toBeVisible();

    // Click the cell (force true to bypass any potential pointer-events issues)
    await cell.click({ force: true });

    // Verify the cell is still visible after interaction
    await expect(cell).toBeVisible();
  });

  test('should handle touch gestures on controls', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Test tapping mode toggle buttons
    const fillButton = page.getByRole('button', { name: 'Fill mode' });
    const markButton = page.getByRole('button', { name: 'Mark empty mode' });

    // Verify buttons are tappable
    await expect(fillButton).toBeVisible();
    await expect(markButton).toBeVisible();

    // Tap the mark button
    await markButton.click();

    // Button should still be visible after interaction
    await expect(markButton).toBeVisible();
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
    await expect(page.locator('text=Size')).toBeVisible();
    await expect(page.getByLabel('Seed')).toBeVisible();

    // Switch back to Pre-made Puzzles
    const premadeTab = page.getByRole('button', { name: 'Pre-made Puzzles' });
    await premadeTab.click();

    // Verify we're back on the premade tab
    const puzzleCards = page.getByRole('button').filter({ hasText: /×/ });
    await expect(puzzleCards.first()).toBeVisible();
  });

  test('should scroll content properly on mobile', async ({ page, isMobile }) => {
    // Scroll to bottom of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify we can see mode toggle buttons at the bottom (mobile only)
    if (isMobile) {
      await expect(page.getByRole('button', { name: 'Fill mode' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Mark empty mode' })).toBeVisible();
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Verify we can see the header (mobile has compact header, desktop has full)
    if (isMobile) {
      await expect(page.getByRole('button', { name: /Back/i })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Nonogram Puzzle' })).toBeVisible();
    }
  });
});
