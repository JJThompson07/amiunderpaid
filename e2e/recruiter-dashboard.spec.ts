import { expect, test } from '@playwright/test';

test.describe('Recruiter Dashboard Flows', () => {
  const TEST_EMAIL = process.env.E2E_RECRUITER_EMAIL || 'joshuajthompson07+recruiter@gmail.com';
  const TEST_PASSWORD = process.env.E2E_RECRUITER_PASSWORD || '';

  test('Recruiter can log in and view their dashboard', async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto('/recruiter/login');

    // 2. Fill in the credentials
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // 3. Wait for Vue event listeners to hydrate before submitting
    await page.waitForTimeout(500);
    await passwordInput.press('Enter');

    // 4. Wait for navigation to the dashboard
    const dashboardHeading = page.getByRole('heading', { name: /Dashboard/i }).first();
    await expect(dashboardHeading).toBeVisible({ timeout: 15000 });

    // Test passes if we successfully reached the dashboard!
  });
});
