## ADDED Requirements

### Requirement: API host routing

`api.benchmarkmyrole.com` SHALL serve only `/v1/**` (routed to the internal v1 handlers) and `/openapi.json`, answering every other path with a JSON 404. The internal v1 routes MUST return 404 on every other host. These rules MUST be part of the single host-routing rule table and decided before any response cache.

#### Scenario: API root

- **WHEN** a client requests `https://api.benchmarkmyrole.com/`
- **THEN** the response is a JSON 404 that includes a link to the documentation

### Requirement: Developer portal clean paths

On `www.benchmarkmyrole.com`, `/docs`, `/pricing`, `/playground`, `/dashboard`, `/login` and `/signup` (and their sub-paths) SHALL be served by the corresponding `/developers/*` pages, and `/developers/*` SHALL 301 to the clean path. These paths MUST be matched before the benchmarkmyrole catch-all redirect to amiunderpaid.

#### Scenario: Dashboard

- **WHEN** a signed-in user requests `https://www.benchmarkmyrole.com/dashboard`
- **THEN** the developer dashboard is served, not a redirect to amiunderpaid
