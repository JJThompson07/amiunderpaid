## Context

See `proposal.md` for motivation. We are upgrading the static `SectionAmITrendingSearches` to an animated marquee displaying salary data.

## Goals / Non-Goals

**Goals:**

- Implement a CSS-driven infinite marquee animation (via Tailwind CSS).
- Update the i18n JSON data structure from an array of strings to an array of objects `[{ title, salary }]`.
- Parse and display currency based on the current region.

**Non-Goals:**

- Dynamically fetching salaries from an API or database (we use hardcoded i18n values for deterministic SSR performance and SEO speed).

## Decisions

**1. Data Structure Update:**

- **Decision:** Change `landing.trending.roles` from an array of strings to an array of objects: `[ { "title": "Software Engineer", "salary": 55000 }, ... ]`.
- **Alternatives:** We could use a separate mapping, but embedding it in the locale file is perfectly scalable and translates cleanly.

**2. Currency Formatting:**

- **Decision:** The UK JSON will hardcode salaries in GBP, and the US JSON in USD. The component will format them using `Intl.NumberFormat` based on the locale, or we can just prepend the currency symbol. Since `currentCountry` dictates the market, we'll format based on region. For simplicity and precision, we will use a computed function that returns the formatted string (e.g. `£55,000` or `$75,000`). Wait, actually `useFormatter()` or standard `Intl.NumberFormat` works perfectly.

**3. Marquee Animation:**

- **Decision:** We will use standard Tailwind CSS arbitrary values or extend the theme in `tailwind.config.js` to create an `animate-marquee` class. The marquee requires duplicating the content (or having two identical containers moving side-by-side) to create an infinite loop effect seamlessly.
- **Alternatives:** Using a third-party library (e.g., Vue3-Marquee). However, since we want strict control over styling, dependency reduction, and SEO visibility, a native CSS implementation using standard flex-box duplication is the safest.

## Risks / Trade-offs

- **Risk:** CSS Marquees can cause CPU strain or accessibility issues if they move too fast or don't pause.
  - **Mitigation:** Ensure `pause-hover` is implemented (i.e. `hover:[animation-play-state:paused]`), and the animation duration is long enough (e.g., `40s`).
