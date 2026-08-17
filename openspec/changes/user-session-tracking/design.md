## Context

We need an accurate daily count of visitors with basic location aggregation (country and city) without relying on GA. The platform uses Nuxt Nitro, which runs on Vercel/Cloudflare, exposing standard geolocation headers (`x-vercel-ip-country`, `x-vercel-ip-city`, or `cf-ipcountry`). 

## Goals / Non-Goals

**Goals:**
- Atomically increment daily totals and location tallies in Firestore.
- Accurately determine country and city from request headers.

**Non-Goals:**
- Client-side IP fetching (we will use server headers to avoid extra latency or ad-blocker interference).

## Decisions

- **Data Model:**
  - Collection: `user_sessions`
  - Document ID: `YYYY-MM-DD` (UTC)
  - Schema:
    ```typescript
    {
      total: number;
      locations: {
        [country: string]: {
          [city: string]: number;
        }
      }
    }
    ```
- **Updates via Firestore `FieldValue.increment`:**
  - To avoid race conditions with multiple concurrent visitors, we will use `FieldValue.increment(1)` using the Firebase Admin SDK on the server.
  - Path for location updates: ``locations.${country}.${city}``. 
  - If a country or city is missing from headers, they default to "Unknown".
- **Client-Side Deduplication:**
  - A client-side plugin or `app.vue` `onMounted` hook will check `sessionStorage.getItem('session_logged')`.
  - If false/null, it fires a `POST` to `/api/analytics/session`, then sets the flag to true. This ensures one hit per browser tab session.

- **Admin UI:**
  - Route: `/admin/sessions`
  - Use `useCollection` from `vuefire` to fetch the `user_sessions` collection, sorted by document ID (Date) descending.
  - Table Structure: 
    - Col 1: Date (from doc id).
    - Col 2: Nested list/chips showing the locations breakdown.
    - Col 3: Total count.
  - Auth: Secured by the existing admin middleware.

## Risks / Trade-offs

- **Risk:** Firestore document write limits (1 write per second per document).
  - **Mitigation:** If the site exceeds 1 visitor per second globally, the daily document could become a bottleneck. If this happens, we would need to implement distributed counters. For now, a single document is sufficient.
- **Risk:** Malicious actors hitting the endpoint directly.
  - **Mitigation:** Since there's no auth, we just rely on standard Vercel rate limits.
