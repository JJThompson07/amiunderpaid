# Phase 5: Architecture and Maintainability

## Why
This phase tackles long-tail architectural debt. While not causing immediate bugs or performance issues, the current structure of certain utility functions and UI components is duplicated or fragile. By consolidating these patterns, we reduce the cost and risk of every future change.

## What
- Extract the shared mathematical benchmarking logic from `uk.ts` and `usa.ts` into a single, testable utility function in `math.ts`.
- Rewrite the `useLocationEngine.ts` orchestration layer to untangle the tightly coupled multi-tenant scoring paths.
- Consolidate the two identical search UI implementations (`SalarySearch.vue` and `RoleSearch.vue`) into a single parameterized `<BaseSearchForm>` component.
- Fix TS `any` type loopholes in `Map.vue` and `ScheduleMatrix.vue`.

## Scope
Touches core `shared/utils/` calculations, Vue composables, and Vue components. 

## Non-Goals
- Changing the underlying mathematical logic or algorithms; this is purely a structural consolidation.
