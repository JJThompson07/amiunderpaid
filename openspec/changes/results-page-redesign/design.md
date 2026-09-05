## Context

See `proposal.md` for motivation. Three existing pieces of the codebase are directly relevant to how this gets built:

- `app/components/Card/Result.vue` is a single shared component used by **both** `Section/Adzuna/Comparison.vue` and `Section/Government/Comparison.vue` to render the "Your salary / Market average" header block (`card-result--salaries` section). It has no other callers. This means the "duplicated salary" problem has exactly one root cause, not two components to separately edit.
- `app/components/Section/Score/Mca.vue` already renders the live/micro/macro percentile breakdown via `app/components/AmI/Chart/Range.vue`, using `mcaScore.breakdown.{livePercentile,microPercentile,macroPercentile}` from `shared/utils/formatter.ts`'s `McaUiData`. The 4th value this change surfaces, `mcaScore.breakdown.modifier` (`app/composables/useLocationEngine.ts:243-281`, `shared/utils/types.ts`'s `ScoreBreakdown`), is a multiplier around `1.0` (e.g. `1.25` for a 25% regional cost-of-living uplift), not a 0-100 percentile — `AmIChartRange` hardcodes 0-100 percentile semantics (`aria-valuemax="100"`, `formatOrdinal` text) and isn't a fit for a raw multiplier.
- `app/components/AmI/Card/Role.vue` already computes and renders a pay-comparison badge (`salaryMaxComparison`, a `comparisonChipAttributes`-driven chip with pay-rise/pay-cut/no-change copy from `card.role.{amiunderpaid,benchmarkmyrole}.compare.*`) from `userSalary` vs. `salaryMax` — confirmed by reading the component directly. This existing behavior does not need to change; only its visual prominence in the card layout does.

## Goals / Non-Goals

**Goals:**

- Single-component fix for the duplicated salary display (via `Card/Result.vue`), not a page-level workaround.
- Reuse existing components (`Card/Result.vue`, `Section/Score/Mca.vue`, `AmI/Card/Role.vue`) wherever the change is additive; only build new components for genuinely new surface area (the KPI row itself).
- Keep both `/salary` and `/benchmark` pages behaviorally identical after the change — they already share `useLocationEngine.ts` and should keep sharing the new KPI row / restyled sections rather than diverging.

**Non-Goals:**

- No new data fetching, composable changes, or scoring-algorithm changes. Every figure in the KPI row and the restyled cards is already returned by `useLocationEngine` or `useJobs`.
- No redesign of the recruiter "Take Action" cards' internal content (`AmIRecruiterButton`) beyond moving the section's position in the page — only reordering, not restyling.
- No changes to `Section/Government/SalaryVisualizer.vue`'s percentile-slider visualization itself.

## Decisions

**1. Dedup via a `showUserSalary` prop on `Card/Result.vue`, defaulting to `true`.**
Both current callers (`Section/Adzuna/Comparison.vue`, `Section/Government/Comparison.vue`) pass `:show-user-salary="false"` once the KPI row exists. Defaulting to `true` keeps the component's existing behavior for any future caller that doesn't opt out, rather than silently changing behavior everywhere `Card/Result` might be used later. Alternative considered: delete the salary section from `Card/Result.vue` entirely and inline it only where still needed — rejected because there is no other place that currently needs it, and a prop is less destructive if a future page wants the old combined view.

**2. New KPI row is its own component, not a variant of `Card/Result.vue`.**
The four KPI cards have different internal layouts (plain stat vs. stat+variance vs. highlighted gradient upside card) that don't map onto `Card/Result.vue`'s icon+salary-pair+verdict+footer slot structure. Building a new `Section/Results/KpiSummary.vue` (exact name TBD in tasks.md) composing four small stat-card components keeps `Card/Result.vue` unchanged in shape (only the new prop) and avoids forcing unrelated layouts through one template.

**3. The MCA "regional modifier" breakdown item is a new small component, not a 4th `AmIChartRange`.**
Since the modifier is a multiplier (not a 0-100 percentile), it gets a lightweight labeled stat row (value + directional description, e.g. "1.25x — 25% above national baseline") rather than being forced into `AmIChartRange`'s percentile bar semantics. It renders conditionally: omitted entirely when `modifier === 1` (no regional signal), per the `results-page-kpi-summary` spec's "No regional modifier available" scenario.

**4. Job listing card restyle only touches `AmICardRole` — template/style only, no new comparison logic.**
`Section/Reed/JobListing.vue` and `Section/Jooble/JobListing.vue` are thin wrappers that render `AmICardRole` with the same props (confirmed by reading both) — restyling `AmICardRole` alone restyles all three data-provider paths, no separate work needed per provider. `AmICardRole`'s existing `salaryMaxComparison` computed and its chip already do the pay-comparison work correctly; this change only makes that existing badge and the salary range more visually prominent (per the mockup's denser card layout) and adds a company-initial avatar. No new props, no new computed values beyond presentational ones (e.g. deriving the avatar initial from the existing `company` prop).

**5. Section order becomes: KPI row → MCA score → Take Action (recruiters) → Adzuna distribution → Government benchmark → job listings carousel.**
REVISED during implementation: the order was first built as KPI → MCA → Adzuna/Government → recruiters → carousel (recruiters last, directly before the carousel), matching a literal reading of the original request. User feedback after reviewing the live page moved recruiters up to sit directly under the MCA score, ahead of the Adzuna/Government cards — the "Take Action" prompt reads better immediately after the score than after two data cards. This only reorders existing template blocks in both results pages' `<template>` — no new conditional logic beyond what already guards each section (`hasGovernmentData`, `hasJobsData`, `hasRecruiters`, etc.).

**6. Recruiter card (`AmI/RecruiterButton.vue`) restyled to match the rest of the redesigned page.**
The card previously washed its entire background in a translucent tint of the recruiter's configured `brandBgColour` (`rounded-3xl`, `shadow-md`, full-card colour wash) — visually inconsistent with every other card on the redesigned page, which use white/neutral backgrounds with a small colour badge (KPI cards, `AmICardRole`, `AmICardAction`). Restyled to `rounded-2xl` white background with `shadow-sm`/`hover:shadow-md`, a circular `w-10 h-10` avatar (logo image, or a light tint of the recruiter's own brand colour behind the fallback briefcase icon) matching the `AmICardRole`/`AmICardAction` avatar convention, and `flex flex-col h-full` so cards in the same grid row align evenly. The recruiter-configured icon/logo, title copy, and button background/text colour are all still fully driven by `RecruiterCard` data — only the card chrome around them changed.

## Risks / Trade-offs

- **[Risk]** `Card/Result.vue` currently derives its own background tint from whether `userSalary` is truthy (`cardClasses` computed, line 88-93 today) — hiding the salary section doesn't change that computed, so the card's background logic still silently depends on a value it no longer displays. → **Mitigation**: task-level check to confirm `cardClasses` still produces sensible output when `showUserSalary` is `false`; adjust if the "no salary entered" gray state stops making sense without the visible salary figure.
- **[Risk]** Reordering sections changes which content loads first in the DOM, which could shift what Lighthouse/Core Web Vitals treats as the largest contentful paint element. → **Mitigation**: no code-level mitigation needed pre-emptively; call this out as a manual check after implementation (visually confirm nothing regresses on a slow-network throttled load), not a blocking task.
- **[Trade-off]** Keeping the KPI row as a new component rather than trying to reuse `Card/Result.vue` for it means slightly more new code, but avoids retrofitting a 4-variant layout into a component whose existing shape (icon + salary pair + verdict slot + footer slot) doesn't match any of the four new cards well.

## Open Questions

- Exact component/file names and directory placement for the new KPI row and its four card sub-pieces (e.g. `Section/Results/KpiSummary.vue` vs. `AmI/Card/Kpi.vue`) — decided during implementation, doesn't change the spec or task breakdown either way.
