## Why

During testing, several frontend bugs and UI quirks have been identified, particularly on mobile viewports. This change serves as an umbrella for squashing these visual bugs to ensure the user experience remains polished and professional across all devices.

## What Changes

**1. Homepage Search Form Helper Buttons (Mobile Layout)**

- On mobile devices, the site switcher link ("Looking for US salaries? Switch to our US site") and the "Salary Converter" button inside `BaseSearchForm.vue` clash or wrap awkwardly due to long text strings competing for horizontal space in a flex layout.
- We will shorten the site switcher translation string (e.g., "Switch to our US site") and adjust the flex container layout (e.g., allowing wrapping or switching to a column layout on very small screens) to ensure these elements display cleanly on mobile without overlapping.

**2. Salary Results Page (Whitespace & Color Clash)**

- On the results page (`salary/[title]/[country]/[[location]].vue`), the wide layout combined with sparse text makes the data cards (MCA, Adzuna, Government) feel empty and stretched. Furthermore, the combination of multiple semantic colors from different data sources can create a confusing "rainbow" effect.
- **Solution:** We will keep the wide layout but completely rethink the internal card design. We will make the text and data points more compact (e.g., using side-by-side stat blocks) and introduce rich `lucide-vue-next` iconography (e.g., representing "Live Market Demand" vs. "Official Benchmarks") to fill the horizontal space cleanly. We will also neutralize the backgrounds of the secondary data cards (relying on small indicator pills instead) so the MCA Score remains the primary, colorful focal point.

**3. MCA Score Explainer Icons**

- The newly updated MCA Score Explainer page (`app/pages/mca-score.vue`) can be further elevated visually by inserting the custom-designed SVG icons (now stored in `public/mca-brackets/`) into each corresponding bracket card.
- **Solution:** We will add an `<img>` tag to each bracket card that maps the `bracket` key to its respective SVG filename, floating it to the side or placing it above the text to make the bento grid pop.

_(Placeholder for additional bug fixes as identified)_

## Capabilities

### New Capabilities

- `mobile-ui-fixes`: Defines the layout requirements and text truncations necessary to fix overlapping or awkwardly wrapping elements on mobile viewports.

### Modified Capabilities

## Impact

- `i18n/locales/en-GB/search.json`
- `i18n/locales/en-US/search.json`
- `app/components/BaseSearchForm.vue`
- _(Additional files pending further bugs)_
