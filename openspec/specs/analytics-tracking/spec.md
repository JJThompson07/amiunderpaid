# Analytics Tracking

### `app/app.vue`

- **Behavior**: On client mount, check if `import.meta.dev` is true. If so, abort tracking immediately (do not log local development sessions).
- **Behavior**: If not in dev, check if `sessionStorage.getItem('session_logged')` exists.
- **Behavior**: If it does not exist, send a non-blocking `POST` request to `/api/analytics/session`.
- **Behavior**: Set `sessionStorage.setItem('session_logged', 'true')` immediately to prevent duplicates on rapid reloads.

### `server/api/analytics/session.post.ts`

- **Behavior**: Read the `x-vercel-ip-country` header (fallback `cf-ipcountry`) for the country. Default to `Unknown`.
- **Behavior**: Read the `x-vercel-ip-city` header for the city. Default to `Unknown`.
- **Behavior**: Construct the current UTC date string in `YYYY-MM-DD` format.
- **Behavior**: Use the Firebase Admin SDK (`getFirestore()`) to update the `user_sessions` collection at document `YYYY-MM-DD`.
- **Behavior**: Perform a `set` operation with `{ merge: true }`.
- **Behavior**: The update payload must include `total: FieldValue.increment(1)`.
- **Behavior**: The update payload must include a computed path string `[\`locations.\${country}.\${city}\`]: FieldValue.increment(1)` to dynamically update the nested tally.
- **Behavior**: `await` the Firestore write and return `200 OK`.

### `server/api/analytics/tests/session.spec.ts`

- **Behavior**: Mock the Firebase Admin SDK and test that correct headers parse to the right country/city.
- **Behavior**: Test that missing headers result in `Unknown` for country and city.

### `app/pages/admin/sessions.vue`

- **Behavior**: Wrap in the admin layout and ensure middleware restricts access.
- **Behavior**: Query the `user_sessions` collection.
- **Behavior**: Render a table with three columns: Date, Location Breakdown, and Total.
- **Behavior**: The Location Breakdown column should iterate through the nested `locations` object and display the country and its cities with their respective tallies (e.g. `UK: London: 42, Manchester: 25`).
