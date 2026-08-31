## MODIFIED Requirements

### Requirement: Strict Codebase Typing

The codebase SHALL strictly enforce all ESLint TypeScript rules without disabling `@typescript-eslint/no-explicit-any` or `@typescript-eslint/explicit-function-return-type` in `eslint.config.mjs`.

#### Scenario: Running `pnpm typecheck`

- **WHEN** the `pnpm typecheck` command is executed
- **THEN** it completes with exit code 0, raising no strict typing compilation errors.

#### Scenario: Running `pnpm lint`

- **WHEN** the `pnpm lint` pipeline reaches the ESLint check step (`eslint --max-warnings 0`)
- **THEN** it completes with exit code 0, reporting 0 errors and 0 warnings.

#### Scenario: Running `pnpm lint`'s spellcheck step

- **WHEN** the `pnpm lint` pipeline runs its `spellcheck` (cspell) step, which executes before typecheck and ESLint
- **THEN** it completes with exit code 0, reporting 0 unknown-word findings across all files it scans
