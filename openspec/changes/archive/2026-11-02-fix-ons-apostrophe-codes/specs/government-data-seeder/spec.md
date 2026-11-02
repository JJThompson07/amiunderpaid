## ADDED Requirements

### Requirement: Source codes are normalised on parse

The seeder SHALL store occupation and area codes without the text-forcing leading apostrophe some ONS releases include, so codes match the site's `id_code` lookups and the `job_titles` SOC codes.

#### Scenario: ONS 2026 code cells

- **WHEN** a UK spreadsheet row has the code `'2134`
- **THEN** the parsed record's `id_code` is `2134`
