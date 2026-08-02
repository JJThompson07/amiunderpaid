import { expect, test } from '@playwright/test';

test.describe('Recruiter Territory Claims', () => {
  const TEST_EMAIL = 'joshuajthompson07+recruiter@gmail.com';
  const TEST_PASSWORD = 'James1993@';

  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/recruiter/login');
    
    // Check if we got redirected to dashboard
    const dashboardHeading = page.getByRole('heading', { name: /Dashboard/i }).first();
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    
    const isLoginRequired = await Promise.race([
        emailInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
        dashboardHeading.waitFor({ state: 'visible', timeout: 5000 }).then(() => false).catch(() => false)
    ]);
    
    if (isLoginRequired) {
        const passwordInput = page.locator('input[type="password"]').first();
        await emailInput.fill(TEST_EMAIL);
        await passwordInput.fill(TEST_PASSWORD);
        
        // Wait for Vue event listeners to hydrate before submitting
        await page.waitForTimeout(500);
        await passwordInput.press('Enter');
        
        await expect(dashboardHeading).toBeVisible({ timeout: 15000 });
    }
  });

  test('Recruiter can navigate to territory selection', async ({ page }) => {
    // 1. Click "Get Territories" or "Claim Territory"
    const claimBtn = page.getByRole('button').filter({ hasText: /Claim Territory|Get Territories/i }).first();
    await claimBtn.click();

    // 3. Expect the page to have the Territory Selection title
    await expect(page.getByRole('heading').filter({ hasText: /Claim|Territor/i }).first()).toBeVisible({ timeout: 15000 });
    
    // Check if the interactive UK map is present
    await expect(page.locator('svg').filter({ has: page.locator('path') }).first()).toBeVisible();
  });
});
