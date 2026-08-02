import { expect, test } from '@playwright/test';

test.describe('Recruiter Dashboard Flows', () => {
  // Use a longer timeout for tests that require real authentication
  test.setTimeout(30000);

  test('Recruiter can log in and view their dashboard', async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto('/recruiter/login');

    // 2. Fill in the credentials
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.fill('joshuajthompson07+recruiter@gmail.com');
    await passwordInput.fill('James1993@');

    // 3. Click the login button
    const submitBtn = page.getByRole('button').filter({ hasText: /Sign in|login/i }).first();
    await submitBtn.click();

    // 4. Wait for navigation to the dashboard
    await page.waitForURL('**/recruiter/dashboard', { timeout: 15000 });

    // 5. Assert dashboard elements are visible
    // Wait for the "Dashboard" title or some specific text
    await expect(page.locator('h1').filter({ hasText: /Dashboard/i }).first()).toBeVisible();
    
    // Test passes if we successfully reached the dashboard!
  });
});
