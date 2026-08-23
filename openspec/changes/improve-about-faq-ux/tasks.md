## 1. Content & State Preparation

- [ ] 1.1 Review and update the i18n content files (`locales/en-GB.json`, `locales/en-US.json`) with the new "About" and "How it works" copy. Verify by running `pnpm lint:i18n`.
- [ ] 1.2 Update the i18n content files to include the expanded FAQ list (including new career and role-specific queries). Verify by running `pnpm lint:i18n`.

## 2. Component Refactoring

- [ ] 2.1 Refactor the `AmIAccordion` (or equivalent FAQ accordion component) to use CSS Grid `grid-template-rows` transition for smooth height animation. Verify by testing the component locally in the browser (`pnpm dev`) and ensuring there are no layout jumps when toggled.
- [ ] 2.2 Add a client-side search input to the FAQ section in `pages/index.vue` (or the relevant child component). Implement a Vue `computed` property that filters the active FAQ list based on keyword matches in the question and answer text. Verify by entering a search term and observing the filtered list.

## 3. UI Integration, Layout & SEO

- [ ] 3.1 Overhaul the `HowItWorks` component (or equivalent section in `pages/index.vue`). Replace the current vertical timeline layout with a modern bento box grid or rich feature cards layout using Tailwind v4. Ensure there is dedicated spatial design (placeholders) for future illustrations. Verify visually on desktop and mobile viewports (`pnpm dev`).
- [ ] 3.2 Integrate the updated "About" section onto the homepage, ensuring semantic HTML structure. Verify visually.
- [ ] 3.3 Ensure the new FAQ search input and updated accordion are seamlessly integrated into the homepage's informational block. Verify visually.
- [ ] 3.4 Implement a Vue computed property that formats the active i18n FAQ list into a Schema.org `FAQPage` JSON-LD object, and inject it into the `<head>` using Nuxt's `useHead()`. Verify by inspecting the DOM in dev tools and ensuring the script tag with type `application/ld+json` is present.

## 4. Dedicated MCA Explainer Page

- [ ] 4.1 Create a new Nuxt page at `pages/mca-score.vue` (or `pages/how-it-works/mca.vue`). Scaffold a layout with Tailwind v4 that explains the MCA Score and breaks down the different brackets (Below Market, Competitive, Market Leader). Verify by navigating to `/mca-score` in the browser.
- [ ] 4.2 Add actionable career advice for each bracket to the page content (via i18n or directly in the template). Ensure the proprietary algorithm is not exposed. Verify visually.
- [ ] 4.3 Update the homepage FAQ answer for "What are the MCA bracket breakdowns?" to include a `NuxtLink` pointing to this new `/mca-score` page. Verify the link navigation works correctly.

## 5. Testing & Verification

- [ ] 5.1 Update or write unit tests for the FAQ filtering logic (if extracted to a composable or complex component) to ensure it correctly matches keywords case-insensitively. Verify by running `pnpm test`.
- [ ] 5.2 Run local verification suite: `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e` to ensure no build, type, or e2e regressions were introduced by the new page and UI changes.
