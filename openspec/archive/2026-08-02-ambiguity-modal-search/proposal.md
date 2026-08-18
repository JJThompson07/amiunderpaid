## Why

When a user searches for a job title and the exact match isn't found or is ambiguous, the Ambiguity Modal presents the closest matches. However, if none of those matches are correct, the user currently has to close the modal, navigate back, and enter a completely new search term. By adding a live search capability within the modal, users can seamlessly search the entire job dictionary without losing their current context.

## What Changes

- Add a search input field (`AmIInputGeneric`) to the Ambiguity Modal (`ModalAmbiguity.vue`).
- Implement an Algolia search integration directly within the modal.
- Include a 300ms debounce on the search input to optimize Algolia query usage.
- Update the modal's list of options dynamically to display the results of the live search.
- Ensure the modal displays the original `options` array passed by the parent when the search field is empty or contains fewer than 2 characters.

## Capabilities

### New Capabilities

- `job-search-ambiguity-modal`: Adds a dynamic, in-modal search feature allowing users to query the full Algolia dictionary if the initial suggestions are inaccurate.

### Modified Capabilities

-

## Impact

- **UI Components**: `app/components/Modal/Ambiguity.vue` will be modified.
- **Dependencies**: Uses existing Algolia Client via `useNuxtApp().$algolia` and `@vueuse/core`'s `useDebounceFn`.
- **E2E Tests**: May require updates to E2E tests if they interact with the Ambiguity modal.
