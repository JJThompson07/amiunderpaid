## Overview

This architectural change transitions an overly specific admin page (`jobs-cache`) into a highly extensible command center (`admin-actions`). It introduces a reactive logging UI that significantly improves observability when running manual server tasks.

## Key Decisions

**1. Component Structure for Action Log**

- _Decision_: We will implement a `ref<LogMessage[]>` where `LogMessage = { id: string, timestamp: string, text: string, type: 'info' | 'success' | 'error' }`.
- _Rationale_: A structured object array allows us to color-code the terminal output (e.g., green for success, red for errors) and automatically generate human-readable timestamps without hardcoding strings.

**2. Auto-Scrolling Terminal Window**

- _Decision_: A dedicated `<div>` styled with Tailwind to mimic a terminal (`bg-slate-900 text-slate-300 font-mono text-sm`), using a `watch` on the log array combined with `nextTick` to adjust the `scrollTop` property.
- _Rationale_: This provides a highly authentic and satisfying feedback loop for admins, preventing them from needing to open browser DevTools to verify success.

**3. Abstracting Action Execution**

- _Decision_: We will wrap API calls in a generic helper function `executeAction(name: string, apiCall: () => Promise<string>)` within the script setup.
- _Rationale_: This ensures every action automatically manages its own loading state and strictly adheres to the standard logging protocol (starting message -> await -> success/error message) without duplicating boilerplate try/catch blocks across every button.

**4. Renaming & Routing**

- _Decision_: Rename the file to `admin-actions.vue`.
- _Rationale_: Nuxt automatically registers the new route `/admin/admin-actions`. We will need to update the admin sidebar navigation to point to this new route and remove the old `/admin/jobs-cache` link.
