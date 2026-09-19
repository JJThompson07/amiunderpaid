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
  - *Pure CSS (`:hover`, `:focus`)*: May not reliably toggle on certain mobile touch browsers or may get stuck in focused state.
  - *External Tooltip Library (e.g. Floating UI)*: Adds runtime bundle weight for a single static coordinate tooltip.

### Decision 2: Tooltip Styling & Vertical Stacking
- **Choice**: The tooltip is rendered above the market average marker (`absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2` or `-top-7.5`) with high contrast pill styling (`bg-slate-900 text-white font-bold text-2xs px-2 py-0.5 rounded shadow-lg z-30 whitespace-nowrap`).
- **Rationale**: High contrast background (`bg-slate-900`) cleanly differentiates the transient tooltip from the user's persistent salary label (`text-positive-700` / `text-negative-700` / `text-slate-600`), even if both happen to be visible simultaneously while inspecting the average.

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
