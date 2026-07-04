## Why

The recruiter password reset and change forms currently have two issues:

1. Localization strings (like `account.form.new-password` or `passwordChange.title`) are rendering as literal text instead of their translated values due to incorrect or missing namespace prefixes in the `$t()` function.
2. The layout of the password change form in the recruiter profile presents all input fields in a single horizontal row on larger screens, causing visual clutter and a poor user experience.

## What Changes

1. Update `app/pages/auth/reset-password.vue` to ensure `$t()` correctly resolves the translation keys from `account.json`.
2. Update `app/pages/recruiter/profile.vue` to correctly namespace its password translations, moving the `passwordChange` keys from `recruiter.json` into `account.json` to match the correct structure.
3. Refactor the password change form layout in `profile.vue` to use a vertical `flex-col` structure with clear spacing (`gap-6`).
4. Add a visual divider separating "Current Password" and "New Password" fields.

## Non-Goals

- We are not changing the underlying Firebase authentication logic.
- We are not redesigning the entirety of the recruiter profile page.
