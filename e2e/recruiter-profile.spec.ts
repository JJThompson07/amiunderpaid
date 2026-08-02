import { expect, test } from '@playwright/test';

test.describe('Recruiter Profile Settings', () => {
  // Use the isolated test account
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
        
        // Wait for navigation to dashboard by checking for heading
        await expect(dashboardHeading).toBeVisible({ timeout: 15000 });
        
        // Give Firebase Auth a moment to persist the session to IndexedDB before full page reloads
        await page.waitForTimeout(1000);
    }
  });

  test('Recruiter can navigate to profile and change billing currency', async ({ page }) => {
    // 1. Navigate to Profile Settings from Dashboard
    const profileBtn = page.getByRole('button', { name: /Profile/i }).first();
    await profileBtn.click();

    // 3. Ensure profile heading is visible
    await expect(page.getByRole('heading', { name: /Account Settings|Profile/i }).first()).toBeVisible({ timeout: 15000 });

    // 4. Change Billing Currency
    // Since it's a custom select `AmIInputSelect`, we need to click it and then select the option.
    // Actually, `AmIInputSelect` might render as a button or a div.
    // Let's just find the text 'UK' or 'USA' inside the combobox/select.
    // Assuming the user has 'UK' or 'USA' initially.
    
    // We can look for the "Billing Currency" label.
    await expect(page.getByText(/Billing Currency/i).first()).toBeVisible();
    
    const ukSelected = await page.getByText(/United Kingdom/i).first().isVisible();

    // Click the select dropdown for billing
    const currencySelect = page.locator('.ami-input-select').first().locator('input').first();
    await currencySelect.click();

    // Select the other option
    if (ukSelected) {
      const optionUSA = page.getByText(/United States/i).last();
      await optionUSA.click();
      await expect(page.getByText(/United States/i).first()).toBeVisible({ timeout: 10000 });
    } else {
      const optionUK = page.getByText(/United Kingdom/i).last();
      await optionUK.click();
      await expect(page.getByText(/United Kingdom/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Recruiter can modify inbound email', async ({ page }) => {
    // 1. Navigate to Profile Settings from Dashboard
    const profileBtn = page.getByRole('button', { name: /Profile/i }).first();
    await profileBtn.click();

    // 2. Wait for profile heading to confirm navigation
    await expect(page.getByRole('heading', { name: /Account Settings|Profile/i }).first()).toBeVisible({ timeout: 15000 });

    // 2. Find Inbound Email field
    const inboundInput = page.locator('input[type="email"]').last(); // It's the second email field on the page
    
    // 3. Update the field
    await inboundInput.fill('test-inbound@example.com');
    
    // The profile saves when you hit save button, wait, does inbound email save on type or on a save button?
    // In profile.vue, there is a "Save Changes" button for industries AND inbound email!
    await page.getByRole('button').filter({ hasText: /Save/i }).click();

    // 4. Expect success message
    await expect(page.getByText(/Saved/i).first()).toBeVisible({ timeout: 10000 });
  });
});
