import { expect, test } from '@playwright/test';

test.describe('SSR Tenant Rendering', () => {
  // Ensure we are using the SSR project which has javaScriptEnabled: false

  test('Am I Underpaid UK renders UK specific initial HTML without hydration', async ({ page }) => {
    // Use the ami-uk.localhost domain to trigger the UK tenant middleware
    const response = await page.goto('http://ami-uk.localhost:3000/salary/software-engineer/uk', {
      waitUntil: 'domcontentloaded'
    });

    expect(response?.status()).toBe(200);

    // Since JS is disabled, if this is visible, it MUST have come from SSR
    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    // Assert a country-specific UK element is rendered by SSR
    // The locale should be en-GB, we can check the html lang attribute
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  });

  test('Am I Underpaid USA renders USA specific initial HTML without hydration', async ({
    page
  }) => {
    // Use the ami-us.localhost domain to trigger the US tenant middleware
    const response = await page.goto('http://ami-us.localhost:3000/salary/software-engineer/usa', {
      waitUntil: 'domcontentloaded'
    });

    expect(response?.status()).toBe(200);

    // Since JS is disabled, if this is visible, it MUST have come from SSR
    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    // Assert a country-specific US element is rendered by SSR
    // The locale should be en-US
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });
});
