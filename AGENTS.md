# Antigravity Agent Instructions

You are an autonomous AI coding agent operating in the Am I Underpaid & Benchmark My Role repository.

## 1. Project Context & Boundaries

- **Core Stack:** Nuxt 4 (Nitro), Vue 3 (Composition API), Tailwind CSS v4, and TypeScript.
- **Package Manager:** You MUST strictly use `pnpm` for all dependency management and script execution. Never run `npm` or `yarn`.
- **Database & Auth:** Firebase (Firestore, Auth) using `vuefire` on the client and `firebase-admin` on the server.
- **Strict Guidelines:** You MUST consult and obey the `CODE_STANDARDS.md` file before proposing or applying any changes.
- **The Golden Rule:** NEVER use `useFirebaseAuth()?.currentUser` for UI reactivity. Always use `useCurrentUser()`.
- **The Security Rule:** NEVER read secrets via `process.env` or `config.public` in server handlers. ALL credentials MUST be accessed exclusively via Nuxt's private `runtimeConfig` (e.g. `config.myApiKey`). Any new secret MUST also be registered in `nuxt.config.ts` `runtimeConfig` before use.
- **The Error Message Rule:** Server error messages returned to the client MUST be opaque. NEVER include provider names, country codes, or internal routing details in `statusMessage`. Use `503` for downstream provider failures and `500` for server misconfigurations.
- **The Dev-Gate Rule:** Any feature that only exists for local development (e.g. provider overrides, debug toggles) MUST be gated behind `process.dev` (server) and `import.meta.dev` (client). Zero dev-only surface area in production.

## 2. OpenSpec Workflow

This repository strictly follows OpenSpec for Spec-Driven Development (SDD). Keep changes small, deterministic, and test-backed.

- Treat `openspec/specs/` as the absolute source of truth for current behavior.
- Treat `openspec/changes/<change-name>/` as the working directory for proposed and active changes.
- Never write implementation code until the specification phase is complete and approved.

### Phase 1: Plan (Propose)

When instructed to plan a feature:

1. Read existing relevant files in `openspec/specs/`.
2. Create a new change folder: `openspec/changes/<change-name>/`.
3. Generate a `proposal.md` (defining why, what, scope, and non-goals) and a `tasks.md` (an actionable checklist).
4. Generate the `specs/**/spec.md` detailing the exact delta (ADDED/MODIFIED/REMOVED).

### Phase 2: Implement (Apply)

When instructed to implement:

1. Identify the active change folder in `openspec/changes/`.
2. Execute tasks sequentially as defined in `tasks.md`.
3. Check the checkbox status in `tasks.md` ONLY after local verification passes.

### Phase 3: Validate

When instructed to validate:

1. Map the acceptance criteria from the spec to the implemented code.
2. Run standard local verification commands using pnpm (e.g., `pnpm nuxi typecheck` or standard build steps) to ensure the build is not broken.
3. Run the project's unit test suite using `pnpm vitest run` and ensure ALL tests pass before proceeding.
4. Report any gaps between the initial specification and the current execution.

### Phase 4: Archive

When a change is fully verified and approved:

1. Prefer executing `pnpm dlx @fission-ai/openspec archive <change-name> --yes` if the OpenSpec CLI is active.
2. Otherwise, move the change folder into `openspec/archive/` and update `openspec/specs/` to reflect the newly implemented source of truth.

## 3. Commits

- **Gitmojis Required:** You MUST always use gitmojis in commit messages. The gitmoji should be at the very beginning of the commit message, optionally followed by the conventional commit type (e.g., `🐛 fix: ...`, `✨ feat: ...`, `🚀 build: ...`, `♻️ refactor: ...`, `📝 docs: ...`).

## 4. CI / Testing Enforcement

- **Test Verification:** Before concluding ANY task, proposing a change, or asking the user to push a branch, you MUST run both `pnpm test` (Unit Tests) and `pnpm test:e2e` (Playwright tests).
- **Hard Blocker:** If ANY test fails during execution, this blocks further execution. You must fix the regression before proceeding or explicitly ask the user for guidance if you are stuck.
- **Coverage Enforcement:** The repository strictly requires **80% minimum coverage** on all four metrics (statements, branches, functions, and lines) on a per-file basis. You MUST run `pnpm run test:coverage` to verify this criteria is met for any modified or new files before concluding a task. PRs will fail if any file drops below 80% coverage.
  - *Note:* Server API routes (`server/**`) currently have a relaxed starting threshold of 0%. When modifying or adding new server endpoints, you MUST write corresponding unit tests to establish coverage.

## 5. Coding Standards & Linting

- **Strict Imports:** All imports, especially destructured members, MUST be sorted alphabetically to prevent ESLint `sort-imports` errors (e.g., `import { describe, expect, it } from 'vitest';` not `import { describe, it, expect }`).

## 6. Multi-Tenant & Country Considerations

- **Country Context:** ALWAYS consider the country/tenant context (e.g., UK vs. USA) when interacting with databases, Algolia indexes, or displaying UI logic. Avoid hardcoding country logic if it can be inferred dynamically (e.g., via `useRegion()`).
- **Data Boundaries:** Ensure that server-side scripts, database queries (Firestore), and search integrations (Algolia) correctly isolate data by the selected country. Never assume a default country for global operations without explicitly confirming the execution context.
