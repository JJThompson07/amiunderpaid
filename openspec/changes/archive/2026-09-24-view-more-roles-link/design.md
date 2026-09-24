# Design

## Context

Both results pages already have `route` (`useRoute()`) and `displayTitle` in scope in their `<script setup>`, and both already guard the "Job Listings" section with `v-if="jobListings.length"` around a single `<AmICarousel>` (see `app/pages/salary/[title]/[country]/[[location]].vue` lines 132-191 and the equivalent block in `app/pages/benchmark/[title]/[country]/[[location]].vue`). The `/jobs` results page already links back to `/salary` with a plain styled `NuxtLink` (not `AmIButton`) using `route.params.title` / `route.params.country` / `route.params.location`. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- Reuse the exact reverse-link pattern (`NuxtLink` + route params + i18n key with `{ displayTitle }` interpolation) already established by `/jobs`'s "view-salary-benchmark" link, so both directions look and behave consistently.
- Keep the change presentational only — no new composable, no new data fetching, no change to `useLocationEngine` or the server's result limit.

**Non-Goals:**

- Not changing the 10-result server-side cap itself (that's what the `/jobs` page is for).
- Not touching the `job-search-ambiguity-modal` or `live-job-search` capabilities.

## Decisions

- **Component**: plain `NuxtLink` styled inline (matching the existing pill-button classes used by the `/jobs` → `/salary` link), not `AmIButton`. Alternative considered: introduce/reuse `AmIButton` with a `to` prop — rejected because the existing reverse link already establishes a `NuxtLink`-pill precedent in this exact "linking between salary and jobs" context, and matching it keeps both directions visually/structurally symmetric without touching `AmIButton`'s API.
- **Placement**: a new `<div class="flex justify-end">` immediately after `</AmICarousel>`, still inside the existing `v-if="jobListings.length"` wrapper — so it shares the same show/hide condition as the carousel with no extra guard logic.
- **Route target**: `/jobs/${route.params.title}/${route.params.country}` with `/${route.params.location}` appended only when `route.params.location` is present — mirrors the reverse link's own ternary exactly, so both pages' route params (which are the same slugs) round-trip correctly.
- **i18n**: add `sections.jobs.view-more-roles` (interpolated with `{ displayTitle }`, matching `view-salary-benchmark`'s shape) to both `en-GB/sections.json` and `en-US/sections.json`, right next to the existing `view-salary-benchmark` key.

## Risks / Trade-offs

- [Duplicated markup across two nearly-identical page files] → Accepted: this mirrors the existing pattern where `salary` and `benchmark` pages are already independent near-duplicates (per the exploration that found only trivial diffs between them); introducing a shared component for one small link is out of scope for this change.
