## ADDED Requirements

### Requirement: UK take-home calculation from a versioned, sourced rate table

The system SHALL calculate annual and monthly take-home pay from gross salary using a rate table keyed by tax year, where every rate cites its gov.uk source. It MUST apply the personal allowance taper, MUST apply Scottish income tax bands when the tax region is Scotland, and SHALL include employee National Insurance and any selected student loan plans (1, 2, 4, 5, postgraduate).

#### Scenario: Scottish taxpayer

- **WHEN** take-home is calculated for £45,000 with `taxRegion: 'scotland'`
- **THEN** income tax uses the Scottish bands for that tax year and differs from the rest-of-UK result

#### Scenario: Allowance taper

- **WHEN** take-home is calculated for £110,000
- **THEN** the personal allowance is reduced by £1 for every £2 above £100,000

#### Scenario: Location implies Scotland

- **WHEN** `/v1/benchmark` is called with an Edinburgh location and no `tax_region`
- **THEN** take-home uses Scottish bands
