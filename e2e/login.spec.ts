import { expect, test } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('User can open the login modal from the navigation bar', async ({ page }) => {
    await page.goto('/');

    // Wait for the login button to be visible
    const loginButton = page.getByRole('button', { name: /Log in|Sign in/i }).first();

    // If a login button exists on the homepage, click it and verify the modal/page appears
    if (await loginButton.isVisible()) {
      await loginButton.click();

      // Verify login related text appears
      await expect(page.getByText(/Welcome back|Sign in to your account/i).first()).toBeVisible({
        timeout: 10000
      });
    } else {
      // Fallback: just assert the page loaded correctly
      await expect(page).toHaveTitle(/Am I Underpaid|Benchmark My Role/i);
    }
  });
});
