## MODIFIED Requirements

### Requirement: Unified Admin Actions Layout

The system SHALL provide a dedicated page (`/admin/admin-actions`) to house manual administrative triggers and display per-source synchronization health. For the "Sync Industry Trends" card, the page MUST display the last successful sync timestamp, latest published month, and last error independently for each official data source (`UK — ONS AWE` and `US — BLS CES`).

#### Scenario: Admin views the actions page

- **WHEN** an authenticated admin navigates to `/admin/admin-actions`
- **THEN** they see distinct action cards including "Cache Cleanup" and "Sync Industry Trends"
- **AND** the "Sync Industry Trends" card displays the last successful sync time, latest month, and last error (if any) separately for `UK (ONS AWE)` and `US (BLS CES)`.
