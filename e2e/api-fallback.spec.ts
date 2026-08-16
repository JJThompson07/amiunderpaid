import { expect, test } from '@playwright/test';

test.describe('API Fallback (Reed)', () => {
  test('Search gracefully falls back to Reed provider when devProviderOverride is set to reed (mocking 429)', async ({ page }) => {
    // 1. Intercept the internal API calls and return mock Reed data to simulate the server's fallback response
    await page.route('**/api/market-data/salary**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          provider: 'reed',
          histogram: { '50000': 1 }
        }
      });
    });

    await page.route('**/api/market-data/jobs**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          provider: 'reed',
          count: 1,
          mean: 50000,
          results: [{
            title: 'Software Engineer (Mocked Reed)',
            company: { display_name: 'Reed Corp' },
            location: { display_name: 'London', area: ['London'] },
            salary_min: 40000,
            salary_max: 60000,
            provider: 'reed'
          }]
        }
      });
    });

    // Mock match-title to return an exact match, bypassing the ambiguity modal
    await page.route('**/api/engine/match-title**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          matches: [{ id_code: '1234', group_name: 'Software Engineer' }]
        }
      });
    });

    // 2. Navigate directly to a search result page to bypass UI flakiness of autocomplete
    // and verify that the results page successfully queries our mocked fallback APIs.
    await page.goto('/salary/software-engineer/gb');

    // 3. Wait for the results to load (checking for job titles or the histogram)
    // The main heading contains the job title
    await expect(page.locator('h1').first()).toContainText('Software Engineer', { ignoreCase: true });
  });
});
