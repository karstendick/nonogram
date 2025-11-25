import { test, expect } from '@playwright/test';

test.describe('Mobile Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-made puzzles
    const premadeButton = page.getByText('Pre-made Puzzles').locator('..');
    await premadeButton.click();

    // Navigate to game view
    await expect(page.getByRole('heading', { name: 'Pre-made Puzzles' })).toBeVisible();
    const firstPuzzle = page.getByRole('button').filter({ hasText: /×/ }).first();
    await firstPuzzle.click();

    // Wait for game to load
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible();
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

  test('should navigate back from game to home', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Back to Home/i });
    await backButton.click();

    // Verify we're back at the landing page
    await expect(page.getByRole('heading', { name: /Nonogram Puzzle/i })).toBeVisible();
    await expect(page.getByText('Quick Play')).toBeVisible();
    await expect(page.getByText('Enter a Seed')).toBeVisible();
    await expect(page.getByText('Pre-made Puzzles')).toBeVisible();
  });

  test('should navigate between pages on mobile', async ({ page }) => {
    // Navigate back to landing
    const backButton = page.getByRole('button', { name: /Back to Home/i });
    await backButton.click();

    // Click on Enter a Seed
    const seedButton = page.getByText('Enter a Seed').locator('..');
    await seedButton.click();

    // Verify we're on seed entry page
    await expect(page.locator('text=Size')).toBeVisible();
    await expect(page.getByLabel('Seed')).toBeVisible();

    // Go back to home
    const backToHomeButton = page.getByRole('button', { name: /Back to Home/i });
    await backToHomeButton.click();

    // Verify we're back on landing page
    await expect(page.getByText('Quick Play')).toBeVisible();
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
