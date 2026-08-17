## Why

The platform relies on Algolia for real-time autocomplete suggestions (job titles and locations). Algolia's free tier imposes a strict 10,000 search request limit per month. Currently, the autocomplete fires aggressively on every keystroke after a 300ms delay, leading to significant quota waste via duplicate/rapid queries from the same user session.

## What Changes

Optimize the `useJobAutocomplete` composable to drastically reduce outbound Algolia requests while maintaining a snappy user experience. We will:
- Increase the typing debounce from 300ms to 500ms to allow users to finish their word before triggering a search.
- Implement a client-side in-memory cache (`Map`) for autocomplete results, preventing duplicate Algolia API calls when a user deletes characters or repeats a search in the same browser session.

## Scope

- Modify `app/composables/useJobAutocomplete.ts`.
- Retain the current 2-character minimum threshold (standard UX practice).
- Ensure caching logic respects both the search term and the active filters (e.g. `UK` vs `USA`).

## Non-Goals

- No server-side caching or complex Redis layers.
- No changes to the core search resolution engines (`useJobDictionary`, `useMacroData`), as those are low-frequency submissions.
