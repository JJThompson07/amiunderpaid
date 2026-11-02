## Why

`app/components/Section/Negotiation.vue` contains the only `v-html` directive in the entire `app/` codebase (`<!-- eslint-disable-next-line vue/no-v-html --><span v-html="card.bodyHtml" />`). Raw HTML string interpolation was originally used to inject styled `<strong>` partner names into card descriptions, bypassing Vue's template compiler and requiring an explicit ESLint bypass.

Because the underlying translation strings are plain text with a standard `{name}` interpolation placeholder, this can be replaced entirely with Vue I18n's `<i18n-t>` component and a scoped `#name` template slot. Doing so eliminates the last `v-html` vulnerability surface in the application, standardizes the card body on the same template-driven pattern previously proven in the standalone card, and allows renaming confusing `body-html` / `bodyHtmlKey` identifiers across the codebase.

## What Changes

- **Template Modernization (`app/components/Section/Negotiation.vue`)**:
  - Replace `<span v-html="card.bodyHtml" />` and its `eslint-disable-next-line vue/no-v-html` comment with `<i18n-t :keypath="card.bodyKey" tag="span" class="leading-relaxed"><template #name><strong :class="card.nameClass">{{ card.name }}</strong></template></i18n-t>`.
  - Use a single, branch-free `<i18n-t>` block covering all four cards (Salary Negotiator, PurpleCV, CV-Library, and the custom email script card). Cards and locale strings without a `{name}` placeholder (e.g. the email script card and US variants of PurpleCV and CV-Library) safely ignore the unused `#name` slot without error or extraneous DOM output.
- **Card Data Model Simplification (`app/components/Section/Negotiation.vue`)**:
  - Replace pre-rendered HTML strings in the `cards` computed property with structured fields: `bodyKey` (string), `name` (string | undefined), and `nameClass` (string | undefined).
- **Identifier & Locale Key Renaming**:
  - Rename `bodyHtmlKey` to `bodyKey` in `AffiliateOfferConfig` and `offerCopyKeys()` in `shared/utils/affiliates.ts`.
  - Rename JSON translation keys from `body-html` to `body` in both `i18n/locales/en-GB/sections.json` and `i18n/locales/en-US/sections.json` across all four negotiation cards (`salary-negotiator`, `purple-cv`, `cv-library`, and `custom`).
  - Update `shared/utils/tests/affiliates.spec.ts` to assert `offer.bodyKey`.
  - Grep and confirm zero lingering references to `bodyHtml` or `body-html`.
- **Pre-flight & E2E Verification**:
  - Confirm `@nuxtjs/i18n` registers `<i18n-t>` as a global component and verify no existing tests assert on grid body markup.
  - Add an e2e assertion in `e2e/affiliate-toast.spec.ts` asserting each affiliate card body renders its bold partner name with correct styling and that the results page contains zero `v-html` output.
  - Follow `CODE_STANDARDS.md` §10: mocked endpoints only, decline cookie banner, block external analytics.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `affiliate-offers`: Adds a requirement mandating that all card bodies in the negotiation grid render via Vue I18n's `<i18n-t>` template component and named slots rather than raw `v-html` bindings, and that strings without placeholders render cleanly.

## Impact

- `app/components/Section/Negotiation.vue`: Eliminates the application's sole `v-html` directive and its ESLint disable comment.
- `shared/utils/affiliates.ts`: Renames `bodyHtmlKey` to `bodyKey` in `AffiliateOfferConfig` and `offerCopyKeys`.
- `shared/utils/tests/affiliates.spec.ts`: Asserts `offer.bodyKey` resolves in all locales.
- `i18n/locales/en-GB/sections.json` & `i18n/locales/en-US/sections.json`: Renames `body-html` to `body` under `sections.negotiation.*`.
- `e2e/affiliate-toast.spec.ts`: Adds regression guard for partner names in card bodies and zero `v-html` output.
- Zero changes to copy wording, affiliate URLs, `rel="sponsored"` link attributes, or click/impression analytics tracking.
