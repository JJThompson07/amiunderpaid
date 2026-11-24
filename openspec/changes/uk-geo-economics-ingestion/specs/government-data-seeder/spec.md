## ADDED Requirements

### Requirement: UK occupation-by-region scope

The seeder SHALL accept ASHE Table 15 (Work Region × Occupation, 4-digit and 3-digit SOC) as a distinct UK scope. It MUST split each row's description into region and occupation, MUST record the SOC level, MUST keep rows that publish either a median or a mean, MUST reject the file if it contains a region name outside the known GB regions, and MUST write these records to Firestore only, without syncing them to the search index.

#### Scenario: Row with mean but suppressed median

- **WHEN** a Table 15 row for `North East, Chief executives and senior officials` (`'1111`) has median `x` and mean 90,051
- **THEN** a record is produced with `id_code: '1111'`, `soc_level: 4`, `location: 'North East'`, `avg_salary: 90051` and no median

#### Scenario: Unknown region

- **WHEN** a Table 15 file contains a row whose region prefix is not one of the 11 known GB regions
- **THEN** parsing fails with a message naming the region and nothing is written

#### Scenario: Deleting a Table 15 year

- **WHEN** the admin deletes the UK Table 15 dataset for 2026
- **THEN** only records with a `soc_level` for UK 2026 are removed, and the Table 7.7a all-roles records for 2026 remain
