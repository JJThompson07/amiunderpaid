## 1. Core Logic Consolidation
- [ ] 1.1 In `shared/utils/math.ts`, extract `calculateBenchmarkScore(userSalary, inputs, { weights, macroStrategy, confidenceIsRegional })`.
- [ ] 1.2 Update `shared/utils/uk.ts` and `usa.ts` to consume this new `calculateBenchmarkScore` function rather than duplicating the math identically across 40 lines. Write tests ensuring both files yield the exact same results as before.
- [ ] 1.3 Refactor `app/composables/useLocationEngine.ts` to cleanly orchestrate the tenant scorers without tight coupling or massive `v8 ignore` blocks.

## 2. Vue Component & Type Cleanup
- [ ] 2.1 Consolidate `app/components/Section/AmI/SalarySearch.vue` and `app/components/Section/Benchmark/RoleSearch.vue` into a shared `<BaseSearchForm>` component, using props to toggle layout variations.
- [ ] 2.2 Systematically remove the `: any` types in `app/components/Territory/Map.vue` by declaring rigid interfaces for the ECharts events and map shapes.
- [ ] 2.3 Systematically remove the `: any` types in `app/components/Territory/ScheduleMatrix.vue` by explicitly typing the matrix loops and payloads.
