## ADDED Requirements

### Requirement: Monthly house price refresh

The monthly economics sync SHALL ingest the newest available HM Land Registry UK House Price Index file, keeping the latest average price per area, and MUST apply the same keep-last-good behaviour as the other sources: if the file cannot be found within the last 4 months, or fails shape validation, no stored house price is changed and the error is recorded and reported.

#### Scenario: Current month not yet published

- **WHEN** the sync runs on 2026-11-20 and the newest published file is 2026-08
- **THEN** the 2026-08 file is ingested and `uk_economic_indicators/house-prices.month` is `2026-08`

#### Scenario: Columns reordered

- **WHEN** the file's columns are reordered but still named `Date`, `AreaCode` and `AveragePrice`
- **THEN** ingestion succeeds

### Requirement: House price in the geo-economics read model

`getGeoEconomics(location)` SHALL include the average house price for the most specific area that has one (local authority, then upper-tier area, then region), with its month and area level.

#### Scenario: Region fallback

- **WHEN** the resolved local authority and upper-tier area have no house price record but the region does
- **THEN** the region's average price is returned with `level: 'region'`
