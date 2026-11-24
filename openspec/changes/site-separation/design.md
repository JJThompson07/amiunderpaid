## Context

One Nuxt 4 app is deployed as one Vercel project (`prj_PgKmh9wzUPm96dEfkN6mF8Dvpvog`) with three production hosts, `www.amiunderpaid.co.uk`, `www.amiunderpaid.com` and `www.benchmarkmyrole.com`, each with an apex→www redirect configured in Vercel. Site identity is decided inside the app:

- `app/plugins/tenant.ts` sets `$siteBrand` from `useRequestURL().hostname`.
- `app/middleware/domain-routing.global.ts` sets the locale per host (rule 1), swaps `/salary`↔`/benchmark` per brand (rules 2–3), and redirects UK/USA result pages to their domain (rule 4).
- `app/layouts/default.vue` builds canonical and hreflang from `$siteBrand` + `locale`.

`routeRules` give `/salary/**` and `/benchmark/**` `swr: 86400`. Nitro 2.13.4's Vercel preset (`dist/presets/vercel/utils.mjs`) converts `swr` into Vercel ISR prerender functions. Production probes (2026-11-11) show these ISR renders do not see the request host. On those routes the plugin falls back to `amiunderpaid`, the middleware's host checks match neither domain, and the locale falls back to `en-US`. That is why benchmarkmyrole serves amiunderpaid pages, rule 4 never fires, and UK pages carry a `.com` canonical with `lang="en-US"` (see proposal.md, Why). Non-ISR routes (`/`, `/about`, …) do see the host correctly.

Nitro writes its own Build Output API `config.json`. It reads only `bunVersion` from `vercel.json` and merges user routing from `nitro.vercel.config` ahead of its generated routes (`defu(nitro.options.vercel?.config, {...})`).

## Goals / Non-Goals

**Goals:**

- Every host decision happens in Vercel routing, ahead of ISR, from one typed rule table that is unit-tested.
- Cache-served pages derive anything domain-specific from the route, never from the host.
- The amiunderpaid consumer code has no brand branching left. The only brand-aware code that remains is what `/recruiter/**` still needs, and it's removed with the recruiter portal.

**Non-Goals:**

- Fixing host-blindness for ISR in general (e.g. via `allowQuery` or `passQuery`). Making cached pages host-independent removes the need.
- Removing `tenant.ts`, `resolveBrandFromHost`, `loginLayout`'s brand favicon, or recruiter emails. All are deferred to `recruiter-deprecation-and-regional-explorer`.

## Decisions

### D1. Edge routing via `nitro.vercel.config.routes`, not `vercel.json` or app middleware

- **Chosen:** host-conditioned Build Output routes (`{ src, has: [{ type: 'host', value }], status: 301, headers: { Location } }`, plus one rewrite `{ src: '^/$', has: host, dest: '/developers' }`) generated into `nitro.vercel.config.routes`.
- **Rejected: app/route middleware.** It provably doesn't see the host on ISR routes (the root cause).
- **Rejected: Nitro server middleware.** It runs inside the same ISR function, with the same blindness.
- **Rejected: `vercel.json` `redirects`.** Documented for Vercel's own builders, but Nitro emits a prebuilt Build Output and only reads `bunVersion`. Whether Vercel layers `vercel.json` redirects on top of that isn't something we can check locally, whereas `config.json` is.
- **Rejected: Vercel Routing Middleware.** Would work, but adds a runtime function on every request across all three hosts for what are static rules.

The generated config is checked by task 1.2: a `NITRO_PRESET=vercel` build, then an inspection of `.vercel/output/config.json` showing our routes ahead of the ISR routes.

### D2. One rule table, two consumers

`shared/utils/hostRouting.ts` exports pure data and pure functions:

- `PRODUCTION_HOSTS` / `DEV_HOSTS`
- `BMR_ALLOWLIST` (path patterns)
- `resolveHostRoute(host, path, query): { type: 'redirect', location, status: 301 } | { type: 'rewrite', path } | { type: 'pass' }`, the canonical decision function, and the thing unit-tested exhaustively against the spec scenarios
- `toVercelRoutes(hosts)`, which compiles the table into Build Output route objects (regex `src` with named captures)

`nuxt.config.ts` imports `toVercelRoutes(PRODUCTION_HOSTS)` (nuxt.config runs through jiti, so a relative TS import of a dependency-free module works). A unit test asserts that for every spec scenario, evaluating the compiled Vercel routes with a tiny in-test matcher (first match, regex `src` + host) produces the same result as `resolveHostRoute`. That's what stops the two drifting apart.

Alternative considered: hand-write `vercel.json` and a separate dev middleware. Rejected, because two hand-kept copies is exactly how they'd drift.

### D3. Dev parity with a `process.dev`-gated Nitro middleware

`server/middleware/dev-host-routing.ts` returns early unless `process.dev` (CODE_STANDARDS §9.5's server-side dev gate), then applies `resolveHostRoute(DEV_HOSTS…)`. In dev there's no ISR, so server middleware does see the host. Production never reaches the routing logic. Dev host map: `ami-uk.localhost:3000` → UK, `ami-us.localhost:3000` → US, `bmr.localhost:3000` → BMR. `localhost:3000` / `127.0.0.1:3000` keep today's behaviour (amiunderpaid UK) and are never redirected, so the plain `pnpm dev` + Playwright flow is unaffected. `bmr.us.localhost` is removed.

### D4. benchmarkmyrole redirect targets

- Country-scoped paths (`/(salary|benchmark|jobs)/<title>/<country>/**`) go to the owning amiunderpaid domain, always on `/salary` for `salary|benchmark`, and stay on `/jobs` for jobs. That's one hop.
- Every other non-allowlisted path goes to `https://www.amiunderpaid.co.uk<same path>`. The API is UK-first and benchmarkmyrole has no locale of its own any more.
- The allowlist is a single negative-lookahead `src` per host (`^/(?!recruiter(/|$)|auth(/|$)|api(/|$)|_nuxt/|__nuxt|favicon\.ico$|robots\.txt$|sitemap\.xml$|benchmarkmyrole-[^/]+$|$).*`), with explicit country rules ordered before the catch-all.

The `/recruiter|/auth|/api` allowlist entries carry a `// TEMPORARY: removed in recruiter-deprecation-and-regional-explorer` comment and a matching task in that change's plan. `/api/**` stays allowlisted regardless: a live Stripe webhook may be registered on the benchmarkmyrole host (test mode has none, live mode unchecked), and a 301 would make Stripe treat deliveries as failures.

### D5. Developer landing at `/developers` + a `developer` layout

- **Chosen:** an edge rewrite of benchmarkmyrole's `/` to `/developers`, which means `app/pages/index.vue` no longer needs to branch.
- `app/layouts/developer.vue` carries the benchmarkmyrole logo, favicon and theme class directly. It doesn't depend on `$siteBrand`.
- The page is static, i18n'd copy plus a link to amiunderpaid. No forms or data collection.
- **Rejected:** keeping `index.vue`'s `$siteBrand` branch. It works on a non-ISR route today, but it keeps brand branching in a consumer page, which is exactly what this change removes.

### D6. Cache-safe result page metadata

- `domain-routing.global.ts` keeps only rule 1, rewritten: when the route has a `country` param, the locale is set from it (`uk` → `en-GB`, `usa` → `en-US`); otherwise from the host, as today. Rules 2–4 are deleted (now at the edge).
- In `default.vue`:
  - Canonical base for routes with a `country` param comes from the param (`uk` → `.co.uk`, `usa` → `.com`); other routes keep the `locale`-based logic.
  - Country-scoped routes get no hreflang alternates.
  - Non-country amiunderpaid pages (`/about`, `/how-it-works`, …) keep their en-GB/en-US/x-default alternates. Those are genuine locale variants of the same content.
  - The benchmarkmyrole branch of `getBaseUrl` is removed. The developer layout sets its own canonical.

### D7. Removing consumer brand branching

Each consumer file keeps exactly its `amiunderpaid` branch:

- `BrandBenchmark*` components and `/benchmark` pages are deleted.
- `LocationBreadcrumbs`, `NoData` and the jobs page link hard-code `/salary`.
- `Card/Role.vue`'s `card.role.${$siteBrand}.*` keys become `card.role.amiunderpaid.*`.
- `ogImage` uses `/amiunderpaid-og.png`.
- i18n keys used only by the removed branches (`about.benchmark.*`, `card.role.benchmarkmyrole.*`, `search.benchmark.*`, and others found by the task 4.12 enumeration) are deleted from both locales.
- `app.vue`'s `theme-${$siteBrand}` and `useAnalytics` / `useUserLogging`'s `brand` field are left alone. They keep working, now always resolve to `amiunderpaid` on consumer pages, and the analytics spec requires the `brand` field.

## Risks / Trade-offs

- **[Risk] A Build Output route mistake 301s real traffic in a loop, or to the wrong place.**
  → Host-conditioned rules can't be exercised on a preview deployment: Vercel routes a request by its host to the deployment that owns that domain, so neither the `*.vercel.app` URL nor a spoofed `Host` header reaches the new rules. Instead:
  - exhaustive unit tests over `resolveHostRoute`, plus the compiled-route equivalence test
  - inspecting the real generated `.vercel/output/config.json` (task 1.2)
  - a preview deployment to confirm the non-host behaviour (canonical, lang, removed pages)
  - initially temporary (302) redirects (below), then a production smoke suite immediately after promotion (task 6.4), with Vercel instant rollback
- **[Risk] 301s are cached hard by browsers and search engines; a wrong permanent redirect is sticky.**
  → Ship the edge routes with `status: 302` first (task 6.3), verify in production for 48h, then flip to 301 in a one-line follow-up commit (task 6.5). The spec states 301 as the end state.
- **[Risk] UK result pages' canonical moving from `.com` to `.co.uk` causes ranking churn while Google re-processes.**
  → It's the correct state; the current one actively points UK content at the US domain. Resubmit both sitemaps in Search Console after deploy (task 6.6).
- **[Risk] Recruiter flows on benchmarkmyrole still depend on `$siteBrand` (`loginLayout`, `recruiter/login`).**
  → They're on non-ISR routes (`ssr: false`), where host detection works, and they're explicitly out of scope until the recruiter portal is removed.
- **[Trade-off] `/api/**` stays reachable on benchmarkmyrole, so consumer API routes still answer there.**
  → Acceptable: the APIs are host-agnostic. The `api-keys-metering-billing` change moves the public API to `api.benchmarkmyrole.com` and narrows this allowlist.

## Migration Plan

1. Merge with edge routes at `302`. Deploy to preview and verify the non-host behaviour (tasks 6.1–6.2). Promote to production.
2. Run the production smoke suite (task 6.4) immediately. If anything fails, roll back instantly to the previous deployment in Vercel.
3. After 48h clean, flip the generated status to `301` (task 6.5).
4. Resubmit `www.amiunderpaid.co.uk/sitemap.xml`, `www.amiunderpaid.com/sitemap.xml` and `www.benchmarkmyrole.com/sitemap.xml` in Search Console.

No data migration. The change is fully reversible by redeploying the previous build.

## Open Questions

- What share of real traffic hits benchmarkmyrole? `search_history` undercounts it (see proposal). GA property `G-EZQYZSSRW1` broken down by hostname will show it. This doesn't change the design, only how closely to watch Search Console after the 301 flip.
