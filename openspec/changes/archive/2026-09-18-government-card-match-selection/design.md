## Context

On the salary and benchmark results pages (`app/pages/salary/[title]/[country]/[[location]].vue` and `app/pages/benchmark/[title]/[country]/[[location]].vue`), government benchmark data from official statistical agencies (ONS for UK, BLS for USA) is presented via `Section/Government/Comparison.vue`.

Currently, `Section/Government/Comparison.vue` accepts an `isVerified` prop (bound to `isAdminVerified` from `useLocationEngine.ts`). When `isVerified` is `true`, the "Not the best match?" button is hidden using `v-if="!isVerified"`. Because `isAdminVerified` evaluates to `true` whenever an entry has a cached `gov_id_code`, a query `govId`, or a previous user selection, any previously queried or suggested role permanently hides the match correction button. If the automatic or prior match is imprecise for a particular user, they have no mechanism to change the benchmark role.

Additionally, in `Section/Government/SalaryVisualizer.vue`, the Low and High labels are currently positioned above the bar (`-top-6`) along with the Market Average label (`-top-6`). When the market average falls near either extreme, the text labels collide and overlap.

## Goals / Non-Goals

**Goals:**

- Guarantee that the match correction button ("Not the best match?") is always accessible on `Section/Government/Comparison.vue` when government benchmark data is rendered.
- Decouple the UI visibility of the match correction button from the internal `isAdminVerified` / cache state.
- Provide a clear cancel/dismiss action on `Section/GovernmentUserSelection.vue` when government data is already present so users can return to their current comparison card without making a change.
- Ensure selecting an alternative match via `handleAmbiguitySelect` updates data reactively and leaves the re-selection button accessible for subsequent adjustments.
- Position the Low and High labels below the horizontal bar in `Section/Government/SalaryVisualizer.vue` to eliminate overlap with the Market Average label above the bar.
- Maintain full test coverage for all modified components, pages, and composables (≥80% per-file).

**Non-Goals:**

- Changing backend suggestion storage schema or the `/api/market-data/update-match` endpoint contract.
- Altering the search form modal (`Modal/Ambiguity.vue`) behavior on the landing page.
- Changing admin verification workflows in the admin console.

## Decisions

### 1. Remove `!isVerified` Restriction on the Comparison Button

- **Decision**: Remove the `v-if="!isVerified"` check from `Section/Government/Comparison.vue` so that the button is rendered whenever the comparison card is displayed.
- **Rationale**: Any automatic match, cached match, or prior suggestion might not fit the specific context or seniority of the user. Users should always have autonomy to change the benchmark.
- **Alternatives Considered**: Gating behind a tooltip or secondary menu — rejected as unnecessarily complex for a single action button.

### 2. Add Dismissal Support to `Section/GovernmentUserSelection.vue`

- **Decision**: Add a `canCancel` prop (defaulting to `false`, passed as `true` when `hasGovernmentData` is true) and a cancel button that emits a `cancel` event. In `salary` and `benchmark` page templates, handle `@cancel="showUserSelection = false"`.
- **Rationale**: When users click "Not the best match?" out of curiosity or by accident when government data is already loaded, they should be able to return to the comparison card without refreshing or being forced to make a selection.
- **Alternatives Considered**: Only relying on browser back button — poor UX that could lose entered salary state.

### 3. Maintain Decoupled `useLocationEngine` State

- **Decision**: Retain `isAdminVerified` inside `useLocationEngine` itself (still computed and returned from the composable), but stop passing it to the UI. Removing only the `v-if` in `Comparison.vue` left the `isVerified` prop with zero remaining references, which fails this repo's `vue/no-unused-properties` ESLint rule (confirmed by running `pnpm eslint` against the edited file) — so the prop declaration and both pages' `:is-verified="isAdminVerified"` bindings and `isAdminVerified` destructures were removed too, not just the gating usage.
- **Rationale**: Keeps `isAdminVerified` available inside the composable for any future server/analytical reporting, without shipping a UI prop that does nothing and breaks lint.

### 4. Position Low/High Labels Below the Visualizer Range Bar

- **Decision**: Update `Section/Government/SalaryVisualizer.vue` to place Low (`left-0`) and High (`right-0`) percentile labels below the horizontal line (`top-full mt-2` or `-bottom-6`), while keeping Market Average (`-top-6`) above the line. Ensure container padding (`pt-8 pb-8`) accommodates the bottom labels.
- **Rationale**: Separating the vertical axis (Market Average above, Low/High boundaries below) guarantees labels never collide regardless of the market average position.
- **Alternatives Considered**: Truncating text or dynamically offsetting overlapping labels with JS — CSS vertical separation is cleaner, simpler, and deterministic.

## Risks / Trade-offs

- **[Risk] Multiple re-selections during a single session** → _Mitigation_: `handleAmbiguitySelect` updates `govId` and triggers `refresh()`, fetching the latest baselines cleanly while preserving reactive UI state.
- **[Risk] Accidental selection click** → _Mitigation_: The dismiss/cancel button allows returning to the existing card instantly.
- **[Risk] User salary marker collision** → _Mitigation_: The User Salary marker dot and label are positioned at `-bottom-6` with centered alignment; the Low (`left-0`) and High (`right-0`) labels are boundary-aligned to minimize overlap.
