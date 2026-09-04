import { test, expect } from '@playwright/test';

// Shift + left is the trackpad-friendly route to the mark-empty gesture that
// right-click and right-drag provide. Touch devices have the mode toggle
// instead, and Playwright's click is a tap there, so this is desktop-only.
test.describe('Desktop input', () => {
  test.skip(({ hasTouch }) => !!hasTouch, 'Shift-click is a desktop pointer gesture');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Pre-made Puzzles').locator('..').click();
    await page.getByRole('button').filter({ hasText: 'House' }).first().click();
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('marks a cell empty on shift + left-click', async ({ page }) => {
    const cell = page.locator('[data-row="0"][data-col="0"]');

    await cell.click({ modifiers: ['Shift'] });

    await expect(cell.getByText('×')).toBeVisible();
  });

  test('marks a run empty on shift + left-drag', async ({ page }) => {
    // Row 4 of the House solution is filled only at its ends
    const start = page.locator('[data-row="4"][data-col="1"]');
    const end = page.locator('[data-row="4"][data-col="2"]');

    await page.keyboard.down('Shift');
    await start.hover();
    await page.mouse.down();
    await end.hover();
    await page.mouse.up();
    await page.keyboard.up('Shift');

    await expect(start.getByText('×')).toBeVisible();
    await expect(end.getByText('×')).toBeVisible();
  });

  test('still fills on a plain left-click', async ({ page }) => {
    const cell = page.locator('[data-row="0"][data-col="2"]');

    await cell.click();

    await expect(cell.locator('div.absolute')).toBeVisible();
  });
});
