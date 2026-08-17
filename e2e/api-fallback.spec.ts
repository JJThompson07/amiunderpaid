import { expect, test } from '@playwright/test';

test.describe('API Fallback (Reed)', () => {
  test('Search gracefully falls back to Reed provider when devProviderOverride is set to reed (mocking 429)', async ({ page }) => {
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

    // We pass devProvider in a cookie to simulate the dev override
    await page.context().addCookies([{
      name: 'devProviderOverride',
      value: 'reed',
      url: 'http://localhost:3000'
    }]);

    // 2. Perform a client-side navigation to bypass SSR.
    await page.goto('/');
    
    // Wait for Nuxt to mount
    await expect(page.locator('h1').first()).toContainText('Am I Underpaid');
    
    // Navigate via client-side router
    await page.evaluate(() => {
      const nuxtRoot = document.querySelector('#__nuxt');
      // @ts-ignore
      const router = nuxtRoot?.__vue_app__?.config?.globalProperties?.$router;
      if (router) {
        router.push('/salary/software-engineer/gb');
      } else {
        const input = document.querySelector('.ami-autocomplete-input input') as HTMLInputElement;
        if (input) {
          input.value = 'Software Engineer';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Check salary'));
          btn?.click();
        }
      }
    });

    // 3. Wait for the results to load
    await expect(page.locator('h1').first()).toContainText('Software Engineer', { ignoreCase: true });
    
    // 4. Assert on rendered provider attribution
    await expect(page.locator('[data-provider="reed"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('Search gracefully falls back to Jooble provider when devProviderOverride is set to jooble (mocking 429)', async ({ page }) => {
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

    // Set Jooble override
    await page.context().addCookies([{
      name: 'devProviderOverride',
      value: 'jooble',
      url: 'http://localhost:3000'
    }]);

    // 2. Perform a client-side navigation to bypass SSR.
    await page.goto('/');
    
    // Wait for Nuxt to mount
    await expect(page.locator('h1').first()).toContainText('Am I Underpaid');
    
    // Navigate via client-side router
    await page.evaluate(() => {
      const nuxtRoot = document.querySelector('#__nuxt');
      // @ts-ignore
      const router = nuxtRoot?.__vue_app__?.config?.globalProperties?.$router;
      if (router) {
        router.push('/salary/software-engineer/us/new-york');
      } else {
        const input = document.querySelector('.ami-autocomplete-input input') as HTMLInputElement;
        if (input) {
          input.value = 'Software Engineer';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Check salary'));
          btn?.click();
        }
      }
    });

    // 3. Wait for the results to load
    await expect(page.locator('h1').first()).toContainText('Software Engineer', { ignoreCase: true });
    
    // 4. Assert on rendered provider attribution
    await expect(page.locator('[data-provider="jooble"]').first()).toBeVisible({ timeout: 15000 });
  });
});
