import { expect, test } from '@playwright/test';

test.describe('Search Flows', () => {
  test('User can search for a job title and navigate to results', async ({ page }) => {
    // 1. Navigate to the homepage
    await page.goto('/');

    // 2. Wait for the search form to be visible
    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // 3. Find the job title autocomplete input (first one)
    const searchInput = page.locator('.ami-autocomplete-input input').first();
    await expect(searchInput).toBeVisible();

    // 4. Type a valid job title
    const jobTitle = 'Software Engineer';
    await searchInput.fill(jobTitle);

    // 5. Ensure the submit button is enabled and click it
    // AmIButton uses a div with role="button"
    const submitButton = page.getByRole('button').filter({ hasText: /Check salary/i }).first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 6. Expect the browser to navigate to the salary results page
    // The path should be something like /salary/software-engineer/[country]
    await page.waitForURL(/\/salary\/software-engineer/i, { timeout: 15000 });

    // 7. Verify the new page loaded successfully
    await expect(page.locator('body')).toBeVisible();
    
    // Check that the heading or title reflects the search
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Software Engineer/i);
  });
});
