## Overview
This change represents a massive testing initialization effort across the Nuxt backend. It removes the temporary coverage override and introduces missing test coverage to all un-tested backend modules.

## Key Decisions

**1. Removing Coverage Exceptions**
- *Decision*: Strip the `'server/**/*.ts'` override from `vitest.config.ts`.
- *Rationale*: A 0% threshold creates a silent regression vector. By enforcing 80%, any new server endpoint added in the future will automatically fail the build if it lacks tests, maintaining codebase health.

**2. AGENTS.md Protocol Update**
- *Decision*: Remove the sentence: "Server API routes (`server/**`) currently have a relaxed starting threshold of 0%."
- *Rationale*: Agents (Claude/Antigravity) read `AGENTS.md` as the ultimate source of truth. If it tells them 0% is allowed, they will skip writing server tests. Removing this guarantees they write tests for all future endpoints.

**3. Full-Glob Enumeration Over Representative Sampling**
- *Decision*: Before writing tests, enumerate every file matched by the `server/**/*.ts` coverage include glob (via `find`/diff against existing `.spec.ts` files) rather than listing "primary areas of focus" from memory.
- *Rationale*: `vitest.config.ts` sets `thresholds.perFile: true`, so coverage is enforced independently per file — a single untracked file (e.g. `server/utils/fallback.ts`, which has real UK/US branching logic) fails the whole suite regardless of how well-tested the "primary" endpoints are. Reviewing this proposal against the actual filesystem surfaced five untested files outside the original scope; see `tasks.md` §1a.

**4. Mocking Strategy**
- *Decision*: Standardize on `vi.mock` for `firebase-admin/firestore` and `@nuxtjs/algolia`.
- *Rationale*: Server endpoints must execute instantly in CI without needing a real Firebase emulator connection unless absolutely necessary. We will rely heavily on `vi.mock('firebase-admin/firestore')` and `vi.mock('~/server/utils/firebase')` to spy on `.get()`, `.update()`, and `.delete()` calls, which is the established pattern in the few existing `server/api/` tests.
