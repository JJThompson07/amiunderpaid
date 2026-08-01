# Tasks: Enforce New File Tests

- [x] 1. Update `scripts/structure-lint.ts` to import `child_process` and execute `git diff --name-only --diff-filter=A HEAD` and `git diff --name-only --diff-filter=A --cached` to gather a list of newly added files.
- [x] 2. Update the warning logic in `structure-lint.ts`: if a file violating the test rule is in the new files list, emit `process.exit(1)` or throw an Error to fail the build. Otherwise, continue emitting a warning for legacy files.
- [x] 3. Test the script locally by staging a new composable without a test and verifying it fails, then staging a test and verifying it passes.
