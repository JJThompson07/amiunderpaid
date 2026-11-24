## Why

The repo serves three domains from one Nuxt app and one Vercel project, and decides "which site am I" at runtime from the request host (`app/plugins/tenant.ts` → `$siteBrand`). Production checks on 2026-11-11 show that host detection does not work on the ISR-cached result routes (`/salary/**`, `/benchmark/**`, which Nitro's Vercel preset turns into Vercel ISR functions from `swr: 86400`). The ISR render never sees the real host, so:

- `www.benchmarkmyrole.com/benchmark/<title>/uk` 301s to `/salary/...` and then serves an amiunderpaid-branded page. The BenchmarkMyRole result experience doesn't exist in production, and searches made there are logged with `brand: 'amiunderpaid'`.
- The UK↔US cross-domain redirect in `domain-routing.global.ts` never fires. `amiunderpaid.co.uk/salary/<title>/usa` and `amiunderpaid.com/salary/<title>/uk` both return 200.
- Every result page renders `lang="en-US"` with `<link rel="canonical">` pointing at **`www.amiunderpaid.com`**, including UK pages on `.co.uk`. Google is being told the UK pages' canonical copy lives on the US domain.

Separately, the product direction has changed. BenchmarkMyRole is becoming a paid B2B API (later changes: `server-side-mca-engine` → `api-keys-metering-billing`), and amiunderpaid is the only consumer UI. Keeping a second consumer brand inside every page is now cost with no benefit: `$siteBrand` branches across ~20 consumer files, duplicate `/benchmark/**` pages, and brand-specific i18n. This change splits the two sites cleanly, and does it at Vercel's routing layer, which runs before the ISR cache and reliably sees the host.

## What Changes

- **Host routing moves to the edge.** A single typed rule table (`shared/utils/hostRouting.ts`) is the source of truth. `nuxt.config.ts` compiles it into host-conditioned routes in Nitro's Vercel Build Output config (`nitro.vercel.config.routes`), and a `process.dev`-gated Nitro middleware applies the same table locally.
- **BREAKING (URLs):** every `www.benchmarkmyrole.com` path that isn't on its allowlist 301s to amiunderpaid:
  - `/salary|/benchmark/<title>/uk[/<loc>]` → `www.amiunderpaid.co.uk/salary/...`
  - `.../usa[/...]` → `www.amiunderpaid.com/salary/...`
  - content pages → the `.co.uk` equivalent

  The temporary allowlist is `/recruiter/**`, `/auth/**`, `/api/**`, Nuxt assets and the brand's static files. It keeps the recruiter portal working until `recruiter-deprecation-and-regional-explorer` removes it.

- **New:** `www.benchmarkmyrole.com/` serves a minimal developer landing page ("API coming soon") from `/developers`, through an edge rewrite. amiunderpaid hosts requesting `/developers/**` 301 to it.
- **BREAKING (URLs):** `/benchmark/**` is removed as a page. On amiunderpaid hosts it 301s to `/salary/**` at the edge.
- **Fix:** UK/US domain ownership is enforced at the edge. `/salary|/jobs/<title>/usa` on `.co.uk` 301s to `.com`, and `/uk` on `.com` 301s to `.co.uk`.
- **Fix:** on result pages, canonical, hreflang and `<html lang>` come from the route's `country` param, not the host. UK pages are canonical on `.co.uk` with `en-GB`; USA pages on `.com` with `en-US`. Country-scoped pages carry no cross-locale hreflang alternate.
- **Removed:** `$siteBrand` branching from every amiunderpaid consumer page and component, `app/pages/benchmark/**`, `app/components/Brand/Benchmark/**`, `BaseSearchForm`'s `benchmark` mode, `useLocationEngine`'s `'benchmark'` mode, the now-unused BenchmarkMyRole consumer i18n keys, and rules 2–4 of `domain-routing.global.ts`.
- **Modified:** `www.benchmarkmyrole.com` is dropped from both i18n locale `domains` lists. benchmarkmyrole's `sitemap.xml` lists only `/`, and its `robots.txt` stays as it is.

## Scope

- Edge host-routing table, its compilation into the Vercel config, local dev parity, and unit tests.
- Domain-ownership and canonical/hreflang/lang fixes for amiunderpaid result pages.
- Removing consumer-brand branching and the `/benchmark` page family.
- A minimal i18n'd `/developers` landing page and `developer` layout for benchmarkmyrole.

## Non-goals

- The API itself, API keys, billing, or the real developer portal: `api-keys-metering-billing`.
- Removing the recruiter portal, leads, territory Stripe flows, `resolveBrandFromHost` and its branded emails, or the `tenant.ts` plugin itself. All still needed by `/recruiter/**`; removed in `recruiter-deprecation-and-regional-explorer`.
- `api.benchmarkmyrole.com`: the subdomain is attached in `api-keys-metering-billing`, when there is something to serve.
- Splitting into two Vercel projects (explicitly rejected: one app, strict host split).
- Changing the ISR/swr caching strategy itself.

## Capabilities

### New Capabilities

- `site-host-routing`: which host serves which paths. benchmarkmyrole's allowlist, redirect map and `/` rewrite; amiunderpaid UK/US domain ownership; `/benchmark` retirement; per-site sitemap scope; and the single rule table with its dev-parity and config-compilation guarantees.
- `result-page-seo-metadata`: canonical, hreflang and `<html lang>` on cache-served result pages, derived from the route's country rather than the request host.

### Modified Capabilities

- `industry-trends-seo`: the Homepage CTA requirement no longer refers to a BenchmarkMyRole homepage, since `app/pages/index.vue` renders only the amiunderpaid home.
- `affiliate-offers`: the Page Scope Restriction requirement drops the `/benchmark/...` scenario, because that page family no longer exists.

## Impact

- **Config:** `nuxt.config.ts` (`nitro.vercel.config.routes`, i18n `domains`); `vercel.json` routing is deliberately not used. Nitro 2.13.4's preset reads only `bunVersion` from it and writes its own Build Output `config.json`. Rules placed in `nitro.vercel.config.routes` land directly in that file, where a local preset build can verify them.
- **New:** `shared/utils/hostRouting.ts` (+ tests), `server/middleware/dev-host-routing.ts` (dev only), `app/pages/developers/index.vue`, `app/layouts/developer.vue`, i18n `developers.json` (en-GB, en-US).
- **Modified:** `app/layouts/default.vue`, `app/middleware/domain-routing.global.ts`, `server/routes/sitemap.xml.ts`, and the ~17 consumer files listed in tasks.md.
- **Deleted:** `app/pages/benchmark/**`, `app/components/Brand/Benchmark/{Home,Faq}.vue`.
- **SEO:** benchmarkmyrole result URLs 301 to amiunderpaid. UK result pages' canonical moves from `.com` to `.co.uk`. Expect Search Console re-indexing for a few weeks.
- **Analytics:** no schema change. `brand` on events now reflects reality (always `amiunderpaid` on consumer pages).
- **No new runtime dependencies.**
