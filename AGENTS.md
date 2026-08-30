# Agent Instructions

You are an autonomous AI coding agent operating in the Am I Underpaid & Benchmark My Role repository. This file is shared context for every AI agent working in this repo — imported automatically into Claude Code's `CLAUDE.md` via `@AGENTS.md`, and read directly by Antigravity and any other AGENTS.md-compatible tool.

## 1. Two-Agent Workflow: Who Does What

This repo is built by two AI agents working as a team, each with a primary lane — not a hard wall:

- **Antigravity — primary: Plan.** Deep, standing understanding of the product. Scaffolds immaculate OpenSpec proposals (Phase 1 below): reads `openspec/specs/`, reasons about the product end-to-end, and produces `proposal.md` / `specs/**/spec.md` / `design.md` / `tasks.md` that the implementer can execute without re-deriving intent.
- **Claude — primary: Implement, Validate, Archive.** Codes to the standard this repo already holds itself to (`CODE_STANDARDS.md`), executes `tasks.md`, runs the full verification suite, and archives completed changes with specs synced. See `CLAUDE.md` for Claude-specific duties, including keeping `CODE_STANDARDS.md` itself honest.

Either agent can cross into the other's lane when explicitly asked — Claude can scaffold a proposal, Antigravity can implement a fix — but default to your primary lane unless told otherwise.

## 2. Project Context & Boundaries

- **Core Stack:** Nuxt 4 (Nitro), Vue 3 (Composition API), Tailwind CSS v4, and TypeScript.
- **Package Manager:** You MUST strictly use `pnpm` for all dependency management and script execution. Never run `npm` or `yarn`.
- **Use Package Scripts:** Prefer the `package.json` scripts (e.g. `pnpm test`, `pnpm test:e2e`, `pnpm test:coverage`, `pnpm lint`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm format`) over invoking the underlying tools (`vitest`, `playwright`, `eslint`, `prettier`, `tsc`) directly, so runs stay consistent with the flags and config the scripts already encode.
- **Database & Auth:** Firebase (Firestore, Auth) using `vuefire` on the client and `firebase-admin` on the server.
- **Strict Guidelines:** You MUST consult and obey the `CODE_STANDARDS.md` file before proposing or applying any changes.
- **The Golden Rule:** NEVER use `useFirebaseAuth()?.currentUser` for UI reactivity. Always use `useCurrentUser()`.
- **The Security Rule:** NEVER read secrets via `process.env` or `config.public` in server handlers. ALL credentials MUST be accessed exclusively via Nuxt's private `runtimeConfig` (e.g. `config.myApiKey`). Any new secret MUST also be registered in `nuxt.config.ts` `runtimeConfig` before use.
- **The Error Message Rule:** Server error messages returned to the client MUST be opaque. NEVER include provider names, country codes, or internal routing details in `statusMessage`. Use `503` for downstream provider failures and `500` for server misconfigurations.
- **The Dev-Gate Rule:** Any feature that only exists for local development (e.g. provider overrides, debug toggles) MUST be gated behind `process.dev` (server) and `import.meta.dev` (client). Zero dev-only surface area in production.
- **The Verify-Before-Recommending Rule:** Before proposing or implementing anything irreversible (data deletion/migration), anything that changes silent-failure to loud-failure behavior, or anything that depends on infrastructure specifics (hosting platform, trusted proxy headers, deployed env vars), verify the real current state first instead of assuming it. See `CODE_STANDARDS.md` §10. This repo's Playwright/e2e suite uses mocked endpoints — never propose pointing it at live endpoints without explicit, current instruction.

## 3. OpenSpec Workflow

This repository strictly follows OpenSpec for Spec-Driven Development (SDD). Keep changes small, deterministic, and test-backed.

- Treat `openspec/specs/` as the absolute source of truth for current behavior.
- Treat `openspec/changes/<change-name>/` as the working directory for proposed and active changes.
- Never write implementation code until the specification phase is complete and approved.

### Phase 1: Plan (Propose) — Antigravity's primary responsibility

When instructed to plan a feature:

1. Read existing relevant files in `openspec/specs/`.
2. Create a new change folder: `openspec/changes/<change-name>/`.
3. Generate a `proposal.md` (defining why, what, scope, and non-goals) and a `tasks.md` (an actionable checklist).
4. Generate the `specs/**/spec.md` detailing the exact delta (ADDED/MODIFIED/REMOVED).

**Proposal Quality Bar** — a proposal is not done when it reads well; it's done when the implementer can execute `tasks.md` without discovering the plan was wrong about the codebase or the standards it must meet. Before finalizing:

- **The Verify-Don't-Guess Rule:** Never name a specific file, component, endpoint, or Firestore collection in a proposal without first confirming it actually exists and behaves as assumed — read the file, grep the codebase, or (for external APIs) check the real request/response. Do not hedge with placeholders like "(or equivalent)" or "e.g., `AppHeader.vue`" that shift the verification work onto the implementer; find the real name (e.g. the actual navbar is `app/components/AmI/NavBar.vue`, not a guessed `AppHeader.vue`). This is `CODE_STANDARDS.md` §10's Verify-Before-Recommending Rule applied at plan time, not just implementation time — an unverified claim about a Firestore collection's actual contents or an external API's actual parameters is exactly the kind of infrastructure-specific assumption that rule exists to catch, and catching it in `tasks.md` is far cheaper than catching it mid-implementation.
- **The Standards-Complete Task Rule:** `tasks.md` must translate every applicable rule in `CODE_STANDARDS.md` and this file into a concrete, checkable task — never leave it implicit for the implementer to notice on their own. In particular: any user-facing string needs an explicit i18n task (§6, no hardcoded strings); any new `server/**` utility or `app/composables/**` function needs an explicit unit-test task (§8, plus the 80%-coverage hard blocker in §5 of this file); any call to an external or rate-limited API needs an explicit error-handling/partial-failure task (what happens when the call 429s or errors mid-batch); any new UI needs an explicit multi-tenant/country check (§7 of this file) if it touches country-scoped data. A proposal that is silent on one of these isn't neutral — it's a gap that will either get caught late or shipped broken.
- **The Full-Glob Enumeration Rule:** When a proposal changes how a threshold or lint rule is *enforced* across a directory or glob (e.g. lifting a coverage exemption, tightening an ESLint rule, adding a new CI gate), never scope `tasks.md` from a "primary areas of focus" sample written from memory or a partial read of the directory. Run the actual enumeration the enforcement will run against (e.g. `find server -name "*.ts" -not -name "*.spec.ts"` diffed against existing `*.spec.ts` files for a coverage change) and list every file it surfaces as an explicit task. This matters most when the enforcement is per-file rather than aggregate — this repo's `vitest.config.ts` sets `thresholds.perFile: true`, so a coverage-threshold proposal that lists only "primary areas" will pass review looking complete and then fail task 4's verification step on a file nobody planned for (caught in `server-coverage`: `server/utils/fallback.ts`, which has real UK/US branching logic per §7, was untested and absent from the original proposal's scope). Sampling is a planning shortcut that a per-file gate doesn't forgive — enumerate exhaustively instead.

### Phase 2: Implement (Apply) — Claude's primary responsibility, see `CLAUDE.md`

When instructed to implement:

1. Identify the active change folder in `openspec/changes/`.
2. Execute tasks sequentially as defined in `tasks.md`.
3. Check the checkbox status in `tasks.md` ONLY after local verification passes.

### Phase 3: Validate — Claude's primary responsibility, see `CLAUDE.md`

When instructed to validate:

1. Map the acceptance criteria from the spec to the implemented code.
2. Run standard local verification commands using pnpm (e.g., `pnpm nuxi typecheck` or standard build steps) to ensure the build is not broken.
3. Run the project's unit test suite using `pnpm vitest run` and ensure ALL tests pass before proceeding.
4. Report any gaps between the initial specification and the current execution.

### Phase 4: Archive — Claude's primary responsibility, see `CLAUDE.md`

When a change is fully verified and approved:

1. Prefer executing `pnpm dlx @fission-ai/openspec archive <change-name> --yes` if the OpenSpec CLI is active.
2. Otherwise, move the change folder into `openspec/archive/` and update `openspec/specs/` to reflect the newly implemented source of truth.

## 4. Commits

- **Gitmojis Required:** You MUST always use gitmojis in commit messages. The gitmoji should be at the very beginning of the commit message, optionally followed by the conventional commit type (e.g., `🐛 fix: ...`, `✨ feat: ...`, `🚀 build: ...`, `♻️ refactor: ...`, `📝 docs: ...`).

## 5. CI / Testing Enforcement

- **Test Verification:** Before concluding ANY task, proposing a change, or asking the user to push a branch, you MUST run both `pnpm test` (Unit Tests) and `pnpm test:e2e` (Playwright tests).
- **Hard Blocker:** If ANY test fails during execution, this blocks further execution. You must fix the regression before proceeding or explicitly ask the user for guidance if you are stuck.
- **Coverage Enforcement:** The repository strictly requires **80% minimum coverage** on all four metrics (statements, branches, functions, and lines) on a per-file basis. You MUST run `pnpm run test:coverage` to verify this criteria is met for any modified or new files before concluding a task. PRs will fail if any file drops below 80% coverage.
  - _Note:_ Server API routes (`server/**`) currently have a relaxed starting threshold of 0%. When modifying or adding new server endpoints, you MUST write corresponding unit tests to establish coverage.

## 6. Coding Standards & Linting

- **Strict Imports:** All imports, especially destructured members, MUST be sorted alphabetically to prevent ESLint `sort-imports` errors (e.g., `import { describe, expect, it } from 'vitest';` not `import { describe, it, expect }`).

## 7. Multi-Tenant & Country Considerations

- **Country Context:** ALWAYS consider the country/tenant context (e.g., UK vs. USA) when interacting with databases, Algolia indexes, or displaying UI logic. Avoid hardcoding country logic if it can be inferred dynamically (e.g., via `useRegion()`).
- **Data Boundaries:** Ensure that server-side scripts, database queries (Firestore), and search integrations (Algolia) correctly isolate data by the selected country. Never assume a default country for global operations without explicitly confirming the execution context.
