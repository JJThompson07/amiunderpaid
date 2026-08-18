import { expect, test } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Recruiter can navigate to the login page and see the form', async ({ page }) => {
    // Navigate directly to the recruiter login page
    await page.goto('/recruiter/login');

    // Wait for the login form to be visible
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Verify the email and password inputs exist
    const emailInput = page.locator('input[type="text"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Verify the Sign In button is visible (it's rendered via AmIButton)
    const submitBtn = page
      .getByRole('button')
      .filter({ hasText: /Sign in|login/i })
      .first();
    await expect(submitBtn).toBeVisible();
  });
});
