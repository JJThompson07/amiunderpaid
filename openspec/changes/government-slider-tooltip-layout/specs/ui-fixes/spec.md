## ADDED Requirements

### Requirement: Live Market Comparison Card Jobs Count Prominence

The live market comparison card SHALL display the number of live jobs backing the benchmark as a distinct, visually prominent stat alongside the Market Average stat, rather than only within body text.

#### Scenario: User views the live market comparison card

- **WHEN** a user views the live market comparison card with Adzuna data
- **THEN** the card displays a "Jobs" stat with the live job count to the right of the "Market Average" stat, using the same visual weight as the average salary figure
- **AND** the introductory text below the job title no longer includes the live job count, instead stating that the benchmark is based on current live vacancy postings.

#### Scenario: User views the government comparison card

- **WHEN** a user views the government benchmark comparison card, which has no live jobs concept
- **THEN** the card continues to render only the Market Average stat, with no Jobs stat present.
