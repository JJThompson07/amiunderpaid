## Why

Google Analytics is not reliable for accurate user session tracking. The platform needs a robust, homegrown session counter to accurately track the total number of visitors per day and their geographic locations (country and city) to evaluate platform reach and usage effectively.

## What Changes

Implement a new `user_sessions` collection in Firestore. 
- Each document represents a single day (e.g., `YYYY-MM-DD`).
- Contains a `total` field incremented for every session.
- Contains a `locations` object that tallies sessions by Country -> City.
- Unknown locations will be bucketed into an "unknown" tally.

## Scope

- Create a new server API endpoint (e.g., `/api/analytics/session.post.ts`) to handle session increments.
- Utilize Nuxt Nitro headers (e.g., from Vercel/Cloudflare edge) to infer the user's country and city.
- Use Firestore `FieldValue.increment(1)` to atomically update the daily document.
- Trigger this endpoint once per client session (e.g., in `app.vue` mounted hook, gated by a `sessionStorage` flag to prevent duplicate counting on page reloads).
- Create a new secure admin page (e.g., `/admin/sessions`) to display the data in a table format (Date, Location Breakdown, Daily Total).

## Non-Goals

- No tracking individual user identities, IP addresses, or PII (fully anonymous tallies).
- No complex session duration tracking; just a simple "visitor arrived" tally.
