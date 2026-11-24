## Purpose

Defines which public host serves which paths. amiunderpaid (`.co.uk` for UK content, `.com` for USA content) is the only consumer UI site, and benchmarkmyrole.com is reserved for the developer/API product. Every host decision is made before any response cache, so cached pages can never be served on the wrong domain.

## ADDED Requirements

### Requirement: Host routing is decided before the response cache

Every host-dependent redirect and rewrite in this capability MUST take effect before any cached (ISR/swr) response is served, so the outcome for a given host + path is the same on a cache hit, a cache miss, and a revalidation.

#### Scenario: Cached result page requested on a host that must redirect

- **WHEN** `/salary/software-engineer/uk` has a warm cache entry and is requested on `www.benchmarkmyrole.com`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/salary/software-engineer/uk`, not the cached page

### Requirement: benchmarkmyrole serves only its allowlisted paths

`www.benchmarkmyrole.com` SHALL serve only the following, and MUST 301-redirect every other path to amiunderpaid, preserving the query string:

- `/` (the developer landing page)
- `/recruiter/**`, `/auth/**` and `/api/**` (temporarily, until the recruiter portal is removed)
- Framework assets
- `/favicon.ico`, `/robots.txt`, `/sitemap.xml`
- benchmarkmyrole's own static brand files

#### Scenario: UK result URL on benchmarkmyrole

- **WHEN** a client requests `https://www.benchmarkmyrole.com/benchmark/actuary/uk/warwickshire?compare=50000`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/salary/actuary/uk/warwickshire?compare=50000`

#### Scenario: USA result URL on benchmarkmyrole

- **WHEN** a client requests `https://www.benchmarkmyrole.com/salary/nurse/usa/texas`
- **THEN** the response is a 301 to `https://www.amiunderpaid.com/salary/nurse/usa/texas`

#### Scenario: Content page on benchmarkmyrole

- **WHEN** a client requests `https://www.benchmarkmyrole.com/how-it-works`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/how-it-works`

#### Scenario: Allowlisted recruiter path on benchmarkmyrole

- **WHEN** a client requests `https://www.benchmarkmyrole.com/recruiter/login`
- **THEN** the page is served from benchmarkmyrole with no redirect

#### Scenario: API path on benchmarkmyrole

- **WHEN** a client sends `POST https://www.benchmarkmyrole.com/api/stripe/webhook`
- **THEN** the request reaches the handler with no redirect

### Requirement: benchmarkmyrole root serves the developer landing page

`www.benchmarkmyrole.com/` SHALL render the developer landing page, which states that the BenchmarkMyRole API is coming and links to amiunderpaid. All its user-visible text MUST come from i18n. The landing page's own path MUST NOT be reachable as a second URL on any host: on benchmarkmyrole it 301s to `/`, and on amiunderpaid hosts it 301s to `https://www.benchmarkmyrole.com/`.

#### Scenario: Developer landing on benchmarkmyrole

- **WHEN** a client requests `https://www.benchmarkmyrole.com/`
- **THEN** a 200 page with benchmarkmyrole branding and the "API coming soon" content is returned

#### Scenario: Developer landing requested on amiunderpaid

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/developers`
- **THEN** the response is a 301 to `https://www.benchmarkmyrole.com/`

### Requirement: The benchmark results page family is retired

The `/benchmark/<title>/<country>[/<location>]` page family SHALL NOT exist. On amiunderpaid hosts, any `/benchmark/**` path MUST 301 to the same path under `/salary/**` on the domain that owns its country, preserving the query string.

#### Scenario: Legacy benchmark URL on amiunderpaid UK

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/benchmark/actuary/uk`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/salary/actuary/uk`

#### Scenario: Legacy USA benchmark URL on the UK domain

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/benchmark/actuary/usa`
- **THEN** the response is a 301 to `https://www.amiunderpaid.com/salary/actuary/usa`, in a single hop

### Requirement: amiunderpaid country content is served only on its owning domain

Country-scoped pages (`/salary/<title>/<country>/**` and `/jobs/<title>/<country>/**`) with country `uk` MUST be served only on `www.amiunderpaid.co.uk`, and those with country `usa` only on `www.amiunderpaid.com`. A request on the other domain MUST 301 to the owning domain with the same path and query string. The country segment MUST match case-insensitively.

#### Scenario: USA salary page requested on the UK domain

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/salary/software-engineer/usa`
- **THEN** the response is a 301 to `https://www.amiunderpaid.com/salary/software-engineer/usa`

#### Scenario: UK jobs page requested on the US domain

- **WHEN** a client requests `https://www.amiunderpaid.com/jobs/actuary/UK/london`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/jobs/actuary/UK/london`

#### Scenario: Owning domain serves its own country

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/salary/software-engineer/uk`
- **THEN** the page is served with a 200 and no redirect

### Requirement: Each site's sitemap lists only that site's pages

`/sitemap.xml` on `www.benchmarkmyrole.com` SHALL list only `https://www.benchmarkmyrole.com/`. It MUST NOT list any `/salary`, `/benchmark`, `/jobs`, `/insights` or other consumer URL. amiunderpaid sitemaps MUST NOT list any `/benchmark` URL.

#### Scenario: benchmarkmyrole sitemap

- **WHEN** `https://www.benchmarkmyrole.com/sitemap.xml` is requested
- **THEN** the XML contains exactly one `<loc>`, `https://www.benchmarkmyrole.com/`

### Requirement: Local development mirrors production host routing

Local development hosts (`ami-uk.localhost`, `ami-us.localhost`, `bmr.localhost`) SHALL be subject to the same host-routing rules as their production counterparts, derived from the same rule definitions. Production builds MUST contain no dev-only routing surface.

#### Scenario: Benchmarkmyrole redirect in local dev

- **WHEN** a developer requests `http://bmr.localhost:3000/about` while running the dev server
- **THEN** the response is a 301 to the local amiunderpaid UK host's `/about`
