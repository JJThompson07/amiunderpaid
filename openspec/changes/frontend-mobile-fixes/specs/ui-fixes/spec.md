## Purpose

Defines the requirements for fixing the mobile UI layout of the search form and resolving the whitespace and color clash issues on the Salary Results page.

## ADDED Requirements

### Requirement: Search Form Mobile Responsiveness
The system SHALL ensure the site switcher link and "Salary Converter" button inside the search form do not overlap or break layout on mobile viewports.

#### Scenario: User views search form on a mobile device
- **WHEN** a user loads the homepage on a small screen
- **THEN** the site switcher text is concise and the action buttons wrap or stack cleanly without horizontal overflow.

### Requirement: Results Page Color Hierarchy
The system SHALL ensure that the MCA Score card is the primary colorful focal point on the results page, preventing a clash of semantic colors from secondary data sources.

#### Scenario: User views the salary results page
- **WHEN** the results page loads with both MCA, Adzuna, and Government data
- **THEN** only the MCA score card utilizes a full semantic background color, while the secondary data cards use neutral backgrounds with small colored indicator badges.

### Requirement: Results Page Card Density
The system SHALL structure the secondary data cards (Adzuna, Government) to efficiently use horizontal space without looking awkwardly empty on wide screens.

#### Scenario: User views results on a desktop
- **WHEN** a user views the results page on a large monitor
- **THEN** the data cards utilize rich iconography and compact data layouts (e.g., side-by-side stats) to fill the card bounds appropriately rather than stretching short strings of text across the entire width.
