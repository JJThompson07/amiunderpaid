# eslint-strict-remediation Specification

## Purpose

TBD - created by archiving change strict-typescript-remediation. Update Purpose after archive.

## Requirements

### Requirement: Strict Codebase Typing

The codebase SHALL strictly enforce all ESLint TypeScript rules without disabling `@typescript-eslint/no-explicit-any` or `@typescript-eslint/explicit-function-return-type` in `eslint.config.mjs`.

#### Scenario: Running `pnpm typecheck`

- **WHEN** the `pnpm typecheck` command is executed
- **THEN** it completes with exit code 0, raising no strict typing compilation errors.

#### Scenario: Running `pnpm lint`

- **WHEN** the `pnpm lint` pipeline reaches the ESLint check step (`eslint --max-warnings 0`)
- **THEN** it completes with exit code 0, reporting 0 errors and 0 warnings.

### Requirement: Vue Component Emit Typings

All Vue 3 components using the Composition API `defineEmits` macro SHALL use type-based syntax to declare emit parameters rather than the untyped string array syntax, rendering `vue/require-emit-validator` obsolete.

#### Scenario: Emitting an event from a Vue component

- **WHEN** a component emits an event (e.g., `emit('user-select', user)`)
- **THEN** the emit parameters MUST be statically validated by TypeScript, and the component MUST NOT raise a `vue/require-emit-validator` error.
