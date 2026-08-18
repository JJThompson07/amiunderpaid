import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { JobListing, MarketDataProvider } from '~~/shared/utils/market-data';

// This suite verifies the FRONTEND correctly renders provider-specific job
// listing UI (SectionReedJobListing / SectionJoobleJobListing) for a given
// provider. The server-side Adzuna-429-then-fallback orchestration itself
// (server/api/market-data/{jobs,salary}.ts) is covered separately by
// server/api/market-data/tests/{jobs,salary}.spec.ts via vitest.
//
// We mock the client-facing API responses directly rather than relying on
// live provider calls or the isDevOrE2e/devProviderOverride dev-only gate
// (a legitimate manual local-dev tool — see AmIDevProviderToggle.vue — but
// not something an e2e assertion should depend on): this keeps the test
// deterministic and independent of whichever server process/env Playwright
// happens to be running against.
const mockListing = (provider: MarketDataProvider): JobListing => ({
  id: 1,
  title: 'Software Engineer',
  description: 'A great software engineering role.',
  location: { display_name: 'London, UK', area: ['UK', 'London'] },
  salary_min: 50000,
  salary_max: 70000,
  category: { label: 'IT Jobs', tag: 'it-jobs' },
  company: { display_name: 'Acme Corp' },
  contract_type: 'permanent',
  contract_time: 'full_time',
  redirect_url: 'https://example.com/job/1',
  provider
});

async function mockProviderResponses(page: Page, provider: MarketDataProvider): Promise<void> {
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

  // Mock the job listings the fallback provider "returned" — this is what
  // actually drives dataProvider (and therefore which JobListing component
  // renders) in useJobs.ts.
  await page.route('**/api/market-data/jobs**', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        mean: 60000,
        count: 1,
        results: [mockListing(provider)],
        provider
      }
    });
  });

  // Mock the salary histogram from the same (fallback) provider, so the
  // distribution chart doesn't depend on a live Adzuna call either.
  await page.route('**/api/market-data/salary**', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        histogram: { 50000: 3, 60000: 5, 70000: 2 },
        provider
      }
    });
  });
}

async function navigateClientSide(page: Page, path: string): Promise<void> {
  // Perform a client-side navigation to bypass SSR — the salary/jobs fetches
  // above must happen in the browser (not on the server during SSR) for
  // page.route() to be able to intercept them.
  await page.goto('/');
  await expect(page.locator('h1').first()).toContainText('Am I Underpaid');

  await page.evaluate((targetPath) => {
    const nuxtRoot = document.querySelector('#__nuxt');
    // @ts-expect-error -- __vue_app__ is Vue's internal dev-only hook, not a typed DOM property
    const router = nuxtRoot?.__vue_app__?.config?.globalProperties?.$router;
    if (router) {
      router.push(targetPath);
    } else {
      const input = document.querySelector('.ami-autocomplete-input input') as HTMLInputElement;
      if (input) {
        input.value = 'Software Engineer';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Check salary')
        );
        btn?.click();
      }
    }
  }, path);

  await expect(page.locator('h1').first()).toContainText('Software Engineer', {
    ignoreCase: true
  });
}

test.describe('API Fallback (Reed)', () => {
  test('Search renders Reed provider attribution when the API responds with provider "reed"', async ({
    page
  }) => {
    await mockProviderResponses(page, 'reed');
    await navigateClientSide(page, '/salary/software-engineer/gb');

    await expect(page.locator('[data-provider="reed"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('Search renders Jooble provider attribution when the API responds with provider "jooble"', async ({
    page
  }) => {
    await mockProviderResponses(page, 'jooble');
    await navigateClientSide(page, '/salary/software-engineer/us/new-york');

    await expect(page.locator('[data-provider="jooble"]').first()).toBeVisible({ timeout: 15000 });
  });
});
