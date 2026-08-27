## 1. Pre-Flight Verification

- [x] 1.1 **Confirm how Vercel keys its edge/SWR cache**: Vercel's Edge Cache inherently keys by Host + Path (well-established Vercel CDN behavior). Nitro's `swr` route rule, however, uses an internal storage cache (`unstorage`) whose key is purely path-based — confirmed against this repo's own precedent, the `/salary/**` swr-vs-`devProviderOverride`-cookie comment in `nuxt.config.ts`, which documents this exact path-only caching gap for a different request-varying input. It does not vary by Host, which guarantees cross-domain bleed for any Host-varying route cached this way.
- [x] 1.2 **Confirm if localhost URLs self-heal**: They will not self-heal — the cache persists for the full 24h `swr` window and is highly likely to be repopulated with a wrong origin on the next deploy or cache-expiry cycle regardless of cause. **Not confirmed**: the specific request that first produces a `localhost` origin. This project has no `nitro.prerender` config (`crawlLinks`/`routes`) enabling a build-time crawl, and Nitro's prerender crawler, where enabled, follows HTML anchor links rather than parsing `robots.txt` — so a build-time crawl following the `robots.txt` `Sitemap:` line is not a valid mechanism here. The real trigger (most plausibly a Vercel-internal health check or deploy warm-up request) would need inspection of Vercel's deployment/function logs to pin down, which is out of scope for this fix — the fix in section 2-3 below does not depend on identifying it.

## 2. Update Nuxt Config

- [x] 2.1 In `nuxt.config.ts`, locate the `routeRules` object block.
- [x] 2.2 Delete the line `'/sitemap.xml': { swr: 86400 }`.
- [x] 2.3 Add a comment explaining that `swr` is intentionally omitted here because Nitro's internal cache is path-only and doesn't vary by Host, so it bleeds one domain's resolved origin (e.g. `localhost`, from whatever request first populates it) into every other domain's sitemap for the cache's lifetime; caching is instead delegated to Vercel's Host-aware Edge Cache via the `Cache-Control` header in `server/routes/sitemap.xml.ts`.

## 3. Update Sitemap Handler

- [x] 3.1 In `server/routes/sitemap.xml.ts`, at the very top of the handler (right after `const origin = url.origin;`), add `setHeader(event, 'Cache-Control', 's-maxage=86400, stale-while-revalidate');`.
- [x] 3.2 Add a comment above it explaining that we are manually delegating the 24-hour cache to Vercel's Edge Network, which correctly partitions the cache by the `Host` header.

## 4. Regression Testing

- [x] 4.1 Read `server/routes/tests/sitemap.xml.spec.ts`.
- [x] 4.2 Add a new test block asserting that `setHeader` is called with the exact arguments: `['Cache-Control', 's-maxage=86400, stale-while-revalidate']`.

## 5. Verification

- [x] 5.1 Run the full verification suite to ensure zero regressions:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm test:e2e`

## 6. Post-Deploy (Manual)

- [ ] 6.1 Once this change is deployed to production, log into Google Search Console for all three domains and explicitly request a fresh crawl of the sitemap to overwrite the stale `localhost` errors.
