## 1. Server API

- [x] 1.1 Create `server/api/analytics/session.post.ts` to read geolocation headers and perform the Firestore `set` with `FieldValue.increment(1)` for total and nested locations.
- [x] 1.2 Create `server/api/analytics/tests/session.spec.ts` to test the API endpoint with various headers (and missing headers).

## 2. Client Integration

- [x] 2.1 Update `app/app.vue` `onMounted` hook to check `sessionStorage` and fire the `POST` request to `/api/analytics/session`.

## 3. Admin Dashboard

- [x] 3.1 Create `app/pages/admin/sessions.vue` to fetch the `user_sessions` collection and render it in a data table showing Date, Location breakdown, and Total.

## 4. Verification

- [x] 4.1 Run local verification `pnpm vitest run` and `pnpm test:e2e` to ensure all tests pass and coverage is maintained above 80%.
