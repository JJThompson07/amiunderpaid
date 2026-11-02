## Decisions

### Parse client-side rather than upload the file elsewhere

Uploading the spreadsheet to Firebase Storage and parsing it server-side would get past the request limit for the file. But the parsed result and the seed/sync bodies would still exceed it, so chunking would be needed anyway. Parsing in the browser removes the largest transfer entirely and leaves one problem to solve: chunked writes.

The vendored `xlsx` (0.20.3) ships an ESM browser build (`xlsx.mjs`). `seed.vue` dynamic-imports it together with `govSpreadsheet.ts`, so it is only fetched when an admin parses a file.

### One parser

The national and regional endpoints were near-copies. The USA branches are identical: `OCC_TITLE` → title and `AREA_TITLE` → location, in both. The UK branches differ only in how `Description` is used:

- national: it is the job title, and location is fixed to `'United Kingdom'`;
- regional: it is the location (mapped through `ONS_LOCATIONS`), and title is fixed to `'All'`.

A single `parseGovernmentWorkbook(workbook, { country, scope, year })` with shared header detection and value cleaners replaces both. Structural failures throw `Error` with the same messages the endpoints used, which the seeder logs.

### Chunk size

Seeded records serialise to roughly 300–400 bytes. Chunks of 1,000 records (~0.4 MB) stay an order of magnitude under the 4.5 MB limit and keep each request's work small:

- `/api/admin/seed` writes 1,000 docs as two 500-op Firestore batches;
- `sync-algolia` is one `saveObjects` call.

A USA regional upload is about 37 chunks per step. `sync-algolia` takes an optional `configureSettings` flag (default `true`, so existing callers are unchanged), and `batchSyncSearch` sets it only on the first chunk, so index settings are applied once per sync rather than 37 times.

### Auth token reuse

Chunking turns 2 admin requests into about 74. `useAdminFetch` used to force a token refresh (`getIdToken(true)`) on every request, which would have meant 74 round-trips to Google's token endpoint. It now uses the SDK's cached token, which refreshes itself near expiry. On a `403` it forces one refresh and retries once, so an admin whose `admin` claim was granted after their token was minted still gets in. That was the reason for forcing the refresh in the first place.

### Failure and retry

Chunks run sequentially. On the first failure the run stops and logs `n of total` written, and the error propagates. Firestore doc IDs and Algolia `objectID`s are deterministic, so re-running Sync overwrites the same records instead of duplicating them. That makes "click Sync again" a complete recovery.

If Firestore completes but the search sync fails, a `firestoreSynced` flag makes the next Sync skip straight to the search step instead of re-writing every document. Changing country, year or scope after parsing discards the parsed data, because country and year are baked into each record.
