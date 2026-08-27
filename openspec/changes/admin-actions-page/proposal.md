## Why

The current `app/pages/admin/jobs-cache.vue` page contains two disparate features: Cache Maintenance and Pending Match Suggestions. The "Pending Match Suggestions" feature is being deprecated/removed. Rather than having a page dedicated purely to cache cleanup, we want to transform this page into a generalized "Admin Actions" hub. This will serve as a control panel for executing manual, long-running, or periodic server tasks (like cache scrubbing or forcing cron job syncs), complete with a visual terminal-like log output.

## What Changes

**1. Page Renaming & Deprecation**

- Delete the "Pending Match Suggestions" table, state, and related API calls from the UI.
- Rename the page from `app/pages/admin/jobs-cache.vue` to `app/pages/admin/admin-actions.vue`.

**2. Generalized Action Panel Layout**

- Restructure the UI into a list/grid of distinct "Action Cards".
- Each Action Card will contain:
  - An icon and title (e.g., "Cache Cleanup", "Sync Industry Trends").
  - A description of what the action does.
  - A primary button to execute the action.

**3. Specific Actions to Implement**

- **Action 1: Clean Cache**: Triggers `POST /api/admin/clean-cache`.
- **Action 2: Sync Industry Trends (Cron)**: Triggers the `POST /api/admin/sync-trends` backfill/sync endpoint manually (passing `months: 1` or `months: 12`).

**4. Visual Action Log (Terminal/Console)**

- Add a new "Action Log" area at the bottom or side of the page.
- This area will look like a terminal/console window (dark background, monospace font).
- When an action is executed, it will append timestamped messages to this log (e.g., `[10:42:01 AM] Triggering Cache Cleanup...`, `[10:42:03 AM] Success: 45 jobs deleted.`).
- The log should automatically scroll to the bottom as new messages arrive.

## Capabilities

### New Capabilities

- `admin-action-logger`: A reactive console UI to display sequential logs of admin actions.

### Modified Capabilities

- `admin-routing`: Moved the cache page to the new actions page.
- `suggestions-queue`: Removed.

## Impact

- `app/pages/admin/jobs-cache.vue` (Deleted / Renamed)
- `app/pages/admin/admin-actions.vue` (New)
