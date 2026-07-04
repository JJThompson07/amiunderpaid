## Why

Currently, candidate email addresses are mapped in the leads backend data but are not rendered as a column in the "Inbound Leads" table on the recruiter dashboard page `app/pages/recruiter/leads.vue`. Displaying candidate emails and providing a one-click clipboard copy feature improves usability and recruiter workflow efficiency.

## What Changes

- **Leads Table Columns**: Add a new column for `Email` in `tableColumns` array inside `leads.vue`.
- **Custom Cell Template**: Add a slot template for `#email` in `leads.vue` that renders the candidate's email next to a copy button using the `Copy` icon from `lucide-vue-next`.
- **Clipboard Copy Action**: Implement a `copyToClipboard` method utilizing `navigator.clipboard.writeText()`.
- **System Toast Feedback**: Invoke `showToast` from `useSystemToast()` to show a success toast message upon copying.
- **Localization Files**: Add translation key entries to `i18n/locales/en-GB/recruiter.json` and `en-US/recruiter.json` for copy feedback.

## Capabilities

### New Capabilities

- `recruiter-leads-email-display`: Display candidate email address and support clipboard copy actions with interactive feedback inside the recruiter leads dashboard.

### Modified Capabilities

<!-- No requirement changes to existing specs -->
