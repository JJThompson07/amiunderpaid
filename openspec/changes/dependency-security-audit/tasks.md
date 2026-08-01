# Tasks: Dependency Security Audit

- [x] 1. Run `pnpm audit` and identify the specific packages causing the Critical and High vulnerabilities.
- [x] 2. Selectively update the vulnerable packages using `pnpm update <package>` or `pnpm update --interactive`.
- [x] 3. Run `pnpm install` to ensure the lockfile is fully synced.
- [x] 4. Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` to verify the application still functions correctly.
- [x] 5. If breaking changes are introduced by the updates, fix the corresponding application code.
