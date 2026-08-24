## Context

See proposal.md. We have two primary issues:

1. Mobile layout breakage in `BaseSearchForm.vue` due to long text.
2. A "rainbow" color clash and excessive whitespace inside the data cards on `app/pages/salary/[title]/[country]/[[location]].vue`.

## Goals / Non-Goals

**Goals:**

- Shorten translation strings for the site switcher in `search.json`.
- Apply `flex-wrap` or mobile stacking to the search form helper buttons.
- Redesign `LazySectionAdzunaComparison` and `LazySectionGovernmentComparison` (or their parent wrappers) to use neutral backgrounds (e.g., `bg-white`) with soft shadows, replacing full semantic backgrounds with localized badges (e.g., a small `bg-negative-100 text-negative-700` pill).
- Inject `lucide-vue-next` icons into the data cards to anchor the layout visually.

**Non-Goals:**

- No changes to the actual MCA score calculation or data fetching logic.
- No custom SVG illustrations; we will rely purely on CSS layout and Lucide icons.

## Decisions

**1. Mobile Wrapping in BaseSearchForm**

- _Rationale_: Instead of forcing the `<a>` (site switcher) and `<button>` (converter) onto one line, we will allow the container to wrap (`flex-wrap`) and reduce the text to "Switch to our US site". This is the simplest, most resilient CSS fix.

**2. Neutralizing Secondary Cards**

- _Rationale_: The `SectionAdzunaComparison` and `SectionGovernmentComparison` components currently adopt full background colors based on whether the user is underpaid or overpaid. This fights with the MCA score card for attention. We will strip the dynamic `bg-*` classes from their root containers, set them to `bg-white border border-slate-200`, and move the dynamic coloring to a small "Verdict" pill inside the card.

**3. Compact Data Layout with Icons**

- _Rationale_: To fix the whitespace, we will use flexbox to divide the secondary cards into two zones: a left zone with a large Lucide icon (e.g., `LineChart` or `Building2`) and the title, and a right zone containing the actual data points and the verdict pill stacked neatly. This fills horizontal space naturally.

**4. Composite SVG + Lucide Icons in MCA Bracket Cards**

- _Rationale_: To give the bracket cards a deeply premium feel, we will use the custom SVGs (`public/mca-brackets/*.svg`) as abstract, colorful background ripples, and overlay specific `lucide-vue-next` icons perfectly in the center. The user-selected mappings are:
  - `leader`: `market-leader.svg` + `Crown`
  - `strong`: `strong-alignment.svg` + `TrendingUp`
  - `competitive`: `competitive.svg` + `Shuffle`
  - `below`: `below-market.svg` + `TrendingDown`
  - `review`: `action-required.svg` + `Siren`
