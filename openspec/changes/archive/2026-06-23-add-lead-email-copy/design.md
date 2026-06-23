## Context

Recruiters track candidate lead listings in the dashboard leads view `app/pages/recruiter/leads.vue` utilizing `<AmITable>`. We will modify the table columns list to include the email field and render it with an interactive clipboard copy utility.

## Goals / Non-Goals

**Goals:**
- Include `email` column key under `tableColumns` in `leads.vue`.
- Create a slot template for `#email` containing the copy icon button.
- Integrate the clipboard copy function triggering localized system toasts.

**Non-Goals:**
- Supporting clipboard fallback methods for very old legacy browsers lacking `navigator.clipboard`.

## Decisions

### Decision 1: Table column updates
We will append the new column key:
```typescript
const tableColumns = [
  { key: 'date', label: 'Date', class: 'w-32' },
  { key: 'name', label: 'Candidate Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'role', label: 'Role Searched' },
  { key: 'location', label: 'Location' }
];
```

### Decision 2: Cell rendering and copy logic
We will render a custom template slot in `<AmITable>` and include the Copy icon:
```html
<template #email="{ value }">
  <div class="flex items-center gap-2">
    <span class="text-sm font-medium text-slate-700">{{ value }}</span>
    <button
      class="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
      @click="copyToClipboard(value)">
      <Copy class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
```
We will implement the copy method using `useSystemToast` triggers:
```typescript
import { Copy } from 'lucide-vue-next';

const copyToClipboard = async (email: string) => {
  try {
    await navigator.clipboard.writeText(email);
    showToast(
      t('recruiter.leads.toast.copy-success-title', 'Success'),
      t('recruiter.leads.toast.copy-success-message', 'Email copied to clipboard'),
      'success'
    );
  } catch (err) {
    console.error('Failed to copy lead email:', err);
  }
};
```

### Decision 3: Translation entries
We will insert localized messages in `recruiter.json` locales files:
* `recruiter.leads.toast.copy-success-title`: `"Success"`
* `recruiter.leads.toast.copy-success-message`: `"Email copied to clipboard"`
