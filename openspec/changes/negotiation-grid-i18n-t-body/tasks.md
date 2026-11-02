## 1. Pre-flight Verification

- [ ] 1.1 Verify `@nuxtjs/i18n` registers `<i18n-t>` globally and confirm slot behavior: inspect existing usages across `app/components/` and verify that rendering strings without `{name}` interpolation tokens gracefully ignores the `#name` slot without DOM corruption or runtime errors. Verify: `pnpm typecheck` exit 0.
- [ ] 1.2 Inspect existing test suite to confirm no existing tests assert on legacy `v-html` markup in `app/components/Section/Negotiation.vue`. Verify: run `git grep -i "v-html" -- "*spec*" "*test*"` and confirm zero test dependencies on the obsolete HTML structure.

## 2. Localization and Utility Refactoring

- [ ] 2.1 In `i18n/locales/en-GB/sections.json` and `i18n/locales/en-US/sections.json`, rename all 8 occurrences of `body-html` to `body` under `sections.negotiation.{salary-negotiator,purple-cv,cv-library,custom}` while preserving translation text and `{name}` tokens exactly. Verify: `git diff i18n/locales/` confirms only key name changes.
- [ ] 2.2 In `shared/utils/affiliates.ts`, rename `bodyHtmlKey` to `bodyKey` in `AffiliateOfferConfig` and update `offerCopyKeys()` to reference `sections.negotiation.${slug}.body`. In `shared/utils/tests/affiliates.spec.ts`, update the grid card copy test to assert `offer.bodyKey` resolves to a valid string in all supported locales. Verify: `pnpm vitest run shared/utils/tests/affiliates.spec.ts` passes.

## 3. Component Modernization

- [ ] 3.1 In `app/components/Section/Negotiation.vue`, update the `cards` computed property: replace `bodyHtml` on affiliate cards with `bodyKey: offer.bodyKey`, `name: $t(offer.nameKey)`, and `nameClass: theme.nameClass`. On `scriptCard`, replace `bodyHtml` with `bodyKey: 'sections.negotiation.custom.body'`, `name: undefined`, and `nameClass: undefined`. Verify: `pnpm typecheck` exit 0.
- [ ] 3.2 In `app/components/Section/Negotiation.vue`, replace `<!-- eslint-disable-next-line vue/no-v-html --><span v-html="card.bodyHtml" />` in `#body` with `<i18n-t :keypath="card.bodyKey" tag="span" class="leading-relaxed"><template #name><strong :class="card.nameClass">{{ card.name }}</strong></template></i18n-t>`. Verify: `git grep "v-html" app/` returns 0 results and `pnpm lint` reports no `vue/no-v-html` bypasses.

## 4. Integration & E2E Regression Guard

- [ ] 4.1 In `e2e/affiliate-toast.spec.ts`, add a test asserting that on the salary results page, negotiation grid cards render their partner names in styled `<strong>` tags (`text-amber-300`, `text-purple-300`, `text-teal-300`), the script card renders cleanly without leftover tokens, and no `v-html` output or raw markup is present. Follow `CODE_STANDARDS.md` §10 (client-side navigation with mocked endpoints, cookie banner declined, GA requests aborted). Verify: `pnpm test:e2e e2e/affiliate-toast.spec.ts` passes.
- [ ] 4.2 Verify zero lingering references to `bodyHtmlKey`, `body-html`, or `bodyHtml` across the entire codebase. Verify: `git grep -E "bodyHtml|body-html"` returns 0 results outside git history and OpenSpec archive files.

## 5. Verification Gate

- [ ] 5.1 Format all modified files and run the full verification test suite (`pnpm prettier --write . && pnpm test:verify`). Verify: prettier, lint (spellcheck, typecheck, check-standards, ESLint), test:coverage, test:e2e, and test:rules all pass with zero errors and per-file coverage thresholds satisfied.
