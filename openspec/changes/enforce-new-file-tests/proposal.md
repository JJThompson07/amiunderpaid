## Why

Currently, `scripts/structure-lint.ts` emits a warning when an adjacent unit test is missing for core utilities or composables, specifically to avoid failing the CI build due to legacy un-tested files. However, this allows developers to introduce new technical debt by adding new files without tests. We need a strict gate to prevent this moving forward.

## What Changes

- Modify `scripts/structure-lint.ts` to execute `git diff --name-only --diff-filter=A` to detect newly added files in the git index.
- If a missing test violation is detected for a newly added file, trigger a hard `fail()` (throwing an error/exiting with code 1) instead of just warning.
- Legacy files lacking tests will continue to emit a warning, preserving build stability while halting the growth of technical debt.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. (This is a pure tooling/governance change. `skip_specs: true` should be set in `.openspec.yaml`).

## Impact

- **Tooling (`scripts/structure-lint.ts`)**: Logic will become state-aware based on the Git index.
- **CI/CD Pipeline**: Developers will be blocked from merging any new core util or composable that lacks an adjacent `.spec.ts` test file.
