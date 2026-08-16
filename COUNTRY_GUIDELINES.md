# Multi-Tenant & Country Guidelines

Am I Underpaid & Benchmark My Role operate as multi-tenant platforms dynamically adjusting behaviour based on the user's region (UK vs USA).

When building or updating features, you MUST ensure that all UI, data fetching, and business logic respect these boundaries.

## 1. Domain & Region Detection
- **Detection Method:** Use the `useRegion()` composable (`isUSSite`, `isUKSite`, `currentCountry`) on the frontend to determine the active tenant.
- **Server-Side:** Use the `country` query parameter (e.g. `country=us` or `country=gb`) passed to endpoints.

## 2. Market Data Providers & Fallbacks
We use Adzuna as our primary real-time market data source globally. However, rate limits (429s) require seamless geographical fallbacks:

| Region | Primary Provider | Fallback Provider | API Credentials |
|---|---|---|---|
| **UK (`gb`)** | Adzuna API | **Reed API** | `adzunaAppId/Key`, `reedApiKey` |
| **USA (`us`)** | Adzuna API | **Jooble API** | `adzunaAppId/Key`, `joobleApiKey` |

### Fallback Orchestration
- Server endpoints (`/api/market-data/jobs.ts`, `/api/market-data/salary.ts`) use a unified orchestrator `executeMarketFallback` in `server/utils/fallback.ts`.
- Never hardcode the fallback provider. Always route based on `countryCode`.

### Salary Data Normalization
Different fallback APIs return salary structures uniquely:
- **Reed (UK):** Returns distinct numerical boundaries (`minimumSalary`, `maximumSalary`).
- **Jooble (USA):** Returns unstructured text strings (`salary: "$95k - $120k"`).
- We use dedicated parser utilities (e.g. `parseJoobleSalary` in `server/utils/jooble.ts`) to normalize unstructured data into predictable `salary_min`, `salary_max`, and `raw_salary` outputs.

### Histogram Capping
To ensure consistent frontend rendering of salary distributions, fallback histograms must be artificially capped to a **maximum of 7 cleanly rounded buckets**. This aligns with Adzuna's default behaviour and prevents the UI from breaking horizontally. This logic is enforced by `buildHistogramBuckets` in `shared/utils/math.ts`.

## 3. UI and Content Boundaries
- **Translations:** Ensure all brand references match the target region.
  - UK: Use `en-GB` translations (e.g. ONS, Reed, £).
  - USA: Use `en-US` translations (e.g. BLS, Jooble, $).
- **Trust Badges:** Components like `TrustBadges.vue` must use `v-if="isUSSite"` to swap out government and fallback logos accordingly (e.g. ONS vs BLS, Reed vs Jooble).
- **Job Cards:** Provider attribution tags (e.g. "By Jooble" vs "By Reed") and external tracking links MUST route dynamically. Ensure `AmICardRole` gracefully handles Edge Cases like missing fallback salaries (displaying "Salary not provided" instead of `$0`).

## 4. Environment Validation
Always ensure that provider credentials (e.g. `joobleApiKey`, `reedApiKey`) are accessed exclusively via `useRuntimeConfig()` server-side. Never expose these via `config.public`. Dev-only overrides (e.g. `devProvider=jooble`) must remain strictly gated behind `import.meta.dev` checks to ensure zero testing artifacts bleed into production.
