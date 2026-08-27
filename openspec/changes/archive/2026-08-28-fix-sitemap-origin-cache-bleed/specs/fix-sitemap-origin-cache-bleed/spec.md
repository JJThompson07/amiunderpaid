## Purpose

Resolve cross-domain cache poisoning of the `sitemap.xml` payload by shifting caching responsibility from Nitro's internal path-based storage to Vercel's Host-aware Edge Network.

## MODIFIED Requirements

### Requirement: Host-Aware Sitemap Caching

The system SHALL cache the sitemap output independently for each multi-tenant domain without any single request's resolved origin bleeding into another domain's cached response.

#### Scenario: Vercel Edge Caching

- **GIVEN** the application is deployed to Vercel across multiple custom domains
- **WHEN** a crawler requests `/sitemap.xml` from `amiunderpaid.com`
- **THEN** the server returns the USA-scoped sitemap with a `Cache-Control: s-maxage=86400, stale-while-revalidate` header.
- **AND** Vercel's Edge Cache stores this payload strictly for `amiunderpaid.com`.
- **AND** a subsequent request to `amiunderpaid.co.uk` bypasses this cached payload, hits the origin, and caches its own UK-scoped sitemap independently.

#### Scenario: No Single Request Can Poison Other Domains

- **WHEN** any single request to `/sitemap.xml` resolves an origin other than one of the three production domains (for example, an internal Vercel health check or deploy warm-up request whose `Host` resolves to `localhost` — the exact source is unconfirmed and not required to be known for this scenario to hold)
- **THEN** that response is NOT persisted in a Host-blind cache and served to unrelated domains, because the internal path-only `swr` route rule that previously caused this has been removed
- **AND** each production domain's sitemap continues to be cached independently by Vercel's Edge Network, keyed by the full request URL including Host.
