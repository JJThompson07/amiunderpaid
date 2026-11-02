## Context

`app/components/Section/Negotiation.vue` contains the lone `v-html` directive in the entire `app/` codebase (`<!-- eslint-disable-next-line vue/no-v-html --><span v-html="card.bodyHtml" />`). The component currently pre-assembles HTML strings in its `cards` computed property using `$t(offer.bodyHtmlKey, { name: <strong class="${theme.nameClass}">${$t(offer.nameKey)}</strong> })` for affiliate cards, and `$t('sections.negotiation.custom.body-html')` for the custom email script card.

The application already has a proven pattern for template-driven translation interpolation: the former standalone CV-Library card (removed in `#164`, visible in git history at `f7ef052:app/pages/salary/[title]/[country]/[[location]].vue:215`) used Vue I18n's `<i18n-t>` component with a named `<template #name>` slot. `@nuxtjs/i18n` registers `<i18n-t>` as a global component throughout the application.

See [proposal.md](file:///Users/joshthompson/projects/amiunderpaid/openspec/changes/negotiation-grid-i18n-t-body/proposal.md) for background and motivation.

## Goals / Non-Goals

**Goals:**

- Replace raw `v-html` and the `vue/no-v-html` ESLint disable comment in `app/components/Section/Negotiation.vue` with a single, branch-free `<i18n-t>` component.
- Update the `cards` computed property in `Negotiation.vue` to supply structured fields (`bodyKey`, `name`, `nameClass`) instead of pre-rendered HTML strings.
- Rename misleading identifiers: `bodyHtmlKey` -> `bodyKey` in `shared/utils/affiliates.ts` and `body-html` -> `body` in `i18n/locales/{en-GB,en-US}/sections.json`.
- Add unit test assertions in `shared/utils/tests/affiliates.spec.ts` and an e2e regression guard in `e2e/affiliate-toast.spec.ts` verifying styled partner names and zero `v-html` DOM rendering.

**Non-Goals:**

- Changing any copy wording or translations.
- Modifying affiliate URLs, query parameters, tracking, or `rel="sponsored"` link attributes.
- Altering the visual design, layout, or responsive card presentation of the negotiation section.
- Enabling `vue/no-v-html` as an ESLint error across the entire repository (out of scope for this change).

## Decisions

### 1. Single Branch-Free `<i18n-t>` Template

The card body in `app/components/Section/Negotiation.vue` will render using a single `<i18n-t>` block:

```vue
<i18n-t :keypath="card.bodyKey" tag="span" class="leading-relaxed">
  <template #name>
    <strong :class="card.nameClass">{{ card.name }}</strong>
  </template>
</i18n-t>
```

**Rationale:** Vue I18n's `<i18n-t>` component inspects translation strings for `{name}` tokens. When present, it replaces `{name}` with the slot contents. When `{name}` is absent (such as in the custom script card, or en-US strings for PurpleCV and CV-Library), Vue I18n safely ignores the unused slot without throwing errors or injecting empty markup. This eliminates template branching (`v-if="card.name"`) while keeping the markup uniform across all cards.

**Alternatives considered:**

- _Conditional branching (`v-if="card.name"`)_: Rendering `<i18n-t>` for partner cards and plain `<span>{{ $t(card.bodyKey) }}</span>` for the custom script card. Rejected as unnecessary complexity, because `<i18n-t>` handles strings without tokens natively.

### 2. Card Data Model Refactoring

In `app/components/Section/Negotiation.vue`, the `cards` computed property will no longer generate a `bodyHtml` string. Instead, each card object will provide:

- `bodyKey: string` (e.g. `offer.bodyKey` for affiliate offers, or `'sections.negotiation.custom.body'` for the script card)
- `name?: string` (resolved partner name `$t(offer.nameKey)` for affiliate offers; omitted or undefined for the script card)
- `nameClass?: string` (`theme.nameClass` from `CARD_THEMES[offer.slug]` for affiliate offers; omitted or undefined for the script card)

**Rationale:** Decouples translation logic from HTML generation. Card objects pass pure data and styling classes down to the template, letting Vue's template compiler manage element rendering safely.

### 3. Identifier and Key Renaming (`body-html` -> `body`, `bodyHtmlKey` -> `bodyKey`)

Rename all occurrences of `body-html` in localization files and `bodyHtmlKey` in TypeScript definitions:

- In `shared/utils/affiliates.ts`:
  - `AffiliateOfferConfig.bodyKey: string`
  - `offerCopyKeys(slug)` returns `{ ..., bodyKey: \`sections.negotiation.\${slug}.body\` }`
- In `i18n/locales/en-GB/sections.json` & `i18n/locales/en-US/sections.json`:
  - Rename `sections.negotiation.{salary-negotiator,purple-cv,cv-library,custom}.body-html` to `.body`.
- In `shared/utils/tests/affiliates.spec.ts`:
  - Update assertion `expect(te(offer.bodyKey)).toBe(true)` and verify key exists.

**Rationale:** The `bodyHtml` naming was a historical artifact of raw HTML injection. Since the translation strings are strictly plain text with `{name}` placeholders, keeping `html` in the name is misleading and inaccurate.

### 4. E2E Regression Guard Following Standards

In `e2e/affiliate-toast.spec.ts`, add a test validating the negotiation grid rendering:

- Adheres to `CODE_STANDARDS.md` §10: uses client-side navigation (`searchFromLandingPage` with mocked endpoints), declines the cookie banner, and blocks external GA/GTM calls.
- Confirms each visible affiliate card renders its partner name inside a `<strong>` tag styled with the corresponding theme class (`text-amber-300`, `text-purple-300`, `text-teal-300`).
- Confirms the script card renders plain text without `{name}` interpolation leftovers.
- Confirms zero `v-html` output or unparsed mustache tokens in the section.

## Risks / Trade-offs

- **[Risk] Unused `#name` slot in `<i18n-t>` might output empty markup or trigger runtime warnings.**
  - **Mitigation:** Verified behavior against Vue I18n specification. When keypath points to a string without `{name}`, Vue I18n does not mount the slot contents into the DOM. Verified in pre-flight checks and covered by component rendering tests.
- **[Risk] Missed reference during `body-html` -> `body` rename.**
  - **Mitigation:** Exhaustive grep across the entire codebase for `bodyHtml`, `body-html`, and `bodyHtmlKey` before and after changes.
