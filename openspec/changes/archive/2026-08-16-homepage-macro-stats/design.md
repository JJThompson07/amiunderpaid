## Context
See `proposal.md` for motivation. We are adding a national statistics summary (mean, bottom 10%, top 10%) below the trending roles marquee to set a baseline expectation for the user.

## Goals / Non-Goals

**Goals:**
- Add `macro_stats` block to `en-GB` and `en-US` `landing.json` locale files containing the hardcoded national averages.
- Render these stats directly underneath the marquee in `app/components/Section/AmI/TrendingSearches.vue` or a new component.
- Ensure the numbers are formatted using the same currency formatter as the marquee.

**Non-Goals:**
- Do not make a runtime Algolia query for this data to ensure the homepage remains lightning fast.
- Do not overcomplicate the design; use a subtle text string or small chips.

## Decisions

**1. Data Source**
- **Decision**: Hardcode the stats into the i18n JSON files.
- **Rationale**: Provides zero-latency rendering for SSR and SEO.

**2. Visual Implementation**
- **Decision**: Add a small, centered, muted text block beneath the `div.relative.flex` wrapper in `TrendingSearches.vue`.
- **Rationale**: Keeps the code centralized and visually links the macro data to the trending data.

## Risks / Trade-offs
- **Trade-off**: Hardcoded data requires manual updates when the economy shifts significantly. Mitigation: It acts as an illustrative baseline; the real search will pull live data from Algolia anyway.
