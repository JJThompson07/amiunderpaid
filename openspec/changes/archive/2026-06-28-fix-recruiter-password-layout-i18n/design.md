## Approach

1. **i18n Standardization**: We will move the `passwordChange` object from `i18n/locales/en-GB/recruiter.json` and `en-US/recruiter.json` into the corresponding `account.json` files to consolidate account-related translations.
2. **Component Update**:
   - `app/pages/recruiter/profile.vue`: Update the translation keys from `passwordChange.*` to `account.passwordChange.*`.
   - `app/pages/auth/reset-password.vue`: Ensure `account.form.new-password` and other keys are resolving correctly, possibly by using `useI18n({ useScope: 'global' })` or fixing any typo in the translation structure.
3. **Layout Refactor**:
   - Change the `<div class="grid md:grid-cols-3 gap-4">` in `profile.vue` to a `<div class="flex flex-col gap-6 max-w-xl">`.
   - Group the "New Password" and "Confirm Password" fields together.
   - Insert an `<hr class="border-slate-100" />` or similar visual divider after the `currentPassword` field.
