## 1. File Renaming & Cleanup

- [x] 1.1 Rename `app/pages/admin/jobs-cache.vue` to `app/pages/admin/admin-actions.vue`.
- [x] 1.2 In `app/components/Admin/Sidebar.vue` (or the equivalent admin navigation component), update the link that pointed to `/admin/jobs-cache` to point to `/admin/admin-actions`, and rename its label to "Admin Actions".
  - **Correction (found during implementation):** `app/components/Admin/Sidebar.vue` doesn't exist. The admin nav links live inline in `app/components/AmI/NavBar.vue`'s `adminLinks` computed. Updated the `to` there to `/admin/admin-actions` and renamed the i18n key `navbar.jobs-cache` -> `navbar.admin-actions` ("Admin Actions") in both `i18n/locales/en-GB/navbar.json` and `en-US/navbar.json`.

## 2. Refactoring `admin-actions.vue`

- [x] 2.1 Open `app/pages/admin/admin-actions.vue` (formerly `jobs-cache.vue`) and delete the entire "Pending Match Suggestions" HTML block, as well as all its related script logic (e.g., `suggestionsData`, `approveMatch`, `rejectMatch`, and the `JobSuggestion` type) since this functionality has moved to `user-suggestions.vue`.
  - Verified `app/pages/admin/user-suggestions.vue` already implements the same approve/reject flow against the same `/api/admin/suggestions*` endpoints before deleting the duplicate from this page.
- [x] 2.2 Change the page header title from "Cache Maintenance" to "Admin Actions" and update the page description.
- [x] 2.3 Create a type `LogMessage` and a reactive `logs` array. Build a generic `addLog(text, type)` function that pushes to this array with a generated timestamp (`new Date().toLocaleTimeString()`).

## 3. Building the Terminal UI

- [x] 3.1 At the bottom of the page, add a new Terminal UI block (`bg-slate-900 rounded-xl p-4 overflow-y-auto h-64 font-mono text-sm`).
- [x] 3.2 Loop over the `logs` array, rendering each line. Use semantic text colors based on the log type (e.g., `text-emerald-400` for success, `text-red-400` for error, `text-slate-300` for info).
- [x] 3.3 Add a Vue `watch` on the `logs` array. When it changes, use `nextTick` to set the `scrollTop` of the terminal container to its `scrollHeight` so it auto-scrolls to the newest message.

## 4. Implementing the Action Cards

- [x] 4.1 Create an Action Card for **Cache Cleanup**. It should describe deleting expired Adzuna requests.
  - When clicked, call `addLog('Starting Cache Cleanup...', 'info')`.
  - Execute `POST /api/admin/clean-cache` via `useAdminFetch`.
  - On success, `addLog('Success: Cache cleaned.', 'success')`. On error, `addLog('Error: ...', 'error')`.
  - Kept the original file's `confirm()` guard before running (irreversible delete of expired entries).
- [x] 4.2 Create an Action Card for **Sync Industry Trends (Cron)**. It should describe fetching the latest month's salary data for all categories.
  - When clicked, call `addLog('Triggering Industry Trends Sync (Months: 1)...', 'info')`.
  - Execute `POST /api/admin/sync-trends` with `{ months: 1 }` via `useAdminFetch`.
  - On success, log the success. On error, log the error.
  - Both actions share one `executeAction(key, label, apiCall)` helper (per design.md) with independent per-key loading state (`runningActions: Record<string, boolean>`), so running one action doesn't disable the other's button.

## 5. Verification

- [x] 5.1 Run `pnpm test:typecheck` to ensure no broken references from the removed suggestions code.
  - (Corrected from `pnpm test:typecheck`, which is not a script in this repo -- see `package.json`. Ran `pnpm typecheck`, 0 errors.)
- [ ] 5.2 Click both Action buttons in the UI and verify that the Terminal UI correctly displays the start message, waits for the network request, and then appends the success message while auto-scrolling to the bottom.
