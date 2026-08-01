# Proposal: Strict SDD Governance

## Why
We need to ensure that the repository strictly adheres to Spec-Driven Development (SDD) and architectural conventions moving forward. The previous tooling was too loose, allowing regressions in testing requirements, typing, and structural conventions. 

## What
Implement a strict tooling pipeline that mathematically guarantees the codebase aligns with `AGENTS.md` and `CODE_STANDARDS.md`. This includes:
- A custom structural linter (`scripts/structure-lint.ts`) to enforce component naming and the existence of adjacent `.spec.ts` files for composables/utils.
- A strict TypeScript compiler configuration (`strict: true`, etc.).
- A strict ESLint configuration (`@nuxt/eslint` + rigorous type-aware typescript rules, enforcing Vue 3 PascalCase template standards).
- A project-wide spellchecker (`cspell`).
- A unified `pnpm lint` gate combining all of the above.

## Scope
- Update `package.json` with the new gate (`pnpm lint`).
- Replace `eslint.config.mjs` with a strict configuration.
- Update `tsconfig.json`.
- Create `scripts/structure-lint.ts`.
- Create `cspell.config.json` and seed it with project-specific terminology.
- Create `.gitattributes` to collapse lockfiles and OpenSpec markdown diffs in PRs.
- Retroactively auto-fix legacy styling violations (Prettier, ESLint).
- Apply PascalCase component template rewrites across the entire Vue app via `pnpm eslint --fix`.
- Downgrade specific legacy violations to warnings to unblock immediate feature work.

## Non-Goals
- We are specifically excluding the setup of Git hooks (`simple-git-hooks` and `commitlint`) per explicit request.
- We are not actively backfilling the 30+ missing legacy unit tests in this change, only adding the warning infrastructure for them.
