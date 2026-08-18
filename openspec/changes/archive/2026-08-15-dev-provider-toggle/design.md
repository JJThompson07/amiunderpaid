## Context

See proposal.md for motivation. We need a way to test the Reed fallback without writing temporary hardcodes or waiting for rate limits.

## Goals / Non-Goals

**Goals:**

- Provide a clear UI toggle in the frontend, visible only during local development.
- Allow developers to seamlessly switch between 'auto' (production behavior), 'adzuna', and 'reed'.
- Securely pass this override to the backend to alter the data fetching path.

**Non-Goals:**

- Allowing production users or admins to manually toggle the search provider.
- Modifying how the API behaves when the override is set to 'auto'.

## Decisions

**1. State Management**
We will use Nuxt's `useState<string>('devProviderOverride', () => 'auto')` within a new composable `useDevProviderOverride.ts` (or simply inside the components) to track the selected provider ('auto', 'adzuna', 'reed').

**2. UI Component**
We will render a simple button group or select toggle immediately above the `SectionReedJobListing` or `AmICardRole` in the benchmark and salary pages.
_Alternative considered:_ A floating dev tools panel. Decided against it to keep the implementation localized and simple.
This toggle will be wrapped in `v-if="import.meta.dev"` to strictly prevent it from appearing in production builds.

**3. API Override Mechanism**
The frontend `useAdzuna` composable will append an optional `devProvider` query parameter to the `/api/adzuna/jobs` and `/api/adzuna/salary` requests.
On the server, `server/api/adzuna/jobs.ts` and `salary.ts` will check `getQuery(event).devProvider`.

- If `devProvider === 'reed'` AND `process.dev === true`, the API will bypass the Adzuna fetch and immediately invoke the Reed fallback logic.
- If `devProvider === 'adzuna'` AND `process.dev === true`, the API will only query Adzuna and bypass the fallback mechanism (or just let it run normally, as it will naturally hit Adzuna first).

## Risks / Trade-offs

- **Risk:** The query parameter override could be exploited in production to bypass Adzuna if the backend check is missing.
- **Mitigation:** The server-side API routes MUST explicitly check `if (!process.dev) return;` or equivalent when reading the `devProvider` query parameter, ensuring production requests always ignore it.
