# rate-limiting Specification

## Purpose

Provide API rate limiting on public write endpoints to prevent abuse and denial of service.

## Requirements

### Requirement: Rate limits on unauthenticated endpoints

The system SHALL limit the number of requests per client IP, per route, on unauthenticated write endpoints, using a client IP the caller cannot freely spoof. Each protected route SHALL have its own budget so that traffic on one route cannot exhaust the limit for another.

#### Scenario: User submits too many requests on a single route

- **WHEN** a client IP exceeds the configured rate limit for a specific protected route within the window
- **THEN** the system returns a 429 Too Many Requests response for that route

#### Scenario: Traffic on one route does not exhaust another route's budget

- **WHEN** a client IP has exhausted its limit for `/api/user/track-search`
- **THEN** a subsequent request from the same IP to `/api/user/leads/submit` is still evaluated against its own, separate budget

#### Scenario: Spoofed forwarded-for header does not bypass the limit

- **WHEN** a client sends repeated requests with a different `X-Forwarded-For` value on each request, without arriving through a trusted proxy hop
- **THEN** the system does not treat each request as a new client and the rate limit still applies

### Requirement: Bounded limiter memory

The rate limiter's request-count store SHALL NOT grow without bound for the lifetime of the server process; expired entries SHALL be pruned or the store SHALL enforce a maximum size.

#### Scenario: High volume of distinct (spoofed or genuine) keys

- **WHEN** the limiter observes a large number of distinct IP/route keys over time
- **THEN** the store's memory usage SHALL remain bounded, either by evicting expired entries on write or by enforcing a maximum entry count (LRU eviction)

### Requirement: Limiter consistency across serverless instances

Given the platform's serverless deployment target, the rate limiter's counter SHALL be backed by a store shared across instances (e.g. Firestore or Upstash), so that limits are not silently reset by routing to a fresh instance. If a shared store is not yet implemented, the in-memory limitation SHALL be tracked as a known, ticketed gap rather than only documented in a code comment.

#### Scenario: Requests routed to different serverless instances

- **WHEN** a client's requests are routed to different serverless instances within the same rate-limit window
- **THEN** the shared counter SHALL reflect the combined request count across instances, once the shared-store task is complete
