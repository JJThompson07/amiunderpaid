## Why

Providing users with a national baseline salary for "All Roles" establishes immediate context and trust. By displaying the mean and percentile data (Bottom 10% and Top 10%) directly on the homepage, users can instantly benchmark their own expectations before even initiating a search. This drives deeper engagement.

## What Changes

- Add hardcoded macro statistics (mean, p10, p90) for "All Roles" into the `landing.json` files for both `en-GB` and `en-US`.
- Create a new UI component (or extend `SectionAmITrendingSearches`) to display these statistics in a clean, subtle bar below the trending salaries marquee.
- Format the statistics dynamically based on the current region's currency.

## Capabilities

### Modified Capabilities

- `homepage-seo`: The trending searches section will now include a national baseline statistics bar below the marquee.

## Impact

- `i18n/locales/en-GB/landing.json`
- `i18n/locales/en-US/landing.json`
- `app/components/Section/AmI/TrendingSearches.vue`
