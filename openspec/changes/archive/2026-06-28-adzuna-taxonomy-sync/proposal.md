# Adzuna Taxonomy Sync — Proposal

## Context & Motivation

In the previous `adzuna-adapter-pattern` change we introduced `server/constants/locations.ts` mapping our internal URL slugs (e.g., `'east'`) to Adzuna-expected location strings (e.g., `'East of England'`). However, those mapping values were **guessed** — they were not verified against the actual Adzuna API responses.

If even one string is wrong (e.g., Adzuna returns `'Eastern England'` instead of `'East of England'`), the `where` parameter silently fails to match and Adzuna returns national-level results instead of regional ones, producing inaccurate salary and job data for that region.

## Problem

We have no guarantee that the 12 mapped values in `ADZUNA_LOCATION_MAP` match what Adzuna actually expects. The Adzuna Jobs API uses an `area` array in its responses (e.g., `["UK", "South East England"]`), and the exact strings for UK regions are not publicly documented in a static list — they must be discovered at runtime.

## Proposed Changes

1. **Discovery Script:** Create a temporary Nitro API route (`server/api/admin/adzuna-locations.get.ts`) that calls the Adzuna geodata/history endpoint with `location0=UK` and returns the list of child region names. This gives us the exact, verified strings.
2. **Update Mapping:** Replace the guessed values in `server/constants/locations.ts` with the exact strings returned by the discovery script.
3. **Validation:** Confirm the adapter pattern in `jobs.ts` and `salary.ts` still works correctly with the updated map values.
4. **Cleanup:** Mark the discovery route as admin-only so it doesn't ship to production, or remove it entirely after extracting the data.

## Non-Goals

- We will NOT change any UI slugs or URL routing.
- We will NOT add US state mappings in this change (UK regions only).
- We will NOT refactor the adapter pattern itself — only the data it maps to.
