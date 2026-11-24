## ADDED Requirements

### Requirement: UK regional occupation cascade with stated basis

For a UK request whose location resolves to a GB region, the engine MUST derive regional occupation pay by this cascade, using a single data year: the 4-digit SOC regional median; else the 4-digit regional mean scaled by the occupation's national median/mean ratio; else the 3-digit parent's regional median scaled by the national 4-digit/3-digit median ratio; else no regional figure. The engine MUST report which step produced the figure as `basis` (`regional`, `regional-estimated`, `regional-parent` or `national`).

#### Scenario: Published regional median

- **WHEN** Table 15 publishes a London median for SOC 2433
- **THEN** that median is the regional figure and `basis` is `regional`

#### Scenario: Only a mean is published

- **WHEN** the North East row for SOC 1111 has a mean but no median, and the national SOC 1111 median and mean are both known
- **THEN** the regional figure is the mean × national median/mean and `basis` is `regional-estimated`

#### Scenario: Northern Ireland

- **WHEN** a UK request's location resolves to Northern Ireland
- **THEN** no regional figure is produced, `basis` is `national`, and scoring proceeds as it does today
