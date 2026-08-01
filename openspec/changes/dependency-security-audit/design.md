## Context

See proposal.md for motivation. We have 152 vulnerabilities spanning 6 Critical and 67 High severity. We use `pnpm` as our package manager.

## Goals / Non-Goals

**Goals:**

- Eliminate all critical and high vulnerabilities.
- Ensure the app builds and tests pass.

**Non-Goals:**

- We are not undertaking major version migrations of core frameworks unless strictly required for a critical security fix.

## Decisions

**Dependency Update Strategy**

- **Decision**: We will execute targeted `pnpm update <package>` for vulnerable packages, prioritizing minor/patch updates to avoid breaking changes.
- **Alternative**: Blindly running a global `pnpm update` on everything, which is highly likely to break the build.
- **Rationale**: A targeted approach minimizes the blast radius of the dependency bumps.

## Risks / Trade-offs

- **Risk**: Upgrading Nuxt or Vite might break our custom configurations or typing.
- **Mitigation**: We will run `pnpm typecheck` and `pnpm test` immediately after upgrading to catch regressions locally before merging.
