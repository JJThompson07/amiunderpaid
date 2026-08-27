## Why

Google Search Console is reporting `http://localhost` URLs in the sitemap for the production domains, causing "URL not allowed" errors. This occurs because the same Vercel deployment handles three domains (`amiunderpaid.com`, `amiunderpaid.co.uk`, `benchmarkmyrole.com`), and the sitemap relies on the request's origin to determine which URLs to generate.

Before designing this fix, we checked the two critical infrastructure details requested — one is confirmed, one is not:

1. **Does Nitro's `swr` cache vary by Host? Confirmed: no.** Nitro's `swr` route rule caches by path only, via `unstorage`, with no Host-header awareness. This repo already has one documented precedent of exactly this gap: the comment above the `/salary/**` and `/benchmark/**` route rules in `nuxt.config.ts` explains that `swr` caching there ignores the `devProviderOverride` cookie for the same reason. Because `/sitemap.xml`'s output varies by Host but the `swr` cache key doesn't, whichever request happens to populate the cache first gets served to every other domain for up to 24 hours.
2. **What specific request populates it with a `localhost` origin? Not confirmed.** This project has no `nitro.prerender` configuration (no `crawlLinks`, no explicit prerender `routes` list) — there is no build-time crawl enabled that would visit `/sitemap.xml` during `nuxt build`. Nitro's prerender crawler, where it is enabled elsewhere, also doesn't work by parsing `robots.txt`'s `Sitemap:` line — it follows `<a href>` links found in already-rendered HTML pages, starting from configured routes. Neither mechanism applies to this project as configured, so the exact trigger (most plausibly a Vercel-internal health check or build/deploy warm-up request whose `Host` resolves to `localhost`) is unconfirmed and would need inspection of Vercel's deployment/function logs to pin down precisely.

The fix below does not depend on identifying the exact trigger: moving the cache from a mechanism that ignores Host to one that is Host-aware by design closes the bleed regardless of what specific request originally populated it, and prevents it recurring no matter the cause.

## What Changes

To fix this without losing the critical 24-hour cache (which prevents 5000+ document Firestore queries on every crawl), we will shift the caching layer from Nuxt/Nitro's internal storage to Vercel's Edge Network.

**1. Remove Nitro's Internal Cache Bleed (`nuxt.config.ts`)**

- We will remove the `'/sitemap.xml': { swr: 86400 }` route rule entirely. This stops Nitro from persisting whatever request first produced a `localhost` origin and serving that same payload across domains.

**2. Delegate to Vercel Edge Cache (`server/routes/sitemap.xml.ts`)**

- Inside the sitemap handler, we will manually append `setHeader(event, 'Cache-Control', 's-maxage=86400, stale-while-revalidate');`.
- Vercel's Edge Cache explicitly keys by the full URL (Host + Path). By setting this header, Vercel will cache the result for 24 hours _per domain_ at the edge, protecting Firestore from excessive reads while perfectly scoping the sitemap to the correct tenant.

**3. Regression Testing (`server/routes/tests/sitemap.xml.spec.ts`)**

- We will add a regression test ensuring the `Cache-Control` header is strictly emitted by the handler.

## Capabilities

### Modified Capabilities

- `sitemap-generation`: Shifted caching mechanism from internal Nitro storage to external Edge Cache to prevent Host-header bleeding.

## Impact

- `nuxt.config.ts`
- `server/routes/sitemap.xml.ts`
- `server/routes/tests/sitemap.xml.spec.ts`
