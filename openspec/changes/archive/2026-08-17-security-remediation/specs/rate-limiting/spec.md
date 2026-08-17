## Purpose

Provide API rate limiting on public write endpoints to prevent abuse and denial of service.

## ADDED Requirements

### Requirement: Rate limits on unauthenticated endpoints

The system SHALL limit the number of requests per IP on unauthenticated write endpoints.

#### Scenario: User submits too many requests

- **WHEN** an IP exceeds the configured rate limit
- **THEN** the system returns a 429 Too Many Requests response
