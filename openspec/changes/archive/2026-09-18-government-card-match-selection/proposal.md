## Why

When viewing salary or benchmark results, the system matches the searched job title to official government benchmark datasets (ONS in the UK, BLS in the USA). However, automatic dictionary resolution, cached job mappings, or prior user suggestions may not always match the user's specific role or intent. Currently, if an existing or cached `gov_id_code` is present, the "Not the best match?" button on the government comparison card is hidden (`v-if="!isVerified"`), preventing users from correcting or fine-tuning their government benchmark match. Users must always have the option to change their government role match whenever government data is displayed.

Additionally, on the government comparison card's salary range visualizer, the Low and High market labels are currently positioned above the range bar alongside the Market Average label. When the market average is positioned near the low or high end of the distribution, the labels collide and overlap, degrading legibility.

## What Changes

- **Always-Accessible Match Correction**: Display the "Not the best match?" button on the government benchmark card (`LazySectionGovernmentComparison`) whenever government benchmark data is rendered, regardless of whether a cached mapping or prior user suggestion exists.
- **Match Selection Cancellation**: Allow users to dismiss or cancel the `Section/GovernmentUserSelection` search interface and return to the current government comparison card if they choose not to select an alternative.
- **Persistent Re-selection**: Ensure that selecting an alternative benchmark match via `handleAmbiguitySelect` updates the active government identity and baselines while leaving the match correction button accessible for any subsequent adjustments.
- **Decoupled Verification UI Gate**: Decouple the UI presence of the match correction button from the internal `isAdminVerified` / cached `gov_id_code` status.
- **Visualizer Range Label Separation**: Position the Low and High benchmark labels below the range line on `Section/Government/SalaryVisualizer.vue`, reserving the space above the line exclusively for the Market Average label to prevent text collisions.

## Capabilities

### New Capabilities

- `government-card-match-selection`: Defines user-driven correction, search selection, and layout presentation of official government benchmarks on the results page comparison card.

### Modified Capabilities

## Impact

- **UI Components**:
  - `app/components/Section/Government/Comparison.vue`: Remove the `!isVerified` display restriction so the "Not the best match?" button is always rendered when the government benchmark card is shown.
  - `app/components/Section/Government/SalaryVisualizer.vue`: Move Low and High benchmark labels below the range line and adjust vertical container spacing.
  - `app/components/Section/GovernmentUserSelection.vue`: Add a cancel/dismiss event and button to allow returning to the comparison card when government data is already available.
  - `app/pages/salary/[title]/[country]/[[location]].vue` and `app/pages/benchmark/[title]/[country]/[[location]].vue`: Handle cancel events to reset `showUserSelection` to `false`.
- **Composables & State**:
  - `app/composables/useLocationEngine.ts`: Ensure `showUserSelection` state and ambiguity resolution cleanly update baselines without preventing subsequent re-selection.
- **Tests**:
  - Add and update unit tests in `app/components/Section/Government/tests/` and `app/composables/tests/useLocationEngine.spec.ts`.
