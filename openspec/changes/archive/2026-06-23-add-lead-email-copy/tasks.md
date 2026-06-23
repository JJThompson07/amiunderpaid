## 1. Localization Strings Update

- [x] 1.1 Add `copy-success-title` and `copy-success-message` translations under `recruiter.leads.toast` inside `i18n/locales/en-GB/recruiter.json`.
- [x] 1.2 Add the identical translations under `recruiter.leads.toast` inside `i18n/locales/en-US/recruiter.json`.

## 2. Leads Page Frontend Update

- [x] 2.1 Import `Copy` from `lucide-vue-next` in `app/pages/recruiter/leads.vue`.
- [x] 2.2 Add `{ key: 'email', label: 'Email Address' }` to the `tableColumns` array in `app/pages/recruiter/leads.vue`.
- [x] 2.3 Implement `copyToClipboard` function using `navigator.clipboard.writeText()` and `showToast` in `app/pages/recruiter/leads.vue`.
- [x] 2.4 Add the custom `<template #email="{ value }">` slot to the `<AmITable>` instance in `app/pages/recruiter/leads.vue`.
- [x] 2.5 Run typecheck commands to ensure no TypeScript compile or import errors are introduced.

## 3. Local Verification

- [ ] 3.1 Run the local development server.
- [ ] 3.2 Confirm that candidate emails render in the leads list, clicking the copy button copies the email to clipboard, and triggers a success toast.
