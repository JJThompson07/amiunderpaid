import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Deterministic dual-tier fixture: 2 Tier 1 (exact) + 2 Tier 2 (similar)
// listings, with varied salaries so sort-order assertions are meaningful.
const mockJobsResponse = {
  mean: 65000,
  count: 4,
  provider: 'reed',
  results: [
    {
      id: 1,
      title: 'Software Engineer',
      description: 'An exact match role',
      category: { label: 'IT Jobs', tag: 'it-jobs' },
      company: { display_name: 'Acme Corp' },
      location: { display_name: 'London', area: ['London'] },
      salary_min: 50000,
      salary_max: 60000,
      contract_time: 'full_time',
      contract_type: 'permanent',
      redirect_url: 'https://example.com/job/1',
      provider: 'reed'
    },
    {
      id: 2,
      title: 'Software Engineer',
      description: 'A higher-paying exact match role',
      category: { label: 'IT Jobs', tag: 'it-jobs' },
      company: { display_name: 'Globex Corp' },
      location: { display_name: 'London', area: ['London'] },
      salary_min: 80000,
      salary_max: 100000,
      contract_time: 'full_time',
      contract_type: 'permanent',
      redirect_url: 'https://example.com/job/2',
      provider: 'reed'
    }
  ],
  similarResults: [
    {
      id: 3,
      title: 'Backend Engineer',
      description: 'A similar role',
      category: { label: 'IT Jobs', tag: 'it-jobs' },
      company: { display_name: 'Initech' },
      location: { display_name: 'London', area: ['London'] },
      salary_min: 40000,
      salary_max: 55000,
      contract_time: 'full_time',
      contract_type: 'permanent',
      redirect_url: 'https://example.com/job/3',
      provider: 'reed'
    },
    {
      id: 4,
      title: 'Platform Engineer',
      description: 'A higher-paying similar role',
      category: { label: 'IT Jobs', tag: 'it-jobs' },
      company: { display_name: 'Umbrella Corp' },
      location: { display_name: 'London', area: ['London'] },
      salary_min: 70000,
      salary_max: 90000,
      contract_time: 'full_time',
      contract_type: 'permanent',
      redirect_url: 'https://example.com/job/4',
      provider: 'reed'
    }
  ]
};

test.describe('Job Search', () => {
  test.beforeEach(async ({ page }) => {
    // Mocks mirror e2e/api-fallback.spec.ts's established pattern: internal
    // Nuxt API routes are intercepted so the flow is deterministic and never
    // depends on live third-party providers or Algolia network access.
    await page.route('**/api/market-data/jobs**', async (route) => {
      await route.fulfill({ status: 200, json: mockJobsResponse });
    });
    await page.route('**/api/engine/match-title**', async (route) => {
      await route.fulfill({
        status: 200,
        json: { matches: [{ id_code: '1234', group_name: 'Software Engineer' }] }
      });
    });
    await page.route('**/api/user/log-search**', async (route) => {
      await route.fulfill({ status: 200, json: { id: 'mocked-id' } });
    });
  });

  // The results page's job listings are fetched server-side (Nitro's internal
  // $fetch during SSR), which never touches the browser's network stack --
  // page.route() can't intercept it there. Landing on the results page via a
  // raw page.goto() therefore bypasses our mocks and renders real, non-
  // deterministic provider data. Submitting the search from an already-
  // hydrated /jobs page instead triggers a client-side navigateTo(), whose
  // data fetch IS a browser-originated $fetch call that page.route() can
  // intercept -- the same technique e2e/api-fallback.spec.ts uses ("bypass
  // SSR") for the same reason.
  const searchFromLandingPage = async (page: Page): Promise<void> => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('.ami-autocomplete-input input').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Software Engineer');

    // The autocomplete dropdown is absolutely positioned and overlaps the
    // submit button below it; there's no Escape handler, so click a neutral
    // element first to close it (via onClickOutside) before submitting.
    await page.locator('h1').first().click();

    const submitButton = page
      .getByRole('button')
      .filter({ hasText: /Search Jobs/i })
      .first();
    await submitButton.click();

    await expect(page).toHaveURL(/\/jobs\/software-engineer\/uk/i);
  };

  test('landing page search submission navigates to the results page', async ({ page }) => {
    await searchFromLandingPage(page);

    await expect(page.locator('h1').first()).toContainText('Software Engineer', {
      ignoreCase: true
    });

    // The search-form query params (q, gov_id, schedule, contract, category)
    // used for the initial navigation/data fetch are stripped from the
    // address bar once the client has mounted, leaving a clean, shareable URL.
    await expect(page).toHaveURL(/^.*\/jobs\/software-engineer\/uk\/?$/i);
  });

  test('results page displays both Exact Matches and Similar Roles tiers', async ({ page }) => {
    await searchFromLandingPage(page);

    await expect(page.getByText('Exact Matches')).toBeVisible();
    await expect(page.getByText('Similar Roles')).toBeVisible();

    const cards = page.locator('.ami-role');
    await expect(cards).toHaveCount(4);
  });

  test('sorting by highest salary reorders listings and updates the URL', async ({ page }) => {
    await searchFromLandingPage(page);

    await expect(page.locator('.ami-role').first()).toBeVisible();

    await page.getByRole('button', { name: /Highest Salary/i }).click();

    // Only the active sort param survives the URL cleanup -- no leftover
    // search-form params (q, gov_id, schedule, contract, category).
    await expect(page).toHaveURL(/^.*\/jobs\/software-engineer\/uk\/?\?sort=salary_max$/i);

    // The highest-paying exact match (Globex Corp, £100,000 max) should now lead.
    await expect(page.locator('.ami-role').first()).toContainText('Globex Corp');
  });

  test('navigates from the results page to the matching salary benchmark page', async ({
    page
  }) => {
    await searchFromLandingPage(page);

    await page.getByRole('link', { name: /salary benchmark/i }).click();

    await expect(page).toHaveURL(/\/salary\/software-engineer\/uk/i);
  });

  test('UK landing page copy references Reed and Adzuna, not Jooble', async ({ page }) => {
    await page.goto('/jobs');

    await expect(page.locator('main')).toContainText('Reed and Adzuna');
    await expect(page.locator('main')).not.toContainText('Jooble');
  });

  test('US landing page copy references Adzuna and Jooble, not Reed', async ({ page }) => {
    // Use the ami-us.localhost domain to trigger the US tenant middleware
    // (same technique as e2e/ssr.spec.ts).
    await page.goto('http://ami-us.localhost:3000/jobs');

    await expect(page.locator('main')).toContainText('Adzuna and Jooble');
    await expect(page.locator('main')).not.toContainText('Reed');
  });

  test('UK landing page meta description tags reference Reed and Adzuna, not Jooble', async ({
    page
  }) => {
    await page.goto('/jobs');

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Reed and Adzuna/
    );
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Jooble/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      /Reed and Adzuna/
    );
    await expect(page.locator('meta[property="og:description"]')).not.toHaveAttribute(
      'content',
      /Jooble/
    );
  });

  test('US landing page meta description tags reference Adzuna and Jooble, not Reed', async ({
    page
  }) => {
    // Use the ami-us.localhost domain to trigger the US tenant middleware
    // (same technique as e2e/ssr.spec.ts).
    await page.goto('http://ami-us.localhost:3000/jobs');

    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Adzuna and Jooble/
    );
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Reed/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      /Adzuna and Jooble/
    );
    await expect(page.locator('meta[property="og:description"]')).not.toHaveAttribute(
      'content',
      /Reed/
    );
  });
});
