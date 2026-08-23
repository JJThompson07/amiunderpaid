## Why

The MCA Score Explainer page currently displays bracket advice in dense, semicolon-separated sentences that can feel overly robotic or AI-generated. Additionally, while the text defines the 0-100 score ranges, it lacks a visual anchor. Providing a visual representation of the brackets (such as a spectrum bar) and breaking the advice down into digestible bullet points will significantly improve readability and user comprehension.

## What Changes

- Align the page's overall layout and flow with the newly redesigned About Us and How It Works pages (e.g., transitioning from a single constrained container to full-width sections with alternating backgrounds).
- Introduce a visual spectrum bar (or segmented progress bar) to the MCA Score Explainer page that visually maps out the 0-100 range and its 5 brackets (`review`, `below`, `competitive`, `strong`, `leader`).
- Refactor the `i18n/locales/en-GB/mca.json` (and `en-US.json`) files to split the `advice` fields in the `brackets` object from single strings with semicolons into structured bullet points (e.g., separating "For Candidates" and "For Employers").
- Update the `app/pages/mca-score.vue` template to render these new bullet points cleanly and apply the new full-width, sectioned layout, ensuring the semantic score colors are preserved.

## Capabilities

### New Capabilities

- `mca-visual-presentation`: Defines the requirements for visually representing the MCA score brackets and formatting the dual-audience (Candidate vs Employer) advice as bulleted lists.

### Modified Capabilities

## Impact

- `app/pages/mca-score.vue`
- `i18n/locales/en-GB/mca.json`
- `i18n/locales/en-US/mca.json`
- No backend API or database schema changes required.
