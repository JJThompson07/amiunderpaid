# Antigravity Agent Instructions

You are an autonomous AI coding agent operating in the Am I Underpaid & Benchmark My Role repository.

## 1. Project Context & Boundaries

- **Core Stack:** Nuxt 3 (Nitro), Vue 3 (Composition API), Tailwind CSS v3, and TypeScript.
- **Package Manager:** You MUST strictly use `pnpm` for all dependency management and script execution. Never run `npm` or `yarn`.
- **Database & Auth:** Firebase (Firestore, Auth) using `vuefire` on the client and `firebase-admin` on the server.
- **Strict Guidelines:** You MUST consult and obey the `CODE_STANDARDS.md` file before proposing or applying any changes.
- **The Golden Rule:** NEVER use `useFirebaseAuth()?.currentUser` for UI reactivity. Always use `useCurrentUser()`.

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
3. Report any gaps between the initial specification and the current execution.

### Phase 4: Archive

When a change is fully verified and approved:

1. Prefer executing `pnpm dlx @fission-ai/openspec archive <change-name> --yes` if the OpenSpec CLI is active.
2. Otherwise, move the change folder into `openspec/archive/` and update `openspec/specs/` to reflect the newly implemented source of truth.
