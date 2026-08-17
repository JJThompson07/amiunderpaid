- [x] 1.1 Denormalize `users` into a new `territory_category_owners` collection. Update `server/api/user/search/recruiter-card.get.ts` to perform a single `.doc(key).get()` rather than pulling all recruiters.
- [x] 1.2 In `server/routes/sitemap.xml.ts`, apply `.where('country', '==', tenant)` _before_ reading, and add `'/sitemap.xml': { swr: 86400 }` to `nuxt.config.ts`.
- [x] 1.3 In `app/pages/recruiter/leads.vue`, update the `useCollection` query to include `limit(50)` and implement cursor pagination.
- [x] 1.4 In `server/api/admin/search-logs.get.ts`, replace `.offset()` with `startAfter()` cursors, and transition search logic to Algolia.

## 2. Nitro Caching & Payloads

- [x] 2.1 In `app/composables/useLocationEngine.ts`, ensure `allRegionalData` and `allRegionalMicroData` are stripped out and not returned to `useAsyncData`, preventing hydration bloat.
- [x] 2.2 In `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`, wrap the external provider calls in a Nitro `cachedFunction` keyed on the existing `cacheKey` to prevent concurrent stampedes.
- [x] 2.3 Reduce the default `cacheDays` in the market-data endpoints from 120 to a more realistic window (e.g., 30 days). Surface a "Data as of" indicator in the UI.
