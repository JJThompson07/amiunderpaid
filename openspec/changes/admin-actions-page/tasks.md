## 1. File Renaming & Cleanup
- [ ] 1.1 Rename `app/pages/admin/jobs-cache.vue` to `app/pages/admin/admin-actions.vue`.
- [ ] 1.2 In `app/components/Admin/Sidebar.vue` (or the equivalent admin navigation component), update the link that pointed to `/admin/jobs-cache` to point to `/admin/admin-actions`, and rename its label to "Admin Actions".

## 2. Refactoring `admin-actions.vue`
- [ ] 2.1 Open `app/pages/admin/admin-actions.vue` (formerly `jobs-cache.vue`) and delete the entire "Pending Match Suggestions" HTML block, as well as all its related script logic (e.g., `suggestionsData`, `approveMatch`, `rejectMatch`, and the `JobSuggestion` type) since this functionality has moved to `user-suggestions.vue`.
- [ ] 2.2 Change the page header title from "Cache Maintenance" to "Admin Actions" and update the page description.
- [ ] 2.3 Create a type `LogMessage` and a reactive `logs` array. Build a generic `addLog(text, type)` function that pushes to this array with a generated timestamp (`new Date().toLocaleTimeString()`).

## 3. Building the Terminal UI
- [ ] 3.1 At the bottom of the page, add a new Terminal UI block (`bg-slate-900 rounded-xl p-4 overflow-y-auto h-64 font-mono text-sm`).
- [ ] 3.2 Loop over the `logs` array, rendering each line. Use semantic text colors based on the log type (e.g., `text-emerald-400` for success, `text-red-400` for error, `text-slate-300` for info).
- [ ] 3.3 Add a Vue `watch` on the `logs` array. When it changes, use `nextTick` to set the `scrollTop` of the terminal container to its `scrollHeight` so it auto-scrolls to the newest message.

## 4. Implementing the Action Cards
- [ ] 4.1 Create an Action Card for **Cache Cleanup**. It should describe deleting expired Adzuna requests.
  - When clicked, call `addLog('Starting Cache Cleanup...', 'info')`. 
  - Execute `POST /api/admin/clean-cache` via `useAdminFetch`. 
  - On success, `addLog('Success: Cache cleaned.', 'success')`. On error, `addLog('Error: ...', 'error')`.
- [ ] 4.2 Create an Action Card for **Sync Industry Trends (Cron)**. It should describe fetching the latest month's salary data for all categories.
  - When clicked, call `addLog('Triggering Industry Trends Sync (Months: 1)...', 'info')`.
  - Execute `POST /api/admin/sync-trends` with `{ months: 1 }` via `useAdminFetch`.
  - On success, log the success. On error, log the error.

## 5. Verification
- [ ] 5.1 Run `pnpm test:typecheck` to ensure no broken references from the removed suggestions code.
- [ ] 5.2 Click both Action buttons in the UI and verify that the Terminal UI correctly displays the start message, waits for the network request, and then appends the success message while auto-scrolling to the bottom.
