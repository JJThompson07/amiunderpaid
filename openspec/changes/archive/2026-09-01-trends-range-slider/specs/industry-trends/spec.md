## MODIFIED Requirements

### Requirement: Graph Controls

The system SHALL provide interactive controls allowing the user to filter the graph, including a custom time-range selector that lets the user pick any from/to month within the actual available data span rather than only fixed presets.

#### Scenario: User toggles industries

- **WHEN** the user interacts with the graph controls (toggles, Select All, Clear All, or the time range selector)
- **THEN** the graph dynamically updates to show or hide the selected industries and adjusts the time window accordingly.

#### Scenario: User selects a custom time range

- **WHEN** the user drags either handle of the time-range slider to select a custom `[from, to]` month window
- **THEN** the graph's x-axis updates to show only months within that window, and the window's bounds span the full range of months present in the underlying data (not just the currently-visible industries), so toggling industries on or off does not change the selectable range.

#### Scenario: Page loads with no prior selection

- **WHEN** the user first visits the Industry Trends page
- **THEN** the time-range selector defaults to the most recent 12 months of available data, or the full available span if fewer than 12 months of data exist yet.
