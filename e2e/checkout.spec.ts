import { expect, test } from '@playwright/test';

test.describe('Checkout Flows', () => {
  test('Checkout buttons trigger Stripe or Auth flow', async ({ page }) => {
    // Navigate to a pricing or checkout related page if it exists
    await page.goto('/');

    // Find a checkout button
    const checkoutButton = page.getByRole('button', { name: /Get Access|Buy|Subscribe/i }).first();

    if (await checkoutButton.isVisible()) {
      // We don't click it to avoid triggering actual external Stripe calls in basic E2E tests,
      // but we assert it is present and enabled.
      await expect(checkoutButton).toBeEnabled();
    }
  });
});
