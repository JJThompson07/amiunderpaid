## Why

In the government benchmark comparison card visualizer (`Section/Government/SalaryVisualizer.vue`), the Low (25th percentile) and High (75th percentile) labels are positioned below the track. However, the user's salary label was also positioned below the track, causing visual overlap when the user's salary is close to the minimum or maximum boundaries. Moving the user's salary label above the track avoids collisions with the Low and High labels, but previously risked overlapping a persistent Market Average label above the track. By moving the Market Average label into an on-demand tooltip shown on hover, focus, or longpress/touch, the space above the track is reserved cleanly for the user's salary marker, completely eliminating text collisions across all salary ranges.

## What Changes

- **User Salary Label Repositioning**: Move the user salary label above the range bar (e.g. `-top-6` above the user marker dot) instead of below it (`-bottom-6`), eliminating overlap with the Low and High boundary labels below the track.
- **Market Average Tooltip**: Replace the permanently visible Market Average text label with an on-demand tooltip attached to the Market Average indicator, revealed on hover, keyboard focus, and mobile touch / longpress.
- **Accessible Interaction**: Ensure the Market Average indicator (the trigger) has proper accessibility attributes (`role="group"`, accessible label/name, keyboard focusability via `tabindex="0"`, and touch event handling), with `role="tooltip"` applied to the tooltip content element itself (not the trigger), so screen reader and mobile touch users can inspect the average salary.
- **Test Suite Updates**: Update unit tests in `app/components/Section/Government/tests/SalaryVisualizer.spec.ts` to assert that Low/High labels remain below the bar, User Salary label renders above the bar, and Market Average label is housed within the tooltip presentation.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `government-card-match-selection`: Update the visualizer label positioning requirement to mandate that the Market Average label is displayed inside a tooltip on hover/focus/longpress, while the User Salary label renders above the track and Low/High labels render below the track.

## Impact

- `app/components/Section/Government/SalaryVisualizer.vue`: Updated template structure and styling for user salary label and market average tooltip.
- `app/components/Section/Government/tests/SalaryVisualizer.spec.ts`: Unit tests updated for new DOM structure, classes, and tooltip interaction.
- `openspec/specs/government-card-match-selection/spec.md`: Delta spec updating requirement and scenarios for visualizer presentation.
- No changes to API routes, database schemas, or external dependencies.
