# Tasks: Enforce New File Tests

- [x] 1. Update `scripts/structure-lint.ts` to execute `git diff` against `HEAD`, `--cached`, untracked files, AND the base branch (`origin/main...HEAD` or `main...HEAD`) to capture newly added files in both local dev and CI/PR environments.
- [x] 2. Update the warning logic in `structure-lint.ts`: if a file violating the test rule is in the new files list, emit `process.exit(1)` or throw an Error to fail the build. Otherwise, continue emitting a warning for legacy files.
- [x] 3. Test the script locally by staging a new composable without a test and verifying it fails, then staging a test and verifying it passes.
