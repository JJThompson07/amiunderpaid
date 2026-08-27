## Overview

This fix removes Nuxt/Nitro's internal caching layer for the sitemap and delegates caching entirely to Vercel's Edge Network, which correctly respects the `Host` header by default.

## Key Decisions

**1. Removing Nitro Route Rules**

- _Decision_: Remove `'/sitemap.xml': { swr: 86400 }` from `nuxt.config.ts`.
- _Rationale_: Nitro's `swr` config uses `unstorage` to write the payload to KV or memory, keyed purely by path — confirmed by this repo's own precedent (the `/salary/**` swr-vs-`devProviderOverride`-cookie comment documents the same path-only caching gap for a different request-varying input). Whatever single request first populates this cache with a `localhost` origin — the exact trigger is unconfirmed; this project has no `nitro.prerender` config (`crawlLinks`/`routes`) enabling a build-time crawl, and Nitro's crawler doesn't parse `robots.txt` in any case, so that specific mechanism doesn't apply here — every subsequent request to any of the three domains receives that same cached payload for up to 24 hours. Removing the route rule stops any single request's origin from being persisted and served cross-domain, regardless of what that request turns out to be.

**2. Manual Cache-Control Header**

- _Decision_: Inject `setHeader(event, 'Cache-Control', 's-maxage=86400, stale-while-revalidate')` inside `server/routes/sitemap.xml.ts`.
- _Rationale_: Vercel's Edge Network automatically respects `s-maxage`. Unlike Nitro's internal storage, Vercel's Edge Cache explicitly uses the full URL (including the domain/host) as the cache key. This perfectly satisfies the multi-tenant architecture: each domain gets its own 24-hour cache, and we protect the Firestore database from redundant 5000-document queries.

**3. Regression Testing**

- _Decision_: Update `server/routes/tests/sitemap.xml.spec.ts` to assert the header is present.
- _Rationale_: We must prove that our manual cache delegation works. We will add a test that ensures `setHeader` is called with the correct `Cache-Control` directive.
