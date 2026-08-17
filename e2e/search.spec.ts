import { expect, test } from '@playwright/test';

test.describe('Search Flows', () => {
  test('Homepage loads with search form and interactive elements', async ({ page }) => {
    // 1. Navigate to the homepage
    await page.goto('/');

    // 2. Wait for the search form to be visible
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // 3. Find the job title autocomplete input
    const searchInput = page.locator('.ami-autocomplete-input input').first();
    await expect(searchInput).toBeVisible();

    // 4. Type into the input and verify it accepts text
    await searchInput.fill('Software Engineer');
    await expect(searchInput).toHaveValue('Software Engineer');

    // 5. Verify the submit button is present and visible
    const submitButton = page
      .getByRole('button')
      .filter({ hasText: /Check salary/i })
      .first();
    await expect(submitButton).toBeVisible();
  });
});
