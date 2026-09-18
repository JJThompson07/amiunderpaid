## 1. UI Updates on Government Benchmark Comparison & Visualizer

- [x] 1.1 In `app/components/Section/Government/Comparison.vue`, update the template to always display the "Not the best match?" button (`AmIButton`) whenever the government comparison card is rendered by removing the `v-if="!isVerified"` gate — and, since this made the `isVerified` prop entirely unused (tripping `vue/no-unused-properties`), remove the prop itself along with the now-dead `:is-verified="isAdminVerified"` bindings and `isAdminVerified` destructures in both `[[location]].vue` pages — and create unit tests in `app/components/Section/Government/tests/Comparison.spec.ts` verifying that the button is rendered and clicking it emits the `userSelect` event.
- [ ] 1.2 In `app/components/Section/Government/SalaryVisualizer.vue`, position the Low and High labels below the horizontal range bar (`-bottom-6` or `top-full mt-1.5`) while keeping the Market Average label above the bar (`-top-6`), adjust container padding, and create unit tests in `app/components/Section/Government/tests/SalaryVisualizer.spec.ts` verifying marker positioning classes and mathematical percentage calculations.

## 2. Selection Component Dismissal & Interaction

- [ ] 2.1 In `app/components/Section/GovernmentUserSelection.vue`, add a `canCancel` prop (boolean, default `false`) and a cancel/dismiss button using `$t('common.cancel')` that emits a `cancel` event, and create unit tests in `app/components/Section/tests/GovernmentUserSelection.spec.ts` verifying search execution, option selection emission, and cancel event emission.

## 3. Results Pages Wiring & State Integration

- [ ] 3.1 In `app/pages/salary/[title]/[country]/[[location]].vue` and `app/pages/benchmark/[title]/[country]/[[location]].vue`, pass `:can-cancel="hasGovernmentData"` and bind `@cancel="showUserSelection = false"` on `LazySectionGovernmentUserSelection`, ensuring users can dismiss selection when government data is already present.
- [ ] 3.2 In `app/composables/tests/useLocationEngine.spec.ts`, verify that `useLocationEngine` properly handles `handleAmbiguitySelect` and subsequent re-selections for both UK and USA country contexts.

## 4. Verification & Quality Gate

- [ ] 4.1 Run the full verification suite (`pnpm test:verify`) to validate linting, typechecking, Firestore rules, unit tests with the 80% per-file coverage threshold, and Playwright e2e tests.
