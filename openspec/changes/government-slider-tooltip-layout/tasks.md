## 1. Visualizer Layout & Tooltip Implementation

- [ ] 1.1 In `app/components/Section/Government/SalaryVisualizer.vue`, reposition the user salary value badge to render above the range bar (`-top-6`) above the user marker dot, keeping the Low and High boundary labels below the track (`-bottom-6`).
- [ ] 1.2 In `app/components/Section/Government/SalaryVisualizer.vue`, update the Market Average marker to display its localized average salary label (`$t('sections.visualiser.average')`) inside an accessible on-demand tooltip triggered on hover, keyboard focus, and mobile tap / longpress. The trigger element gets `tabindex="0"`, `role="group"`, and an `aria-label`; the tooltip content element itself gets `role="tooltip"` (never both roles on the same, focusable trigger element — `role="tooltip"` is invalid ARIA on a focusable element).

## 2. Unit Testing & Verification (Government Visualizer)

- [ ] 2.1 Update unit tests in `app/components/Section/Government/tests/SalaryVisualizer.spec.ts` to assert that Low and High labels render below the range bar (`-bottom-6`), User Salary label renders above the range bar (`-top-6`), and the Market Average label is contained within the tooltip structure with proper accessibility and visibility states.

## 3. Live Market Comparison Card — Jobs Stat Prominence

- [ ] 3.1 In `app/components/Card/Result.vue`, add a nullable `jobsCount` prop (`type: Number, default: null`) and update the `card-result--market-only` section to a two-column stat row: keep the existing "Market Average" stat, and render a new "Jobs" stat (`$t('card.result.jobs')` + `jobsCount.toLocaleString()`) to its right only when `jobsCount !== null`. Leave the `card-result--salaries` (showUserSalary) branch untouched.
- [ ] 3.2 Add `"jobs": "Jobs"` under `card.result` in `i18n/locales/en-GB/card.json` and `i18n/locales/en-US/card.json`.
- [ ] 3.3 In `app/components/Section/Adzuna/Comparison.vue`, pass `:jobs-count="jobsCount"` to `CardResult`.
- [ ] 3.4 In `i18n/locales/en-GB/sections.json` and `i18n/locales/en-US/sections.json`, change `adzuna.results` from `"Showing matched data for {jobsCount} live jobs."` to `"Market benchmark based on current live vacancy postings."`.
- [ ] 3.5 In `app/components/Section/Adzuna/Comparison.vue`, simplify the `<i18n-t keypath="sections.adzuna.results">` usage (remove the now-unused `#jobsCount` template slot) to a plain `{{ $t('sections.adzuna.results') }}`, since the key no longer takes an interpolation.
- [ ] 3.6 Update unit tests in `app/components/Card/tests/Result.spec.ts` to assert: the Jobs stat is absent when `jobsCount` is not passed (Government card usage, existing `'shows only the market average when showUserSalary is false'` test), and present with the correct label/value when `jobsCount` is passed (new test, covering the Adzuna card usage).

## 4. Verification

- [ ] 4.1 Run full project verification suite `pnpm test:verify` (typecheck, lint, coverage, Playwright e2e, and security rules) and verify zero regressions across both the Government visualizer and live market comparison card changes.
