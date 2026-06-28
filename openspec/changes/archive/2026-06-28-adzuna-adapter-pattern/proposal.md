# Adzuna Adapter Pattern Proposal

## Context & Motivation

Currently, the user interface and routing system pass URL-friendly location slugs (e.g., `east`, `north-west`) to our backend API. However, the Adzuna API expects specific official strings for locations (e.g., `East of England`). If we pass our internal slugs directly to Adzuna, it may fail to find matches or return incorrect data. We want to keep our UI and URLs clean and consistent, so we need an Adapter Pattern on the server side to map our internal slugs to Adzuna's expected location strings before the network request is made.

## Proposed Changes

1. **Mapping Constant:** Create a new file `server/constants/locations.ts` that exports a mapping object from internal slugs to Adzuna location strings.
2. **Adapter Logic in APIs:** Update the Adzuna integration endpoints (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) to intercept the incoming location query parameter, look it up in the mapping, and substitute it with the official string before calling the Adzuna API.
3. **Graceful Fallback:** If a slug is not found in the mapping, the system will fall back to using the slug as the raw search term (preserving the original behavior for cities or unmatched regions).

## Non-Goals

- We will not refactor the UI or client-side routing.
- We will not alter the internal database structure or how locations are stored.
- We will not modify the Adzuna API response parsing logic.
