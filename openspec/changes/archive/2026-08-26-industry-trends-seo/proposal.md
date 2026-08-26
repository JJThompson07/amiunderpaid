## Why

The Industry Trends feature is a massive value-add, but to turn it into an organic traffic goldmine, it needs to be heavily optimized for search engines. A single macro page will struggle to rank for specific long-tail queries like _"how well do IT roles pay?"_ or _"is the market improving in Admin?"_. By implementing a Programmatic SEO (pSEO) architecture and adding strategic internal linking from the homepage, we can capture high-intent search traffic across every single industry we track.

## What Changes

**1. Homepage CTA (`app/pages/index.vue`)**

- We will add a dedicated section to the homepage with a compelling preamble (e.g., _"Wondering how your industry stacks up against the rest of the market?"_) and a clear CTA button pointing to the Industry Trends hub. This funnels users to the tool and provides strong internal linking for Google's crawlers.

**2. Programmatic SEO Dynamic Routes (`app/pages/insights/industry-trends/[industry].vue`)**

- We will create a dynamic Nuxt route for every single industry.
- Instead of just one master graph, users navigating to `/insights/industry-trends/it-jobs` will see a page specifically tailored to IT.
- The page will dynamically inject exact-match keywords into the `<title>`, `<meta description>`, and `<h1>` tags (e.g., _"Is the market improving in the IT industry?"_ or _"How well do IT roles pay compared to the market?"_).
- The ECharts graph on these pages will default to highlighting the specific industry.

**3. Master Hub Indexing (`app/pages/insights/industry-trends/index.vue`)**

- The main trends page will act as a "Hub" that lists and links out to every specific `[industry]` page. This internal linking structure is critical for SEO, allowing link equity to flow to the individual industry pages.

**4. Dynamic Sitemap Generation (`server/routes/sitemap.xml.ts`)**

- The sitemap generator will be updated to fetch all active categories from the database and automatically append a URL for every specific industry trend page (e.g., `/insights/industry-trends/it-jobs`), ensuring Google indexes all of them instantly.

## Capabilities

### New Capabilities

- `programmatic-seo-engine`: Dynamic routing and metadata injection for infinite, highly-targeted landing pages based on category tags.

### Modified Capabilities

- `homepage-layout`: Added CTA section.
- `sitemap-generation`: Added dynamic category fetching.

## Impact

- `app/pages/index.vue`
- `app/pages/insights/industry-trends/index.vue`
- `app/pages/insights/industry-trends/[industry].vue` (New)
- `server/routes/sitemap.xml.ts`
