## Why

The `/salary` and `/benchmark` results pages currently show the user's own salary figure independently in both `SectionAdzunaComparison` and `SectionGovernmentComparison`, so a user reviewing their results sees "Your salary: £65,000" repeated twice before reaching any new information. Meanwhile, real data already computed by `useLocationEngine.ts` and `useJobs.ts` — the MCA score's regional cost-of-living modifier, and the ONS 75th-percentile ceiling — isn't currently surfaced anywhere on the page. A mockup reviewed this session (Stitch-generated, not a literal spec) demonstrated that a consolidated top-of-page KPI summary reads more clearly and better highlights the page's most useful numbers without inventing any new data.

## What Changes

- Add a 4-card KPI summary row at the top of the results content, above the existing MCA score section: "Your Salary" (shown once), "Live Market Average" (Adzuna, with variance), "Government Benchmark" (ONS, with variance), and a highlighted "75th Percentile Ceiling" card (ONS `marketHigh`).
- Remove the now-redundant "Your salary" display from `SectionAdzunaComparison` and `SectionGovernmentComparison` — both cards keep their own distinguishing content (histogram, percentile slider, variance messaging) but no longer repeat the user's own salary figure now that it's established once at the top.
- Reorder the results page content to: KPI summary row → MCA score section → salary distribution graph (`SectionAdzunaComparison`'s histogram) → Government benchmark card → Take Action / recruiter section → job listings carousel. (Current order interleaves the recruiter grid before the market-data cards; this moves Take Action to directly follow the scoring/distribution content, matching the reviewed mockup.)
- Add a 4th breakdown bar to `Section/Score/Mca.vue`'s expandable breakdown, surfacing `mcaScore.breakdown.modifier` (the regional cost-of-living multiplier) alongside the existing live/micro/macro percentile bars — this value is already computed by the scoring engine but not currently rendered anywhere.
- Restyle the job listing cards shown inside the existing `AmICarousel` to match the reviewed mockup's denser layout: a company-initial avatar badge, and the salary range and pay-comparison badge given more visual prominence. This is a single-component change — `AmICardRole` already computes and displays this pay-comparison (`salaryMaxComparison`, pay-rise/pay-cut/no-change chip), and `Section/Reed/JobListing.vue`/`Section/Jooble/JobListing.vue` are thin wrappers around it, so restyling `AmICardRole` covers all three data-provider paths. This is a restyle of existing, correct behavior, not new comparison logic. The carousel wrapper itself is unchanged.
- **BREAKING** (internal only, not a public API): `SectionAdzunaComparison` and `SectionGovernmentComparison` drop their own `user-salary`/`current-salary` display responsibility; callers must render the new KPI row for that figure to still appear on the page.

Explicitly out of scope for this change (reviewed and deferred/rejected this session, not overlooked):

- Per-job "skill tags" and "% match" scores on job listing cards (would require description-parsing/NLP we don't have).
- Fabricated "tech stack score" / "industry premium" / "experience alignment" diagnostic factors from the reviewed mockup — no backing algorithm exists, and "experience alignment" would require collecting years-of-experience from the user, which we don't do today.
- Approximate live-market (Adzuna) percentile interpolation from histogram buckets for a dual-source percentile table — Adzuna only gives mean + histogram bucket counts, not exact percentiles; only ONS percentiles (`marketLow`/`marketAverage`/`marketHigh`) are exact today.

## Capabilities

### New Capabilities

- `results-page-kpi-summary`: The consolidated 4-card KPI summary row at the top of the salary/benchmark results pages (your salary, live market average, government benchmark, 75th-percentile ceiling highlight) and the resulting single-source-of-truth for the user's own salary display on that page.

### Modified Capabilities

- `ui-fixes`: The "Results Page Card Density" and "Results Page Color Hierarchy" requirements describe the current side-by-side Adzuna/Government card layout and its color treatment; both need updating to reflect the new KPI-row-first layout and the removal of the duplicated salary figure from the secondary cards.

## Impact

- **Pages**: `app/pages/salary/[title]/[country]/[[location]].vue`, `app/pages/benchmark/[title]/[country]/[[location]].vue` (both consume `useLocationEngine` identically and need the same new KPI row + reorder).
- **Components**: new KPI summary row component(s) under `app/components/Section/**` or `app/components/AmI/**` (exact structure decided in design.md); `app/components/Card/Result.vue` (used by both `Section/Adzuna/Comparison.vue` and `Section/Government/Comparison.vue`) gains a `showUserSalary` prop; `app/components/Section/Score/Mca.vue` gains a 4th breakdown item; `app/components/AmI/Card/Role.vue` gets a restyled layout (unchanged props) which also covers its two thin wrappers, `Section/Reed/JobListing.vue` and `Section/Jooble/JobListing.vue`.
- **Composables**: no changes to `useLocationEngine.ts` or `useJobs.ts` — all data needed (`userSalary`, `marketAverage`, `marketLow`, `marketHigh`, `diffPercent`, `isUnderpaid`, `mcaScore.breakdown.modifier`) already exists and is already returned.
- **i18n**: new translation keys needed for the KPI row card labels/hints and the MCA modifier breakdown copy, in `i18n/locales/en-GB/*.json` and `i18n/locales/en-US/*.json` (not admin-only, so no hardcoded strings).
- **Tests**: new unit tests for the KPI row component(s), `Card/Result.vue` (currently untested despite carrying real logic), and the MCA modifier breakdown addition; existing tests referencing `Card/Result.vue`'s salary display or `AmICardRole`'s layout need review for continued accuracy.
