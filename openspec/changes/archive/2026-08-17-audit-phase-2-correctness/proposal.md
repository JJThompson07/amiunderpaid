# Phase 2: Correctness Bugs, CI Gates, and Documentation

## Why

This phase addresses correctness issues that affect core business logic (like incorrect Algolia queries in the UK), cleans up Nuxt configurations, ensures error handling aligns with Nuxt h3 standards (throwing instead of returning errors), fixes pricing math logic, and explicitly locks dependencies. Critically, it implements a GitHub Actions CI gate to enforce these standards permanently so they do not regress.

## What

- Fix the UK regional Algolia filter in `useMicroData.ts`.
- Remove unresolvable `nuxt-i18n` imports.
- Ensure all endpoints use `throw createError` instead of `return createError` to emit the proper HTTP status codes.
- Fix Stripe amounts calculation (rounding).
- Fix the seed year range in `admin/seed.vue`.
- Fix the translation helper (`$t()` -> `t()`) in Vue `<script setup>` blocks.
- Pin `xlsx` and explicitly declare transitive dependencies (`dotenv`, `@vitejs/plugin-vue`).
- Add comprehensive linting and checks to CI workflows.
- Improve `DEV.md`, `.env.example`, and add a proper `LICENSE`.

## Scope

Touches Nuxt configuration, CI yaml files, basic admin tools, and Algolia queries. It does not introduce new features or drastically alter the architecture.

## Non-Goals

- Expanding test coverage significantly (this is reserved for Phase 3).
- Optimizing slow queries (this is reserved for Phase 4).
