## Why

The homepage's "About" and "How it works" sections are currently under-optimized for user engagement. Furthermore, the FAQ section suffers from poor UX (jumpy accordion) and lacks a search feature to help users quickly find answers. We need to improve the content in these sections, enhance the accordion UX, add FAQ search functionality, and include more common career/role queries to improve SEO and user retention. 

## What Changes

- Redesign and expand the content for the "About" and "How it works" sections on the homepage to improve clarity and engagement. Specifically, overhaul the "How it works" UI to move away from the current flat, generic vertical timeline layout into a richer, more visually engaging design (e.g., bento box grid or rich feature cards) that supports future illustrations.
- Fix the existing jumpy accordion component used in the FAQ section.
- Add a search input above the FAQ section allowing users to filter FAQs.
- Add new FAQ entries covering common career and role queries, including search data usage and MCA bracket breakdowns.
- **Create a dedicated MCA Score Explainer Page** that breaks down the MCA brackets (without revealing the exact calculation algorithm) and provides actionable advice for users based on which category they fall into.

## Capabilities

### New Capabilities
- `homepage-informational`: Defines the requirements for the "About", "How it works", and "FAQ" sections, including content guidelines, the accordion UX standards, and the FAQ search functionality.
- `mca-explainer`: Defines the requirements for the new dedicated MCA Score explanation page, its URL routing, content brackets, and actionable advice.

### Modified Capabilities

## Impact

- `pages/index.vue` (and related homepage components).
- UI accordion components (e.g., `AmIAccordion` or similar).
- No backend API or database schema changes required.
