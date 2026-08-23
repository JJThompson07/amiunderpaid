## Context

See proposal.md for motivation. The homepage has informational sections ("About" and "How it works") that need content revamping, and the FAQ section needs UX improvements and new capabilities. The FAQ accordion component (`AmIAccordion`) likely lacks smooth transitions, and we need to add a client-side search/filter to the FAQ list.

## Goals / Non-Goals

**Goals:**
- Provide smooth, non-jumpy CSS transitions for the FAQ accordion.
- Implement a fast, client-side filtering mechanism for FAQs.
- Add SEO-rich content to the About, How it works, and FAQ sections.

**Non-Goals:**
- No server-side search or database changes for FAQs. The FAQ list is static/hardcoded and search is performed locally on the client.
- No changes to user authentication or data models.

## Decisions

**1. How it works Layout Overhaul**
- *Rationale*: The current vertical timeline is too generic and flat. Replacing it with a modern bento-style grid or rich feature cards provides more real estate for detailed explanations, micro-animations, and future custom illustrations, elevating the perceived quality of the product.
- *Alternatives*: Keep the timeline but add icons. Rejected because it still constrains horizontal space and doesn't solve the "flat" feel.

**2. Client-side FAQ Filtering**
- *Rationale*: FAQs are statically rendered on the homepage. Client-side filtering via a Vue `computed` property is extremely fast, responsive, and requires no API calls.
- *Alternatives*: Server-side search using Algolia. Rejected because the FAQ dataset is small and static.

**3. Accordion Animation via CSS Grid**
- *Rationale*: A common cause of jumpy accordions is animating `max-height` with arbitrary values. Using CSS Grid with `grid-template-rows: 0fr` to `1fr` provides smooth, precise height transitions without JavaScript calculations.
- *Alternatives*: Vue transition component with JS hooks for height calculation. Rejected because it's more complex and less performant than pure CSS.

**4. Hardcoded SEO FAQs & Content Definition**
- *Rationale*: Adding career and role-specific FAQs directly to the i18n content ensures they are SSR-rendered. The new FAQs will cover:
  1. "How accurate is the Market Compensation Alignment (MCA) score?"
  2. "Should I look for a new role?"
  3. "Do you use live job market data?"
  4. "What do you do with my search data?"
  5. "How can I use this data to negotiate my salary?"
  6. "What are the MCA bracket breakdowns?" (This will link out to the dedicated MCA explainer page).

**5. Schema.org FAQ Structured Data (JSON-LD)**
- *Rationale*: To achieve rich snippets in Google search results, the homepage must inject a JSON-LD block using Nuxt's `useHead()` composable. This is superior to using inline HTML microdata (`itemprop`), as JSON-LD is Google's strongly recommended format and keeps the template HTML clean.
- *Alternatives*: HTML Microdata / RDFa. Rejected as it clutters the template and is harder to maintain.

**6. Dedicated MCA Explainer Page (`/mca-score`)**
- *Rationale*: Explaining the brackets and providing career advice requires too much text for a simple homepage FAQ accordion. Creating a dedicated Nuxt page (`pages/mca-score.vue`) allows for a rich content layout, deep linking, and focused SEO around the proprietary MCA metric, while keeping the calculation logic securely hidden on the server.
- *Alternatives*: A modal on the homepage. Rejected because modals are not indexable by search engines and don't provide a shareable URL.

## Risks / Trade-offs

- **Risk: Increased DOM size** → Adding many FAQs might bloat the homepage HTML. 
  - *Mitigation*: Ensure the added FAQs are highly relevant and monitor page weight. If the FAQ list grows too large, consider a dedicated `/faq` page in a future iteration.
