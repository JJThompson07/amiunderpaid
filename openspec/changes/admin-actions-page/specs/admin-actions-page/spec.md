## Purpose

Refactor the legacy `jobs-cache.vue` page into a robust `admin-actions.vue` control panel, featuring modular action cards and a unified visual logging console for monitoring server tasks in real-time.

## REMOVED Requirements

### Requirement: Pending Match Suggestions Table

The system SHALL no longer display or manage pending job title match suggestions on this page.

## ADDED Requirements

### Requirement: Unified Admin Actions Layout

The system SHALL provide a dedicated page (`/admin/admin-actions`) to house manual administrative triggers.

#### Scenario: Admin views the actions page

- **WHEN** an authenticated admin navigates to `/admin/admin-actions`
- **THEN** they see a grid or list of distinct action cards (e.g., "Cache Cleanup", "Sync Industry Trends").
- **AND** each card contains a clear description and an execution button.

### Requirement: Visual Action Logger

The system SHALL provide a visual terminal/console UI that displays sequential logs of actions being executed.

#### Scenario: Admin executes an action

- **WHEN** an admin clicks an action button
- **THEN** the system disables the button to prevent duplicate submissions.
- **AND** the system appends a timestamped informational log message to the visual console (e.g., `[10:00:00] Starting Cache Cleanup...`).
- **AND** upon completion or failure, the system appends the final result/error message to the console.
- **AND** the console automatically scrolls to the bottom to display the latest entry.
