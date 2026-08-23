## 1. Data Structure Updates

- [x] 1.1 In `i18n/locales/en-GB/mca.json`, locate `brackets.*.advice`. Convert the string into an object: `{"candidate": "...", "employer": "..."}` by splitting the existing semicolon-separated text. Ensure the semicolon is removed. Verify by checking the JSON validity.
- [x] 1.2 Repeat task 1.1 for `i18n/locales/en-US/mca.json`. Verify by running `pnpm lint:i18n`.

## 2. UI Implementation & Layout Refactoring

- [x] 2.1 Refactor the overall page structure in `app/pages/mca-score.vue` to match the site's new flow. Ensure the root `div` does not have `bg-slate-50`, allowing the `SectionSharedBackdrop` to render cleanly. Upgrade the main container to `max-w-5xl`.
- [x] 2.2 Upgrade the bracket cards in the grid. Remove plain `bg-white` and harsh borders. Update the `bracketStyles` object to include a `bg` property for each bracket with a very light semantic tint (e.g., `bg-positive-50` for leader, `bg-warning-50` for competitive, `bg-negative-50/50` for below). Apply this to the card wrapper along with `rounded-3xl` and soft shadows.
- [x] 2.3 In `app/pages/mca-score.vue`, update the bracket iteration block. Replace the single `<p>` rendering the advice with a `<ul>` containing two `<li>` elements. Add bullet styling (e.g., `list-disc pl-5 mt-2 space-y-2 text-sm text-slate-700`). Bind the first `<li>` to `$t('mca.brackets.' + bracket + '.advice.candidate')` and the second to `employer`. Verify visually in the browser.
- [x] 2.4 In `app/pages/mca-score.vue`, insert a new inline segmented spectrum bar _inside_ the `<article v-for="bracket in brackets">` card (e.g., just below the badge and range header). Build it as a flex container (`<div class="flex h-2 w-full rounded-full overflow-hidden mt-3 mb-4 gap-0.5">`). Add 5 child `<div>`s with proportional widths (`w-[24%]`, `w-[15%]`, `w-[20%]`, `w-[20%]`, `w-[21%]`). Use a computed property or method to determine the color of each segment: if the segment matches the current card's `bracket`, give it the active semantic color (e.g., `bg-warning-400`); otherwise, give it a muted color (e.g., `bg-slate-200/50`). Verify visually in the browser.

## 3. Testing & Verification

- [x] 3.1 Run local verification suite: `pnpm typecheck`, `pnpm lint`, and `pnpm test:e2e` to ensure no build, type, or e2e regressions were introduced by the structural changes to the translation keys.
