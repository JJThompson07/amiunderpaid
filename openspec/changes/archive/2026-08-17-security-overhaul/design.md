## Context

See `proposal.md` for motivation. Currently, the Nuxt Nitro API relies on route-by-route opt-in authentication, which has resulted in several unprotected endpoints. Furthermore, authorization (admin checking) relies on a client-writable Firestore document field (`role`) rather than secure cryptographic claims.

## Goals / Non-Goals

**Goals:**
- Secure all administrative endpoints behind a robust, opt-out middleware wall.
- Ensure Firestore data cannot be maliciously modified or wiped by clients.
- Fix concurrency issues in the Stripe webhook that result in double-sold territories.

**Non-Goals:**
- Refactoring the entire Nuxt architecture or migrating away from Vuefire.
- Changing the client-side user experience or public UI behavior.

## Decisions

### 1. Nitro Middleware for Admin Routes
**Decision:** Create `server/middleware/admin-guard.ts` to intercept any path starting with `/api/admin/`.
**Rationale:** An opt-out model is far safer than an opt-in model. Any future admin endpoint created by a developer will be secure by default without requiring them to remember to add `await verifyAdmin(event)`.
**Alternative:** Continue adding `await verifyAdmin()` to every route. Rejected because it is error-prone and responsible for the current vulnerabilities.

### 2. Firebase Custom Claims for Authorization
**Decision:** Modify `verifyAdmin()` to check `decodedToken.admin === true` instead of merely validating the token signature.
**Rationale:** Relying on `users/{uid}.role` requires a Firestore read per API request and is vulnerable if the document is client-writable. Custom Claims are cryptographically signed into the auth token and require zero database reads.
**Alternative:** Read the `users` document securely on the server. Rejected due to latency and Firestore read costs.

### 3. Server-Side ID Minting for Search Tracking
**Decision:** Update `/api/user/track-search` to use `db.collection().add()` to mint a new document ID and return it to the client.
**Rationale:** Accepting a client-provided ID for `set()` allows an attacker to overwrite arbitrary documents (including targeting other collections via path traversal like `../users/abc`).

### 4. Firestore Rules
**Decision:** Introduce `firestore.rules` at the repository root.
**Rationale:** Securing the database at the Firebase layer ensures that even if the Nuxt API is bypassed or misconfigured, data cannot be arbitrarily read or written from the client SDKs.

## Risks / Trade-offs

- **[Risk] Custom Claim Migration:** Existing admins do not have the `admin: true` custom claim, so they will be locked out.
  - **Mitigation:** Create a one-time migration script (e.g., `server/api/admin/migrate-claims.ts` protected by a secret or run locally) to assign the custom claim to users who currently have `role: 'admin'` in Firestore.
- **[Risk] Search Tracking ID Changes:** `app/composables/useSearchTracking.ts` currently generates a UUID client-side.
  - **Mitigation:** Update the composable to wait for the server response to capture the true Firestore ID for subsequent `update-search` calls.
