## Purpose

Defines user-driven correction, ambiguity search, manual re-selection, and visualizer presentation of official government benchmark occupations directly from the results page comparison card.

## Requirements

### Requirement: Always-Visible Match Correction Trigger on Government Benchmark Card

The government benchmark comparison card SHALL display a match correction button ("Not the best match?") whenever government benchmark data is rendered on the results page, regardless of whether the current match was sourced from automated dictionary resolution, cached job mappings, or prior user suggestions.

#### Scenario: Results page with pre-cached or previously suggested match

- **WHEN** a user visits a salary or benchmark results page where government benchmark data is resolved from an existing cached `gov_id_code` or prior suggestion
- **THEN** the government comparison card renders the "Not the best match?" button alongside the benchmark visualizer
- **AND** clicking the button transitions the view to the government match search interface.

#### Scenario: Results page with freshly resolved match

- **WHEN** a user visits a results page where the system resolves an automatic identity match without pre-existing verification
- **THEN** the "Not the best match?" button is displayed on the government comparison card.

### Requirement: Interactive Government Role Selection

When the user activates the match correction flow or when no automatic government benchmark exists for a live job dataset, the system SHALL present an interactive autocomplete search input allowing the user to search and select any official government benchmark occupation within the active country context (ONS for UK, BLS for USA). Selecting an occupation MUST update the active benchmark baseline, persist the suggestion, and refresh page benchmark statistics while retaining the ability to re-select if needed.

#### Scenario: User selects a replacement government occupation

- **WHEN** the user searches for and selects an alternative occupation from the autocomplete list in the selection view
- **THEN** the system updates the active government identity (`govId`) to the selected occupation ID
- **AND** submits the suggestion update to the backend
- **AND** refreshes page metrics and returns to displaying the updated government comparison card with the correction button still available.

### Requirement: Dismissing Government Match Selection

When government benchmark data is already present and the user opens the match selection view, the interface SHALL provide a cancel or dismiss action to return to the active government comparison card without modifying the current benchmark.

#### Scenario: User cancels out of selection view

- **WHEN** a user with active government benchmark data opens the match selection view and clicks cancel/dismiss
- **THEN** the selection view closes and the existing government comparison card is restored without altering the current match.

### Requirement: Government Salary Visualizer Label Positioning

The government salary range visualizer SHALL render the Low (25th percentile) and High (75th percentile) boundary labels below the horizontal range bar and the User Salary label above the horizontal range bar. The Market Average indicator SHALL render directly on the horizontal range bar with its text label hidden by default and displayed inside an accessible tooltip on hover, keyboard focus, or touch/longpress interaction, preventing text collisions across all salary ranges.

#### Scenario: Market average located near boundary values

- **WHEN** the government salary visualizer displays a market average value that aligns close to the lower or upper percentile boundary
- **THEN** the Market Average marker renders on the horizontal range bar without displaying a persistent label
- **AND** the Low and High labels render below the range bar without overlapping the Market Average marker.

#### Scenario: User salary rendered near percentile boundaries

- **WHEN** the user's salary is rendered on the government salary range visualizer
- **THEN** the User Salary value label renders above the range bar (e.g. above the user marker dot)
- **AND** the Low and High boundary labels render below the range bar without overlapping the user salary label.

#### Scenario: Inspecting market average via tooltip

- **WHEN** the user hovers, focuses, or longpresses/touches the Market Average marker on the range bar
- **THEN** the Market Average tooltip becomes visible displaying the localized average salary value
- **AND** dismisses when pointer leaves, focus blurs, or touch interaction concludes.
