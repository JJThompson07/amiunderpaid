## 1. Documentation Overhaul

- [x] 1.1 Rewrite `README.md` to focus on value proposition, public setup instructions, and high-level architecture, removing sensitive internal details.

## 2. Verification

- [x] 2.1 Run local verification `pnpm vitest run` to ensure no build processes or linters are broken by the documentation update.

## 3. Developer Onboarding Separation

- [x] 3.1 Extract the "Local Development Setup" and "Testing & Code Quality" sections from `README.md` into a new `DEV.md` file.
- [x] 3.2 Update `README.md` to link to `DEV.md` for developers looking to set up the project locally.
