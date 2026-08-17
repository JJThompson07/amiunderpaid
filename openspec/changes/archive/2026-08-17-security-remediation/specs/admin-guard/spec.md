## ADDED Requirements

### Requirement: Strict route protection

The system SHALL apply `verifyAdmin` strictly to all `/api/admin/` routes without substring exemptions.

#### Scenario: Attacker tries bypass

- **WHEN** a request hits `/api/admin/migrate-claims-bypass`
- **THEN** the middleware intercepts and requires the admin token
