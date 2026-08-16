## Context

See `proposal.md` for the motivation and the problem context regarding the "Orphan Page" issue affecting search engine crawlability on the homepage. 

## Goals / Non-Goals

**Goals:**
- Provide clear internal HTML links from the homepage to highly-searched salary URLs for search engine indexation.
- Ensure the SEO hero heading is semantically sound without deteriorating the visual branding.
- Support both the US and UK domains dynamically via the internal `useRegion()` composable.

**Non-Goals:**
- Dynamically fetching trending roles from a database or search analytics (we will hardcode a curated list of top roles initially for speed and deterministic SEO).
- Overhauling the sitemap configuration, as `sitemap.xml.ts` is already handling XML mapping correctly.

## Decisions

**1. Semantic Heading Optimization Approach:**
- **Decision:** Change the visual `<h1>` in `SectionAmIHero.vue` to a branded `<div>` or retain it as an `<h1>` while visually hiding a more verbose `<h1>` containing primary keywords. Alternatively, the simplest and safest structural approach without breaking layout is to keep `Am I Underpaid?` as an `<h2>` (since it's a visual brand hook) and inject a visually-hidden `<h1>Am I Underpaid? — UK Salary Checker & Market Pay Calculator</h1>` (using Tailwind's `sr-only` class) to ensure search engines and screen readers get the most critical context immediately.
- **Alternatives:** We could simply make the `landing.subheading` an `<h2>` and add more keywords to it. However, the visual text must remain concise, so `sr-only` provides the best balance between design and SEO.

**2. Trending Searches Component:**
- **Decision:** We will create a `SectionAmITrendingSearches.vue` component that renders a flex/grid array of tags using `<NuxtLink>`.
- **Alternatives:** We considered using `<a>` tags, but `<NuxtLink>` handles Vue Router logic locally and pre-fetches the dynamic chunks cleanly, which is the Nuxt best practice.
- **Data Architecture:** The list of trending roles will be provided via the `i18n` locale files (e.g. `landing.trending_roles: ["Software Engineer", "Marketing Manager", ...]`) to allow market-specific trending searches.

## Risks / Trade-offs

- **Risk:** Visually hidden text (`sr-only`) can sometimes be flagged if over-stuffed. 
  - **Mitigation:** Ensure the text is extremely succinct and accurately reflects the visible intent (e.g., `<h1 class="sr-only">Am I Underpaid? — UK Salary Checker & Market Pay Calculator</h1>`). It must be a truthful descriptor, not keyword stuffing.
