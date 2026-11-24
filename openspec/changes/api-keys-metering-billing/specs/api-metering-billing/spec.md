## ADDED Requirements

### Requirement: Billable unit

Each v1 response with a 2xx status MUST count as exactly one billable request against the account that owns the key. Responses with any other status, including 429, MUST NOT be counted.

#### Scenario: Rate-limited request

- **WHEN** a request is rejected with 429 `rate_limited`
- **THEN** the account's usage count is unchanged

### Requirement: Counters shared across instances with a durable fallback

Usage counts and rate-limit windows MUST be held in a store shared across all server instances. If that store is unreachable, billable usage MUST be recorded durably elsewhere so that it is still reported, and rate limiting SHALL degrade to a per-instance limit rather than rejecting traffic.

#### Scenario: Redis unavailable

- **WHEN** the shared store errors while a 2xx response is produced
- **THEN** the request is recorded in the durable fallback and included in the next usage report

### Requirement: Plan limits

The free plan MUST be hard-capped at its monthly included requests, returning 429 `quota_exceeded` once reached. Paid plans MUST NOT be capped at their included requests; usage above them is billed as overage, up to a safety ceiling that returns 429 `quota_exceeded` and alerts support. Every plan MUST enforce its per-second rate limit with 429 `rate_limited` and a `Retry-After` header.

#### Scenario: Free plan exhausted

- **WHEN** a free account has used its full monthly allowance
- **THEN** further requests receive 429 `quota_exceeded` until the next calendar month (UTC)

#### Scenario: Paid plan over its allowance

- **WHEN** a paid account exceeds its included requests
- **THEN** requests keep succeeding and the excess is billed as overage

### Requirement: Exactly-once usage reporting to Stripe

Usage for paid accounts SHALL be reported to a Stripe billing meter hourly, with an idempotency identifier derived from the account and hour, so that retried or overlapping reporting runs never bill the same hour twice. An hour whose reporting failed SHALL be retried by subsequent runs for at least 24 hours.

#### Scenario: Cron runs twice for the same hour

- **WHEN** the reporting job runs twice for hour `2026-12-01T10`
- **THEN** Stripe records that hour's usage once

### Requirement: Subscription state follows Stripe

The account's plan MUST be set from Stripe webhook events for API subscriptions only (identified by `product: 'bmr_api'` metadata), MUST downgrade to free when the subscription is deleted, and API events MUST NOT alter territory data nor territory events alter API accounts.

#### Scenario: Subscription cancelled

- **WHEN** Stripe sends `customer.subscription.deleted` for an API subscription
- **THEN** the account's plan becomes `free` and the free plan's cap applies from the next request
