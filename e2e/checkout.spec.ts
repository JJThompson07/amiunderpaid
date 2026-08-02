import { expect, test } from '@playwright/test';

test.describe('Recruiter Flows', () => {
  test('Recruiters can open the Request Access modal', async ({ page }) => {
    // Navigate to the recruiter login page where "Request Access" button exists
    await page.goto('/recruiter/login');
    
    // There should be a "Request Access" button
    const requestAccessBtn = page.getByRole('button').filter({ hasText: /Request Access/i }).first();
    
    // Ensure the button is visible and click it
    await expect(requestAccessBtn).toBeVisible();
    await requestAccessBtn.click();
    
    // The modal should appear
    const modalTitle = page.getByText(/Request Partner Access/i).first();
    await expect(modalTitle).toBeVisible();

    // Check for Agency Name and Email fields in the modal
    await expect(page.getByText(/Agency Name/i).first()).toBeVisible();
    await expect(page.getByText(/Email Address/i).first()).toBeVisible();
  });
});
