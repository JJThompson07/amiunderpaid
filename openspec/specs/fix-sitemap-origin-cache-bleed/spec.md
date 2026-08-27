# Host-Aware Sitemap Caching

### `nuxt.config.ts`

- **Behavior**: The `routeRules` block does NOT define a `'/sitemap.xml'` entry. No Nitro `swr` (or other) route rule caches this path, because Nitro's internal route-rule cache keys by path only, not by `Host` — on a single Vercel deployment serving three custom domains (`amiunderpaid.com`, `amiunderpaid.co.uk`, `benchmarkmyrole.com`), a path-only cache would let one domain's resolved origin bleed into every other domain's cached sitemap response for the rule's lifetime.
- **Behavior**: A code comment at the `routeRules` block documents why `/sitemap.xml` is deliberately absent, and points to the `Cache-Control` header set in `server/routes/sitemap.xml.ts` as where caching is now delegated.

### `server/routes/sitemap.xml.ts`

- **Behavior**: The handler calls `setHeader(event, 'Cache-Control', 's-maxage=86400, stale-while-revalidate')` directly on the response, before building the sitemap body.
- **Behavior**: This delegates the 24-hour cache to Vercel's Edge Network, which keys cache entries by the full request URL (`Host` + path) rather than path alone — each of the three production domains therefore gets its own independent cache entry, and no single request's resolved `origin` (derived from `getRequestURL(event).origin`) can be cached and served back for a different domain.
- **Behavior**: The handler continues to derive `origin`, `isBenchmark`, `isAmIUnderpaidUS`, and `isAmIUnderpaidUK` from `getRequestURL(event)` exactly as before — the fix is scoped to which layer performs caching, not to the sitemap's per-domain content logic.

### Notes

- The exact request that historically produced a `localhost`-origin sitemap response (observed via Google Search Console) was investigated but not confirmed — this project has no `nitro.prerender` config that would enable a build-time crawl, and Nitro's crawler does not parse `robots.txt` to discover `/sitemap.xml` on its own. The fix above does not depend on identifying that trigger: making the cache Host-aware prevents cross-domain bleed regardless of which request populates the cache first.
