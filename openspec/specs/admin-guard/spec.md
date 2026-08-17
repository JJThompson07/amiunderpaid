# admin-guard Specification

## Purpose
Introduces a centralized server middleware to protect all administrative API endpoints with role-based access control.

## Requirements

### Requirement: Admin routes are protected by default
The system SHALL intercept all requests to `/api/admin/*` and verify the caller's identity and role before allowing the request to proceed.

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without a valid Firebase auth token is made to any `/api/admin/*` route
- **THEN** the system returns a 401 Unauthorized or 403 Forbidden error

#### Scenario: Non-admin request is rejected
- **WHEN** a request with a valid Firebase auth token but without the `admin: true` custom claim is made to an `/api/admin/*` route
- **THEN** the system returns a 403 Forbidden error

#### Scenario: Admin request is allowed
- **WHEN** a request with a valid Firebase auth token containing the `admin: true` custom claim is made to an `/api/admin/*` route
- **THEN** the system allows the request to proceed to the route handler

### Requirement: Destructive collection operations require specific validation
The system SHALL validate any request to delete or wipe collections via the admin API to prevent arbitrary data loss.

#### Scenario: Deleting an allowed collection
- **WHEN** an admin requests to delete documents in an explicitly allowed collection (e.g. `adzuna_jobs_cache`) with valid filters
- **THEN** the system performs the batch deletion successfully

#### Scenario: Attempting to delete arbitrary collections
- **WHEN** an admin requests to delete documents in a restricted collection (e.g. `users` or `territory_claims`)
- **THEN** the system rejects the request with a 400 Bad Request error

#### Scenario: Attempting to delete without filters
- **WHEN** an admin requests to delete an allowed collection but provides an empty or missing filter object
- **THEN** the system rejects the request with a 400 Bad Request error to prevent accidental full-collection wipes

### Requirement: Strict route protection
The system SHALL apply `verifyAdmin` strictly to all `/api/admin/` routes without substring exemptions.

#### Scenario: Attacker tries bypass
- **WHEN** a request hits `/api/admin/migrate-claims-bypass`
- **THEN** the middleware intercepts and requires the admin token
