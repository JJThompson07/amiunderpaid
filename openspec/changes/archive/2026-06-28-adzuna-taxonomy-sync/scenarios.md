# Adzuna Taxonomy Sync — Scenarios

## Scenario 1: Discovery endpoint returns UK region names

1. **Setup:** Admin has valid Adzuna API credentials configured in `runtimeConfig`.
2. **Action:** Admin calls `GET /api/admin/adzuna-locations?country=gb`.
3. **Expected:** The response is a JSON array containing strings like `"London"`, `"South East England"`, `"West Midlands"`, etc. — the exact names Adzuna uses for UK top-level regions.

## Scenario 2: Updated 'east' slug maps to verified string

1. **Setup:** The discovery endpoint has been run and `ADZUNA_LOCATION_MAP` has been updated with the verified value.
2. **Action:** A user searches for jobs with `location=east`.
3. **Expected:** The outbound Adzuna API request has `where=` set to the verified eastern England region name (e.g., `"Eastern England"` — not the previously guessed `"East of England"`).

## Scenario 3: Unmapped city slug falls through unchanged

1. **Setup:** A user searches for jobs with `location=Manchester`.
2. **Action:** The backend route `/api/adzuna/jobs` processes the request.
3. **Expected:** Since `"manchester"` is not a key in `ADZUNA_LOCATION_MAP`, the adapter passes `"Manchester"` directly to Adzuna's `where` parameter (unchanged).

## Scenario 4: All map values are valid Adzuna region names

1. **Setup:** The discovery script has been run and its output recorded.
2. **Action:** Compare every value in `ADZUNA_LOCATION_MAP` against the discovery output.
3. **Expected:** Every value in the map appears in the discovery output. No guessed or stale values remain.
