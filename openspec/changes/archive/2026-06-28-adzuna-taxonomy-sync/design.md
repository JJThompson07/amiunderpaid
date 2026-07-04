# Adzuna Taxonomy Sync — Design

## Approach

### Phase 1: Discover Adzuna's Region Names

The Adzuna Jobs API exposes child locations via the `area` array in job listing responses. We can also query the history/geodata endpoint with `location0=UK` to get sub-region breakdowns where the keys are the exact region names Adzuna uses.

We will create a temporary admin-only API route:

```
GET /api/admin/adzuna-locations?country=gb
```

This route will:

1. Call `https://api.adzuna.com/v1/api/jobs/gb/geodata?location0=UK` (or a search endpoint with no `where` filter, inspecting the returned `area` arrays).
2. Extract and deduplicate the `area[1]` values from the response — these are the top-level UK region names.
3. Return them as a JSON array.

### Phase 2: Update the Mapping

Once we have the verified list, we update `server/constants/locations.ts` to replace any incorrect values. For example, if the API returns `'Eastern England'` instead of our guessed `'East of England'`, we fix it.

### Phase 3: Verify Adapter Integration

The adapter logic in `jobs.ts` and `salary.ts` already reads from `ADZUNA_LOCATION_MAP` — no code changes are needed there. We just need to confirm the updated values are picked up correctly via a manual test or by checking the outbound request.

## Files Affected

| File                                       | Change                                 |
| ------------------------------------------ | -------------------------------------- |
| `server/api/admin/adzuna-locations.get.ts` | **NEW** — Temporary discovery endpoint |
| `server/constants/locations.ts`            | **MODIFIED** — Updated map values      |
