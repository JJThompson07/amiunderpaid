## Context

See proposal.md for motivation. The `app/pages/mca-score.vue` page has dense advice blocks separating candidate and employer advice with a semicolon. We are restructuring these into arrays in the i18n JSON files to render them as bullet points. We are also adding a segmented CSS progress bar to visually ground the 0-100 scale.

## Goals / Non-Goals

**Goals:**

- Update `mca.json` in both `en-GB` and `en-US` to replace the `advice` string with an `advice` object containing `candidate` and `employer` string fields.
- Update `app/pages/mca-score.vue` to loop over these fields and render bullet points (`<ul>`, `<li>`).
- Build a lightweight CSS-based segmented spectrum bar placed above the brackets grid.
- **Refactor the page layout** to use full-width sections with alternating backgrounds (e.g., white and `bg-slate-50`), matching the new flow of the About Us and How It Works pages, while strictly preserving the bracket score colors.

**Non-Goals:**

- No complex charting libraries (like ECharts or Chart.js) should be used for this simple spectrum bar. Pure Tailwind CSS is required.

## Decisions

**1. Layout Refactor for Site Consistency**

- _Rationale_: The current page uses a single `max-w-3xl` wrapper, which feels isolated and different from the new sectioned landing pages. We will upgrade the container to `max-w-5xl` and use the luxurious Bento grid card styles (`rounded-3xl`, soft shadows).
- _Semantic Background Tints_: To make the brackets instantly intuitive and visually cohesive, each bracket card will use a very light background tint corresponding to its semantic meaning (e.g., `bg-positive-50` for Leader, `bg-warning-50` for Competitive, `bg-negative-50` for Review) rather than plain white. This replaces the need for harsh borders while keeping the semantic identity strong.

**2. i18n JSON Restructuring**

- _Rationale_: Instead of a single string, the `advice` node in `mca.brackets.<tier>` will become an object:
  `"advice": { "candidate": "...", "employer": "..." }`.
  This explicitly decouples the text and avoids the need for string splitting on semicolons in the frontend logic.

**3. Inline Spectrum Gauge per Card**

- _Rationale_: Instead of one giant spectrum bar above the grid, placing a mini segmented spectrum gauge _inside_ each bracket card provides immediate visual context. The gauge will contain all 5 segments (representing the 0-100 scale), but only the segment corresponding to the current card's bracket will be highlighted (using its semantic color), while the rest remain a muted gray (e.g., `bg-slate-100`).
- _Alternatives_: A single large bar above the grid. Rejected because it forces the user to look back and forth to map the colors to the cards.

## Risks / Trade-offs

- **Risk: Breaking existing translations** → Modifying the JSON structure will break the current `{{ $t(...) }}` calls.
  - _Mitigation_: The tasks mandate updating the JSON files first, then strictly updating the Vue template to handle the new object schema to prevent rendering errors.
