## Context

The repository has historically suppressed or accumulated over 800 strict TypeScript and Vue ESLint rule violations (like `no-explicit-any`, `explicit-function-return-type`, and `vue/require-emit-validator`). With the introduction of `--max-warnings 0` to the CI lint step, these legacy errors are preventing the build from passing.

Rather than weakening the lint configuration by downgrading these rules to `warn` or `off`, this design aims to fundamentally fix the underlying code. The goal is to fully type all endpoints, components, and composables, bringing the entire codebase up to standard without disabling any core strictness settings.

## Goals / Non-Goals

**Goals:**

- Replace `any` typings with proper `interface` or `type` definitions throughout `server/api`, `app/components/`, `app/composables/`, and `shared/`.
- Apply missing return types to all functions.
- Modernize `defineEmits` syntax in Vue components using type-based declarations (or providing runtime validators) to satisfy `vue/require-emit-validator`.
- Ensure all other standard Vue and TS lint rules pass cleanly so that `pnpm lint` yields an exit code of 0.

**Non-Goals:**

- We are NOT rewriting core business logic or changing application behavior.
- We are NOT removing or downgrading rules in `eslint.config.mjs` simply to satisfy the build; the rules stay strictly enforced.

## Decisions

**1. Type-based Vue Emits:**
Instead of adding bloated runtime validators for `defineEmits(['click'])`, we will convert legacy component emits to Nuxt 3's type-based declaration: `const emit = defineEmits<{ (e: 'click'): void }>()`. This cleanly satisfies the ESLint rule without runtime overhead.

**2. Shared Types Directory:**
When replacing `any` types that are used across both the client and server (e.g. Algolia payloads, Job/Salary data models), we will create or extend interfaces in `shared/utils/types.ts` rather than duplicating them in isolated files.

**3. Minimal Suppressions:**
If an underlying third-party library is completely untyped and impossible to cast, we will use `@ts-expect-error` with a clear explanation comment. We will not globally silence the rule or use `eslint-disable` blindly.

## Risks / Trade-offs

- **Risk:** Type casting a previously `any` value could surface hidden runtime errors if the expected type structure doesn't perfectly match the runtime reality.
- **Mitigation:** We will ensure `vitest` unit tests and playwright `e2e` tests are run immediately after typing the modules to detect mismatches.

- **Risk:** The sheer volume of 800+ errors makes this a massive refactor that might merge-conflict with other developers' work.
- **Mitigation:** Execute automated replacement tools (`eslint --fix`) for simple tasks first, and manually resolve only the complex typings.
