## MODIFIED Requirements

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
