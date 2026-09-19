## Why

**Government visualizer label collisions.** In the government benchmark comparison card visualizer (`Section/Government/SalaryVisualizer.vue`), the Low (25th percentile) and High (75th percentile) labels are positioned below the track. However, the user's salary label was also positioned below the track, causing visual overlap when the user's salary is close to the minimum or maximum boundaries. Moving the user's salary label above the track avoids collisions with the Low and High labels, but previously risked overlapping a persistent Market Average label above the track. By moving the Market Average label into an on-demand tooltip shown on hover, focus, or longpress/touch, the space above the track is reserved cleanly for the user's salary marker, completely eliminating text collisions across all salary ranges.

**Live jobs count is hard to see.** On the live market comparison card (`Section/Adzuna/Comparison.vue`), the number of live jobs backing the benchmark is currently only mentioned inline within a body sentence ("Showing matched data for {jobsCount} live jobs.") below the job title, where it is easy to miss. Users have reported that this figure is hard to see. Making it a distinct, prominent stat next to the Market Average figure — the same treatment the average salary already gets — surfaces it at a glance instead of requiring users to read body copy.

## What Changes

### Government Salary Visualizer (`Section/Government/SalaryVisualizer.vue`)
- **User Salary Label Repositioning**: Move the user salary label above the range bar (e.g. `-top-6` above the user marker dot) instead of below it (`-bottom-6`), eliminating overlap with the Low and High boundary labels below the track.
- **Market Average Tooltip**: Replace the permanently visible Market Average text label with an on-demand tooltip attached to the Market Average indicator, revealed on hover, keyboard focus, and mobile touch / longpress.
- **Accessible Interaction**: Ensure the Market Average indicator (the trigger) has proper accessibility attributes (`role="group"`, accessible label/name, keyboard focusability via `tabindex="0"`, and touch event handling), with `role="tooltip"` applied to the tooltip content element itself (not the trigger), so screen reader and mobile touch users can inspect the average salary.
- **Test Suite Updates**: Update unit tests in `app/components/Section/Government/tests/SalaryVisualizer.spec.ts` to assert that Low/High labels remain below the bar, User Salary label renders above the bar, and Market Average label is housed within the tooltip presentation.

### Live Market Comparison Card (`Section/Adzuna/Comparison.vue`, `Card/Result.vue`)
- **Prominent Jobs Stat**: Add a new "Jobs" stat to `Card/Result.vue`'s market-only stat row (used when `showUserSalary` is false), rendered to the right of the existing "Market Average" stat, showing the live job count with the same visual weight as the average salary figure. The stat is opt-in via a new nullable `jobsCount` prop so the Government comparison card (which has no jobs concept and also uses the market-only row) is unaffected.
- **Body Copy Simplification**: Replace the `sections.adzuna.results` i18n string (currently `"Showing matched data for {jobsCount} live jobs."`, interpolated) with a static string, `"Market benchmark based on current live vacancy postings."`, in both `en-GB` and `en-US` locales, removing the now-redundant job count from the body text since it is promoted to its own stat.
- **Test Suite Updates**: Update unit tests in `app/components/Card/tests/Result.spec.ts` to cover the new Jobs stat (present when `jobsCount` is passed, absent — preserving current behavior — when it is not, as in the Government card).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `government-card-match-selection`: Update the visualizer label positioning requirement to mandate that the Market Average label is displayed inside a tooltip on hover/focus/longpress, while the User Salary label renders above the track and Low/High labels render below the track.
- `ui-fixes`: Add a requirement that the live market comparison card surfaces the live jobs count as a distinct, prominent stat alongside the Market Average stat, rather than only within body text.

## Impact

- `app/components/Section/Government/SalaryVisualizer.vue`: Updated template structure and styling for user salary label and market average tooltip.
- `app/components/Section/Government/tests/SalaryVisualizer.spec.ts`: Unit tests updated for new DOM structure, classes, and tooltip interaction.
- `app/components/Card/Result.vue`: New nullable `jobsCount` prop and updated market-only stat row template to render the Jobs stat alongside Market Average.
- `app/components/Card/tests/Result.spec.ts`: Unit tests updated for the new Jobs stat.
- `app/components/Section/Adzuna/Comparison.vue`: Passes `jobsCount` through to `Card/Result.vue`; updated `i18n-t` usage for the simplified `sections.adzuna.results` string.
- `i18n/locales/en-GB/card.json`, `i18n/locales/en-US/card.json`: New `card.result.jobs` label ("Jobs").
- `i18n/locales/en-GB/sections.json`, `i18n/locales/en-US/sections.json`: `adzuna.results` string simplified, no longer interpolated.
- `openspec/specs/government-card-match-selection/spec.md`: Delta spec updating requirement and scenarios for visualizer presentation.
- `openspec/specs/ui-fixes/spec.md`: Delta spec adding a requirement for live jobs count prominence on the comparison card.
- No changes to API routes, database schemas, or external dependencies.
