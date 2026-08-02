## Context

Currently, the `ModalAmbiguity.vue` component receives a static list of `options` from its parent component (`SalarySearch.vue` or `RoleSearch.vue`), representing the closest fuzzy matches from Algolia. If the user doesn't see their desired role, they must exit the modal. To resolve this without breaking existing behavior, we will embed an active Algolia search client inside the modal itself, leveraging the same Nuxt plugin (`$algolia`) used in `useJobAutocomplete.ts` and `useJobDictionary.ts`.

## Goals / Non-Goals

**Goals:**
- Provide a responsive, debounced search input within `ModalAmbiguity.vue`.
- Connect directly to Algolia (`uk_job_groups` or `usa_job_groups`) based on the active country.
- Fall back gracefully to the provided `options` prop when the search is empty.

**Non-Goals:**
- Do not migrate the entire search logic from the parent component into the modal; the initial ambiguity detection stays in `useJobDictionary`.
- Do not add complex pagination to the modal's search results; returning the top 10 matches is sufficient.

## Decisions

- **In-Component Search vs Parent Delegation**: We will handle the live Algolia search directly inside `ModalAmbiguity.vue` rather than emitting search events to the parent. This keeps the modal self-contained and avoids polluting the parent search components with secondary modal-specific search state.
- **Debouncing**: We will use VueUse's `useDebounceFn` (already auto-imported in Nuxt) with a 300ms delay. This prevents Algolia rate-limiting and improves UX while typing.
- **Input Component**: We will use the existing `AmIInputGeneric` component to maintain UI consistency and benefit from its built-in loading spinner prop (`:loading`).

## Risks / Trade-offs

- [Risk] **Algolia Client Initialization**: If `$algolia` is unavailable or throws an error, the modal could crash. 
  → Mitigation: The search execution will be wrapped in a `try/catch` block, ensuring errors are logged gracefully and the user can at least fall back to the initial `options`.
- [Risk] **Country State Context**: The modal currently accepts a `country` prop. We must ensure this prop correctly matches the Algolia index naming convention (`usa_job_groups` vs `uk_job_groups`).
  → Mitigation: We will derive the `indexName` cleanly via `props.country === 'USA' ? 'usa_job_groups' : 'uk_job_groups'`.
