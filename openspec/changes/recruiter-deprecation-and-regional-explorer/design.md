## Context

- The recruiter product spans pages, components, composables, server routes, Stripe flows and Firestore collections (enumerated in tasks.md §3).
- Stripe's `webhook.post.ts` holds territory branches and, after `api-keys-metering-billing`, an API branch that runs first.
- `app/components/Territory/Map.vue` renders ECharts from `public/uk-regions.json` (2018 `ctyua18cd`, 217 features). It matches territories by name through `ons_matches`.
- After `uk-geo-economics-ingestion`, Firestore holds Table 15 records keyed by `id_code` (SOC) and `geo_code` (region GSS), and Table 7.7a all-roles records keyed by `id_code` = area GSS. `shared/utils/ukGeo.ts` maps names and outcodes to GSS codes and regions.

## Goals / Non-Goals

**Goals:**

- No code path reads or writes recruiter data after this change, and no recruiter URL 404s: each one redirects somewhere meaningful.
- The explorer joins data to boundaries by GSS code, never by name.

**Non-Goals:**

- Interactive drill-down below county/UA level.

## Decisions

### D1. Removal order inside the change

1. Results pages and nav: stop rendering recruiter UI. This removes the consumer dependency on `recruiter-card.get.ts`.
2. Routing: recruiter redirects, so the pages become unreachable.
3. Delete pages, components, composables, server routes and utilities, then their tests.
4. Webhook: delete the territory branches, keeping signature verification, `stripe_events` dedup and the API branch.
5. Rules: recruiter collections deny-all.

Each step leaves `pnpm test:verify` green, so the work can be split across commits.

### D2. Redirect targets

| Path                           | Target                                      |
| ------------------------------ | ------------------------------------------- |
| `/recruiter/territories(/.*)?` | `https://www.amiunderpaid.co.uk/explorer`   |
| `/recruiter(/.*)?` (rest)      | `https://www.benchmarkmyrole.com/dashboard` |

- These apply on every production host, ahead of the other rules.
- `/admin/recruiters` and `/admin/banding` 301 to `/admin` on amiunderpaid hosts; they're admin-only, so this is a courtesy.
- The query string is dropped for recruiter redirects. Recruiter query params mean nothing on the targets.

### D3. benchmarkmyrole allowlist after this change

- `/`, the portal clean paths, framework assets, favicon/robots/sitemap and brand static files.
- `/api/developer/**`.
- `/api/stripe/webhook`, kept only if task 1.2 shows a live webhook endpoint on this host. Otherwise removed, and the webhook stays on amiunderpaid.
- `/auth/**`, kept only if task 1.3 shows Firebase's email action URL points at this host. Otherwise removed.

The `// TEMPORARY` comments from `site-separation` are resolved here, one way or the other.

### D4. Explorer data endpoint

`GET /api/explorer/regions?soc=<code>`:

- **With a code:** for each of the 11 GB regions, run the engine's regional cascade (`server/utils/engine/baselines.ts`, exported as `getRegionalOccupationPay(soc, regionGss)`). Returns `{ regions: [{ gss, name, median, p25, p75, basis }], national, dataYear, title }`. Northern Ireland is listed with `basis: 'national'` and no value.
- **Without a code:** all-roles medians by area from the Table 7.7a records, joined to CTYUA GSS through `uk-geo.json`. LAD-level rows roll up to their CTYUA only when the CTYUA itself has no row, and the result is flagged `derived: true` in that case.
- **Caching:** `defineCachedEventHandler`, `maxAge` 24h, keyed by `soc`. The data changes annually.

### D5. Boundaries

`scripts/build-uk-boundaries.ts`:

- Downloads ONS Geoportal "Regions (Dec 2025) BUC" and "Counties and Unitary Authorities (Dec 2025) BUC" GeoJSON, plus Northern Ireland as a single country polygon.
- Simplifies them with `mapshaper` through `pnpm dlx` (a dev-time tool, not a dependency).
- Writes `public/geo/uk-regions-2025.json` and `public/geo/uk-ctyua-2025.json`, each feature carrying only `{ gss, name }`, with a target of under 400 KB each.

Pre-flight task 1.6 confirms the exact dataset names and vintage on the Geoportal, and that the CTYUA codes cover the codes present in Table 7.7a records.

### D6. Explorer UI

- **Page:** `app/pages/explorer.vue` on the default layout.
  - The role picker reuses `useJobAutocomplete` (resolves to a SOC).
  - The URL holds state (`/explorer?soc=2134`), so selections are shareable and ISR-friendly. The route rule `'/explorer': { swr: 86400 }` is cache-safe because output depends only on the query, and Vercel ISR is told to key on `soc` via `isr.allowQuery: ['soc']`.
- **Map:** `app/components/Explorer/Map.vue` is a fresh component built on the ECharts setup of `Territory/Map.vue`. It registers the right boundary file per mode and joins on `gss`.
  - The legend uses `generateColorScale` from `shared/utils/color.ts` (§5).
  - Regions with `basis ≠ regional` are hatched, with an "estimated" legend entry.
- **Sample panel:** `app/components/Explorer/ApiSample.vue` shows a static, illustrative `/v1/benchmark` JSON for the current selection (no key, no API call), plus a "Try it live" link to `https://www.benchmarkmyrole.com/playground`.
- **i18n:** all copy is in `explorer.json` for both locales.

## Risks / Trade-offs

- **[Risk] A live territory subscription exists and would be orphaned.**
  → Task 1.1 stops the change if live mode has any active territory subscription, and asks the user how to handle it.
- **[Risk] Removing the webhook's territory branches drops events for any lingering test subscriptions.**
  → That's acceptable in test mode. Live mode is gated by task 1.1.
- **[Risk] The explorer leans on estimated values in sparse regions.**
  → The `basis` hatch and legend make that explicit.
- **[Trade-off] Recruiter data is unread but still stored for 30+ days.**
  → It's deliberate, per §10. The follow-up deletion change is scheduled by task 7.3.
