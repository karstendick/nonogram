import { test, expect } from '@playwright/test';

test.describe('X Mark Centering', () => {
  test('X marks should be visually centered in cells', async ({ page }) => {
    await page.goto('/');

    // Select a small puzzle for easier inspection
    await page.getByText('Heart').first().click();

    // Mark a few cells as empty to see X marks
    await page.getByRole('gridcell').nth(2).click({ button: 'right' });
    await page.getByRole('gridcell').nth(7).click({ button: 'right' });
    await page.getByRole('gridcell').nth(12).click({ button: 'right' });

    // Take a screenshot for visual inspection
    await page.screenshot({ path: 'x-centering-test.png' });

    // Get a cell with an X mark
    const markedCell = page.getByRole('gridcell').nth(2);
    const cellBox = await markedCell.boundingBox();

    if (!cellBox) throw new Error('Cell not found');

    // Get the X span element
    const xSpan = markedCell.locator('span').first();
    const xBox = await xSpan.boundingBox();

    if (!xBox) throw new Error('X span not found');

    console.log('Cell box:', cellBox);
    console.log('X span box:', xBox);

    // Calculate the center of the cell
    const cellCenterY = cellBox.y + cellBox.height / 2;
    const xCenterY = xBox.y + xBox.height / 2;

    console.log('Cell center Y:', cellCenterY);
    console.log('X center Y:', xCenterY);
    console.log('Difference:', Math.abs(cellCenterY - xCenterY), 'px');

    // The X should be centered within 2px tolerance
    expect(Math.abs(cellCenterY - xCenterY)).toBeLessThan(2);
  });
});
