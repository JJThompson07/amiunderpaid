## Why

Our dependency tree currently flags 152 vulnerabilities (6 Critical, 67 High) via `pnpm audit`. This poses a security risk, especially for publicly exposed dependencies, and pollutes our CI logs. We need to systematically upgrade our dependencies to patch these vulnerabilities without breaking the Nuxt/Vue application.

## What Changes

- Execute `pnpm update` for vulnerable packages (e.g., `nuxt`, `@babel/core`, etc.).
- Update `package.json` and `pnpm-lock.yaml` to reflect the patched versions.
- Ensure all tests and the build pipeline pass after the updates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. (This is a pure maintenance/dependency change. `skip_specs: true` is set in `.openspec.yaml`).

## Impact

- **Dependencies (`package.json`, `pnpm-lock.yaml`)**: Versions will be updated.
- **Application Stability**: Upgrading packages (especially frameworks like Nuxt) carries the risk of breaking changes or typing changes that might require code fixes.
