## MODIFIED Requirements

### Requirement: Limiter consistency across serverless instances

Given the platform's serverless deployment target, the rate limiter's counter SHALL be backed by a store shared across instances, so that limits are not silently reset by routing to a fresh instance. Public API traffic and developer-account endpoints SHALL use the shared Redis store. The remaining unauthenticated consumer write endpoints MAY continue to use the per-instance limiter, which SHALL remain tracked as a known gap until they are migrated.

#### Scenario: Requests routed to different serverless instances

- **WHEN** an API key's requests are routed to different serverless instances within the same rate-limit window
- **THEN** the shared counter SHALL reflect the combined request count across instances

#### Scenario: Shared store unavailable

- **WHEN** the shared store is unreachable
- **THEN** the limiter SHALL fall back to a per-instance limit rather than rejecting all traffic
