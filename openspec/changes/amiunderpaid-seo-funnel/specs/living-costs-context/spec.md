## ADDED Requirements

### Requirement: Living costs section on UK location result pages

UK salary result pages with a location SHALL show a Living costs section with take-home pay, rent burden, house-price-to-earnings and inflation-versus-pay-growth cards, each citing its dataset and month. The section MUST NOT render on USA pages or on UK pages without a location.

#### Scenario: UK page with location

- **WHEN** a visitor opens `/salary/software-engineer/uk/manchester`
- **THEN** the Living costs section shows all four cards with figures for Manchester (or its nearest area with data) and a source line on each

#### Scenario: USA page

- **WHEN** a visitor opens `/salary/software-engineer/usa/texas`
- **THEN** no Living costs section is rendered

### Requirement: Cached pages never contain visitor-specific figures

Living-costs figures in server-rendered HTML MUST depend only on the page path (role and location), computed at the role's typical pay for the area. Figures that depend on the visitor's own salary MUST be computed and rendered only after hydration.

#### Scenario: Two visitors with different salaries

- **WHEN** the cached HTML for `/salary/actuary/uk/leeds` is fetched with `?compare=41000` and with `?compare=99000`
- **THEN** both responses contain identical Living costs figures and neither contains the visitor's salary

#### Scenario: Visitor's own take-home

- **WHEN** a visitor's page hydrates with `compare=52000` for an Edinburgh location
- **THEN** the take-home card shows their take-home at £52,000 using Scottish income tax bands

### Requirement: Estimated inputs are disclosed

When the role's pay figure used by a living-costs ratio has a regional `basis` other than `regional`, the affected cards MUST show the same "estimated" note used on the pay card.

#### Scenario: Estimated regional pay

- **WHEN** the role's regional pay basis is `regional-parent`
- **THEN** the rent burden and house-price cards show the estimated note
