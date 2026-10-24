import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const TOAST_DELAY_MS = 7000;

const mockJobsResponse = {
  mean: 40000,
  count: 1,
  provider: 'reed',
  results: [
    {
      id: 1,
      title: 'Software Engineer',
      description: 'An exact match role',
      category: { label: 'IT Jobs', tag: 'it-jobs' },
      company: { display_name: 'Acme Corp' },
      location: { display_name: 'London', area: ['London'] },
      salary_min: 38000,
      salary_max: 42000,
      contract_time: 'full_time',
      contract_type: 'permanent',
      redirect_url: 'https://example.com/job/1',
      provider: 'reed'
    }
  ],
  similarResults: []
};

const mockRoutes = async (page: Page): Promise<void> => {
  // Results-page data is fetched client-side after a client navigation, so these
  // intercepts apply (see the SSR note in e2e/job-search.spec.ts).
  await page.route('**/api/market-data/jobs**', async (route) => {
    await route.fulfill({ status: 200, json: mockJobsResponse });
  });
  await page.route('**/api/engine/match-title**', async (route) => {
    await route.fulfill({
      status: 200,
      json: { matches: [{ id_code: '1234', group_name: 'Software Engineer' }] }
    });
  });
  await page.route('**/api/engine/macro-baselines**', async (route) => {
    await route.fulfill({ status: 200, json: {} });
  });
  await page.route('**/api/engine/micro-baselines**', async (route) => {
    await route.fulfill({ status: 200, json: {} });
  });
  await page.route('**/api/user/search/recruiter-card**', async (route) => {
    await route.fulfill({ status: 200, json: { success: true, cards: [] } });
  });
  await page.route('**/api/user/log-search**', async (route) => {
    await route.fulfill({ status: 200, json: { id: 'mocked-id' } });
  });
  await page.route('**/api/user/track-search**', async (route) => {
    await route.fulfill({ status: 200, json: { id: 'mocked-id' } });
  });
  await page.route('**/api/user/update-search**', async (route) => {
    await route.fulfill({ status: 200, json: { success: true } });
  });

  // CI runs e2e against a production build, so never let a test reach the real GA property
  await page.route(/google-analytics\.com|googletagmanager\.com/, (route) => route.abort());
};

// client-side navigation from a hydrated page, so the mocked fetches are used
const navigateClientSide = async (page: Page, path: string): Promise<void> => {
  await page.evaluate((target) => {
    const nuxtRoot = document.querySelector('#__nuxt');
    // @ts-expect-error -- __vue_app__ is Vue's internal hook, not a typed DOM property
    const router = nuxtRoot?.__vue_app__?.config?.globalProperties?.$router;
    router?.push(target);
  }, path);
};

const answerCookieBanner = async (page: Page): Promise<void> => {
  // Declining still answers the banner (the toast only waits for an answer), and keeps
  // analytics consent off for the run
  await page.getByRole('button', { name: 'Decline' }).click();
};

// the page-scoped seen set behind useSeenAffiliateImpressions (useState keys are prefixed '$s')
const seenImpressions = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const nuxtRoot = document.querySelector('#__nuxt');
    // @ts-expect-error -- __vue_app__ is Vue's internal hook, not a typed DOM property
    const state = nuxtRoot?.__vue_app__?.$nuxt?.payload?.state;
    return state?.['$saffiliate-page-seen-impressions'] ?? [];
  });

const offerToast = (page: Page): ReturnType<Page['getByRole']> =>
  page.getByRole('status').filter({ hasText: 'Sponsored' });

test.describe('Affiliate offer toast', () => {
  test.beforeEach(async ({ page }) => {
    await mockRoutes(page);
    await page.clock.install();
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Am I Underpaid');
  });

  test('appears after the delay on salary results and closes on X', async ({ page }) => {
    await answerCookieBanner(page);
    await navigateClientSide(page, '/salary/software-engineer/uk?compare=35000');
    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    await expect(offerToast(page)).toHaveCount(0);

    await page.clock.fastForward(TOAST_DELAY_MS);
    const toast = offerToast(page);
    await expect(toast).toBeVisible();

    const cta = toast.getByRole('link');
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('rel', 'sponsored');

    await toast.getByRole('button', { name: 'Close' }).click();
    await expect(offerToast(page)).toHaveCount(0);
  });

  test('waits for the cookie banner to be answered', async ({ page }) => {
    await navigateClientSide(page, '/salary/software-engineer/uk?compare=35000');
    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    await page.clock.fastForward(TOAST_DELAY_MS);
    await expect(offerToast(page)).toHaveCount(0);

    await answerCookieBanner(page);
    // the banner's consent cookie reaches the toast's own useCookie ref asynchronously
    // (cookieStore / BroadcastChannel sync), so retry the full delay until it has landed
    await expect(async () => {
      await page.clock.fastForward(TOAST_DELAY_MS);
      await expect(offerToast(page)).toBeVisible({ timeout: 250 });
    }).toPass({ timeout: 10_000 });
  });

  test('a grid card seen on one search does not suppress the toast on the next', async ({
    page
  }) => {
    await answerCookieBanner(page);
    await navigateClientSide(page, '/salary/software-engineer/uk?compare=35000');
    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    // seeing the lead card in the grid suppresses the toast for this search
    await page.locator('a[rel="sponsored"]').first().scrollIntoViewIfNeeded();
    await expect.poll(() => seenImpressions(page)).toContain('salary-negotiator:negotiation-grid');
    await page.clock.fastForward(TOAST_DELAY_MS);
    await expect(offerToast(page)).toHaveCount(0);

    // back to the top first: the fake clock also holds Nuxt's scroll-to-top on navigation
    await page.evaluate(() => window.scrollTo(0, 0));

    // a new search is a new page instance, so the seen set starts empty again
    await navigateClientSide(page, '/salary/software-engineer/uk/london?compare=35000');
    await expect(page).toHaveURL(/\/salary\/software-engineer\/uk\/london/);
    // the URL updates before the new page instance's setup runs, so wait for the reset
    await expect.poll(() => seenImpressions(page)).toEqual([]);

    await page.clock.fastForward(TOAST_DELAY_MS);
    await expect(offerToast(page)).toBeVisible();
  });

  test('does not re-display on a second search in the same session', async ({ page }) => {
    await answerCookieBanner(page);
    await navigateClientSide(page, '/salary/software-engineer/uk?compare=35000');
    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    await page.clock.fastForward(TOAST_DELAY_MS);
    await expect(offerToast(page)).toBeVisible();
    await offerToast(page).getByRole('button', { name: 'Close' }).click();

    await navigateClientSide(page, '/salary/software-engineer/uk/london?compare=35000');
    await expect(page).toHaveURL(/\/salary\/software-engineer\/uk\/london/);

    await page.clock.fastForward(TOAST_DELAY_MS);
    await expect(offerToast(page)).toHaveCount(0);
  });
});
