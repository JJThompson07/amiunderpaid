## 1. UI Implementation

- [x] 1.1 Update `app/components/Modal/Ambiguity.vue` to include an `AmIInputGeneric` field for searching at the top of the modal, using VueUse's `useDebounceFn` to handle user input.
- [x] 1.2 Import and configure the Algolia search client directly inside `ModalAmbiguity.vue` using `useNuxtApp().$algolia`.
- [x] 1.3 Add a computed property to gracefully fallback to displaying `props.options` if the local search input is empty or too short.

## 2. Refinement & Styling

- [x] 2.1 Fix ESLint issues in `ModalAmbiguity.vue` (ensure `defineEmits` correctly declares the `resolve` and `close` emit types, and imports are sorted).
- [x] 2.2 Ensure the modal layout accommodates the new search bar without breaking on smaller screens.

## 3. Verification

- [x] 3.1 Run E2E tests `pnpm test:e2e` to ensure the modal changes do not disrupt the existing Playwright flows (e.g., `search.spec.ts`).
- [x] 3.2 Run local verification using `pnpm vitest run` to verify no unit test regressions were introduced.
