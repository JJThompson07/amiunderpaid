## Context

The government salary comparison card (`Section/Government/Comparison.vue`) uses `Section/Government/SalaryVisualizer.vue` to display the 25th percentile (Low), 75th percentile (High), Market Average, and the user's current salary along a horizontal track. Previously, both Low/High and the User Salary label were positioned below the track (`-bottom-6`), causing visual collisions when the user's salary was near either boundary.

Moving the User Salary label above the track (`-top-6`) prevents it from overlapping Low or High. However, to avoid visual collision with the Market Average label above the track, the Market Average label is transitioned into an on-demand tooltip triggered via hover, focus, or touch/longpress on the average marker.

## Goals / Non-Goals

**Goals:**

- Position the User Salary value label above the range bar (`-top-6`) on `Section/Government/SalaryVisualizer.vue`.
- Display the Market Average marker on the track with its text label hidden by default and rendered inside an on-demand tooltip on hover, focus, or tap/longpress.
- Ensure keyboard and touch accessibility via `tabindex="0"`, ARIA attributes (`role="tooltip"`), and mobile touch toggling.
- Update unit tests in `app/components/Section/Government/tests/SalaryVisualizer.spec.ts` to assert the new label positions and tooltip visibility behavior.

**Non-Goals:**

- Modifying mathematical percentile and boundary clamping calculations (`averagePosition`, `salaryPosition`).
- Adding external UI/tooltip library dependencies.
- Modifying other chart components (`AmI/Chart/Range.vue`, `Section/Adzuna/Histogram.vue`).

## Decisions

### Decision 1: Hybrid CSS and Reactive Touch Tooltip on Market Average Marker

- **Choice**: Make the Market Average marker a focusable interactive element (`tabindex="0"`, `role="group"`, `aria-label`) that renders the tooltip via CSS classes (`group-hover:opacity-100 group-focus:opacity-100`) combined with a reactive boolean (`showAvgTooltip`) for touch / tap / longpress interactions.
- **Rationale**: Provides instantaneous CSS transitions on desktop mouse hover and keyboard navigation while ensuring mobile touch users can toggle or tap to reveal the average salary tooltip without relying solely on fragile mobile hover emulation.
- **Alternatives Considered**:
  - _Pure CSS (`:hover`, `:focus`)_: May not reliably toggle on certain mobile touch browsers or may get stuck in focused state.
  - _External Tooltip Library (e.g. Floating UI)_: Adds runtime bundle weight for a single static coordinate tooltip.

### Decision 2: Tooltip Styling & Vertical Stacking

- **Choice**: The tooltip is rendered above the market average marker (`-top-7.5`) with pill styling in the site's primary brand colour (`bg-primary-700 text-white font-black text-2xs px-2 py-0.5 rounded shadow-lg whitespace-nowrap`). The marker itself sits at `z-10` by default (below the User Salary marker's `z-20`), but rises to `z-30` on `hover:`, `focus:`, and while `showAvgTooltip` is true (tap), so the open tooltip always renders above the User Salary marker instead of being clipped behind it.
- **Rationale**: `bg-primary-700` (not `primary-600`, the shade already used for the marker dot) keeps the tooltip on-brand while meeting WCAG AA contrast for white text on both site themes — `primary-600` computes to ~3.6:1 against white on the BenchmarkMyRole (orange) theme, below the 4.5:1 threshold, while `primary-700` computes to ~5.2:1 (BenchmarkMyRole) and ~6.2:1 (AmIUnderpaid). Conditionally elevating `z-index` only while the tooltip is open (rather than raising the marker's baseline `z-10` permanently) preserves the existing default stacking — the User Salary marker stays visually dominant when nothing is being inspected — while guaranteeing the tooltip itself is never hidden behind it when open.

### Decision 3: User Salary Label Positioning

- **Choice**: Move the user salary label from `-bottom-6` to `-top-6` above the user marker dot.
- **Rationale**: Fully separates the persistent visual planes:
  - **Above the track (`-top-6`)**: User's salary value badge.
  - **On the track**: Interactive market average tick with hover tooltip.
  - **Below the track (`-bottom-6`)**: Low (left) and High (right) percentile boundary values.

## Risks / Trade-offs

- **[Risk]** Screen readers or mobile taps could accidentally trigger or dismiss unexpectedly.
  - **Mitigation**: Implement `@click.stop="toggleTooltip"` and `@blur="hideTooltip"`, along with standard `role="tooltip"` and accessible aria labelling.
- **[Risk]** Tooltip or user salary label clipping at the edges (0% or 100%).
  - **Mitigation**: The visualizer container includes `p-4 pt-8 pb-8` spacing, providing ample headroom above and below the track for transformed labels.

---

## Live Market Comparison Card — Jobs Stat Prominence

### Context

`Card/Result.vue` is a shared component used by both `Section/Adzuna/Comparison.vue` and `Section/Government/Comparison.vue`. Both currently pass `show-user-salary="false"`, which renders the `card-result--market-only` block: a single centered column showing only the "Market Average" label and figure. The Adzuna card additionally passes a `jobsCount` prop that today is only used in a body sentence below the job title (`sections.adzuna.results`, interpolated as `"Showing matched data for {jobsCount} live jobs."`).

### Goals / Non-Goals

**Goals:**

- Render the live jobs count as its own stat, visually matching the "Market Average" stat, to the right of it.
- Keep the change scoped to the Adzuna comparison card — the Government comparison card also renders `card-result--market-only` and must render exactly as it does today (single centered Market Average stat, no Jobs stat).
- Replace the job-count body sentence with a fixed string that no longer repeats the number.

**Non-Goals:**

- Changing `Section/Adzuna/Histogram.vue` itself (the expandable salary distribution chart) — out of scope, this only touches the collapsed comparison card.
- Adding pluralization or zero-state copy for the Jobs stat — it renders the raw `jobsCount.toLocaleString()` value the same way the existing Market Average figure renders `marketAverage.toLocaleString()`, with no special-casing.

### Decision: Nullable `jobsCount` prop gates the two-stat layout

- **Choice**: Add `jobsCount: { type: Number, default: null }` to `Card/Result.vue`. Inside `card-result--market-only`, change the container from a single centered column to a `flex-row` of stat columns; always render the Market Average column, and additionally render a Jobs column (`$t('card.result.jobs')` + `jobsCount.toLocaleString()`) only when `jobsCount !== null`. `Section/Adzuna/Comparison.vue` passes `:jobs-count="jobsCount"` (a prop it already receives); `Section/Government/Comparison.vue` is left untouched and so never passes it, leaving that card's rendering unchanged.
- **Rationale**: A nullable prop that defaults to "not applicable" cleanly distinguishes "this card has no jobs concept" (Government, prop omitted) from "this card has a jobs count, including zero" (Adzuna, prop always passed), without a second boolean prop or a new component variant.
- **Alternatives Considered**:
  - _New boolean `showJobsCount` prop_: Redundant with `jobsCount` already being nullable — two props tracking the same on/off state.
  - _Separate `CardResultWithJobs` component_: Unnecessary duplication of the existing card chrome (header, chip, verdict, footer slots) for one extra stat.

### Impact on `sections.adzuna.results`

The i18n key `sections.adzuna.results` currently takes a `{jobsCount}` interpolation. Since the count moves to its own stat, the key becomes a plain, non-interpolated string in both `en-GB` and `en-US`: `"Market benchmark based on current live vacancy postings."`. The `<i18n-t keypath="sections.adzuna.results">` usage in `Section/Adzuna/Comparison.vue` (which currently supplies a `#jobsCount` template slot) is simplified to a plain `$t('sections.adzuna.results')` call since there is no longer an interpolation slot to fill.

### Risks / Trade-offs

- **[Risk]** Changing `card-result--market-only` from `flex-col` to a two-column `flex-row` layout could visually affect the Government comparison card too if the `v-if="jobsCount !== null"` condition is ever regressed to always show the Jobs column.
  - **Mitigation**: `app/components/Card/tests/Result.spec.ts` asserts both states explicitly — Jobs column absent when `jobsCount` is not passed (covering the Government usage), present with the correct value when it is passed.
