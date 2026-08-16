## Why

The static "Trending Searches" grid on the homepage provides good SEO value, but it lacks direct user incentive. By converting this grid into a continuous horizontal rolling marquee that includes the mean national salary for each role (e.g., "Software Engineer - £55,000"), we can immediately entice users with real market data, driving higher engagement and conversion into the salary search flow.

## What Changes

- Modify `SectionAmITrendingSearches` to render as a continuously moving horizontal ticker (marquee).
- Update the underlying i18n data structures for `trending_searches` to include hardcoded mean salaries alongside the job titles.
- Ensure the animation is smooth, infinite, and pauses on hover so users can easily click the links.
- Render region-appropriate currency symbols (e.g., £ for UK, $ for US).

## Capabilities

### New Capabilities

### Modified Capabilities
- `homepage-seo`: The "Trending Searches grid on the homepage" requirement is being modified from a static grid to a continuous scrolling marquee that displays salary figures.

## Impact

- `i18n/locales/en-GB/landing.json`
- `i18n/locales/en-US/landing.json`
- `app/components/Section/AmI/TrendingSearches.vue`
- Tailwind config (potentially for marquee animation keyframes).
