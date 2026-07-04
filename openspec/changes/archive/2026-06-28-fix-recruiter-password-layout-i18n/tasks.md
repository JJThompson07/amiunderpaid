## 1. i18n Refactoring

- [x] 1.1 In `i18n/locales/en-GB/account.json` and `i18n/locales/en-US/account.json`, move the `passwordChange` JSON block from the corresponding `recruiter.json` files so that password management translations are centralized in `account.json`. Remove the block from `recruiter.json`.
- [x] 1.2 In `app/pages/recruiter/profile.vue`, update all `$t('passwordChange...')` calls to `$t('account.passwordChange...')`.
- [x] 1.3 In `app/pages/auth/reset-password.vue`, update `useI18n()` to `useI18n({ useScope: 'global' })` (if necessary) to ensure `account.form.new-password` and other keys resolve correctly instead of rendering as literals. Do the same for `app/pages/recruiter/profile.vue` if `t()` is used directly.

## 2. Layout Refactoring

- [x] 2.1 In `app/pages/recruiter/profile.vue`, update the password form layout by replacing `<div class="grid md:grid-cols-3 gap-4">` with a vertical layout, e.g., `<div class="flex flex-col gap-6 max-w-xl">`.
- [x] 2.2 Add a `<hr class="border-slate-100" />` (or similar visual divider) after the `currentPassword` field, separating it from the `newPassword` and `confirmPassword` fields.
- [x] 2.3 Verify the layout is responsive and no longer horizontally squeezed on desktop.

## 3. Validation

- [x] 3.1 Run `pnpm format` to ensure clean formatting.
- [x] 3.2 Run `pnpm eslint .` and fix any new linting errors.
- [x] 3.3 Run `pnpm nuxi typecheck` to confirm no new TypeScript errors.
- [x] 3.4 Start the dev server and visually verify that the text renders correctly and the layout matches the requirements.
