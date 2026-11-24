## MODIFIED Requirements

### Requirement: Rate limits on unauthenticated endpoints

The system SHALL limit the number of requests per client IP, per route, on unauthenticated write endpoints, using a client IP the caller cannot freely spoof. Each protected route SHALL have its own budget so that traffic on one route cannot exhaust the limit for another.

#### Scenario: User submits too many requests on a single route

- **WHEN** a client IP exceeds the configured rate limit for a specific protected route within the window
- **THEN** the system returns a 429 Too Many Requests response for that route

#### Scenario: Traffic on one route does not exhaust another route's budget

- **WHEN** a client IP has exhausted its limit for `/api/user/track-search`
- **THEN** a subsequent request from the same IP to `/api/user/suggestion` is still evaluated against its own, separate budget

#### Scenario: Spoofed forwarded-for header does not bypass the limit

- **WHEN** a client sends repeated requests with a different `X-Forwarded-For` value on each request, without arriving through a trusted proxy hop
- **THEN** the system does not treat each request as a new client and the rate limit still applies
