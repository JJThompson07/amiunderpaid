## Context

The seeder writes through server routes guarded by `server/middleware/admin-guard.ts` (`verifyAdmin` on every `/api/admin/*`), but its summary panel read Firestore directly from the client. The 2026-08-17 remediation made `firestore.rules` deny-by-default and added collection allow-lists to the generic seed/delete routes without listing the benchmark collections.

## Decisions

### Summary moves server-side instead of opening rules

The benchmark collections are only ever read by the public app via Algolia, never via client Firestore. Adding an `isAdmin()` read rule would work, but it would be the only client read path to these collections, and it would depend on the custom claim rather than the `verifyAdmin` check every other seeder action uses. A server route keeps all seeder traffic on one auth path, and leaves `firestore.rules` and its rules tests untouched.

The route keeps the existing query shape: national and regional collections × `UK`/`USA` × the last five years from the current year × `period: 'year'`, using `count()` aggregation (one read per 1,000 matched documents). Errors propagate as `500 Failed to load dataset summary.`, an opaque message per CODE_STANDARDS.md §9.3. The page logs that message instead of hiding it.

### Newest year wins through ranking, not a year filter

The client does not know which years exist without an extra query. Algolia's `customRanking: ['desc(year)']` resolves ties after text relevance. Every benchmark query here either uses an empty query string (regional/national lookups) or matches identical titles across years, so the tie-break always decides between years. `year` is already numeric and already faceted. `sync-algolia` is also used for the coding-index; `customRanking` on an attribute those records lack is a no-op.

Regional consumers loop all hits into a per-location map. Switching to "first hit wins" (`if (!(key in map))`) combined with newest-first ranking yields the newest year per region. Regional queries cap at `hitsPerPage: 1000`. UK regional is 393 regions per year, so two years (786) fit. Even if a third year pushed it over 1,000, the ranking means only the oldest records would be cut off.

### One year per result

Ranking alone gives the newest record _per region_, so a region suppressed in the newest release would still show its older figure next to newer ones. Regional hits are therefore filtered, after the query, to the national hit's year (or the newest regional year when there is no national hit). This costs no extra Algolia calls. The trade-off is deliberate: a region without a figure in the newest release shows no regional data (the existing fallback) rather than a stale one. National and regional uploads for a new year should be done back to back, because regional data is hidden in between.

### Considered: year-less Algolia object IDs

The alternative was to drop the year from the Algolia `objectID`, so each upload overwrites the previous year and the index never holds more than one record per occupation/location. It was rejected for this change for these reasons:

- **No Algolia saving.** The ranking approach is still one search per lookup; the only extra cost is roughly 900 additional UK records.
- **Title-keyed IDs.** IDs are built from the title text, not the SOC code, so an ONS rewording between years would still create duplicates. The key would have to move to `id_code`.
- **Migration.** Existing 2025 records would need re-keying.
- **Rollback.** Deleting a bad upload would no longer restore the prior year, because Algolia would have no copy left to fall back to.
- **Firestore history.** Firestore and Algolia currently share the ID, so keeping per-year history in Firestore would need the two split.

It remains a reasonable follow-up if index tidiness becomes worth that cost.

### Yearly upload stays manual

Seeding remains a manual admin step: each ONS ASHE (around Oct/Nov) and BLS OEWS release is uploaded via `/admin/seed`. Older years stay in place as a fallback for occupations or regions the newer release suppresses.

## Risks

- **Algolia setting change on production indices**: reversible (`setSettings` can unset it) and only takes effect on the next sync. Before the deploy there is a single year per index, so ranking changes nothing observable until 2026 is uploaded.
- **Enabling delete for government data**: deletion stays behind `verifyAdmin`, requires a non-empty filter (existing guard), and the seeder asks for confirmation. This restores the intended pre-August behavior, not new capability.
