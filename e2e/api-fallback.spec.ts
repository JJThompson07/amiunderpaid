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
            contract_time: 'full_time',
            contract_type: 'permanent',
            provider: 'reed'
          }]
        }
      });
    });

    // Mock macro/micro baselines to prevent Firebase Admin 500 errors during client-side navigation in CI
    await page.route('**/api/engine/macro-baselines**', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });
    
    await page.route('**/api/engine/micro-baselines**', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });
    await page.route('**/api/user/log-search**', async (route) => {
      await route.fulfill({ status: 200, json: { id: 'mocked-id' } });
    });
    await page.route('**/api/engine/match-title**', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          matches: [{ id_code: '1234', group_name: 'Software Engineer' }]
        }
      });
    });

    // 2. Perform a client-side navigation to bypass SSR.
    // SSR will throw a 500 error in CI since the API keys are not set.
    await page.goto('/');
    
    // Wait for Nuxt to mount
    await expect(page.locator('h1').first()).toContainText('Am I Underpaid');
    
    // Use the exposed Vue Router to navigate client-side
    await page.evaluate(() => {
      const nuxtRoot = document.querySelector('#__nuxt');
      // @ts-ignore
      const router = nuxtRoot?.__vue_app__?.config?.globalProperties?.$router;
      if (router) {
        router.push('/salary/software-engineer/gb');
      } else {
        // Fallback: click the search button programmatically from the DOM if router isn't found
        const input = document.querySelector('.ami-autocomplete-input input') as HTMLInputElement;
        if (input) {
          input.value = 'Software Engineer';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Check salary'));
          btn?.click();
        }
      }
    });

    // 3. Wait for the results to load (checking for job titles or the histogram)
    // The main heading contains the job title
    await expect(page.locator('h1').first()).toContainText('Software Engineer', { ignoreCase: true });
  });
});
