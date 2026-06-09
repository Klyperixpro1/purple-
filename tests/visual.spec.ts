import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage - desktop', async ({ page }) => {
    // Set viewport to 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('http://localhost:8080');
    // Wait for hydration or animations
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('homepage-desktop-atf.png', { 
      maxDiffPixelRatio: 0.005,
      mask: [page.locator('video')]
    });
  });

  test('homepage - mobile', async ({ page }) => {
    // Set viewport to 375x812
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:8080');
    // Wait for hydration or animations
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('homepage-mobile-atf.png', { 
      maxDiffPixelRatio: 0.005,
      mask: [page.locator('video')]
    });
  });
});
