## Context

Currently, the recruiter section of the platform allows public, self-service registration. Anyone can register as a recruiter and start claiming territories. This proposal restricts recruiter registration. Recruitment accounts will be invite-only:

1. Recruiters submit a name and email to "Request Access."
2. Admins review pending access requests inside the Admin dashboard.
3. Admins either reject the request or accept it. Accepting generates a Firebase Auth account with a temporary one-time password (OTP) and sends a notification email.
4. Newly created recruiters log in and are prompted to change their password in their profile before continuing.

## Goals / Non-Goals

**Goals:**

- Disable self-service recruiter signup.
- Create a "Request Access" submission form/modal on the recruiter login page.
- Track pending applications in Firestore under `users` with `status: 'requested'`.
- Enable admins to **Accept** or **Reject** applications from the admin recruiters management interface.
- Programmatically create Auth accounts with secure temporary passwords and trigger transactional notification emails.
- Implement a password-change form in the recruiter profile using secure client-side Firebase Auth re-authentication.

**Non-Goals:**

- Creating a separate database collection for pending applications (we will keep all recruiter records in `users` to simplify querying and ID management).
- Supporting automated password expiration (passwords will remain active until manually changed by the recruiter).

## Decisions

### Decision 1: Unified `users` Collection vs Separate `access_requests` Collection

- **Choice:** Store pending requests directly in the `users` collection with `role: 'recruiter'` and `status: 'requested'`.
- **Rationale:** Storing them in `users` means the admin recruiters endpoint `/api/admin/recruiters` can query them all in one operation, rather than running multiple queries and stitching results.
- **Alternative considered:** Storing requests in an `access_requests` collection. This was rejected because we would need to copy data over and map relationships once approved. Storing everything in `users` is cleaner.

### Decision 2: ID Alignment on Account Creation

- **Choice:** Generate a Firestore document ID for the pending recruiter. On acceptance, pass this ID to `getAuth().createUser({ uid: recruiterDocId, ... })`.
- **Rationale:** This guarantees the Firestore document and Firebase Auth UID match perfectly, preserving the project's data architecture where Firestore recruiter documents are keyed by Auth UID.
- **Alternative considered:** Creating the Auth account first, getting the generated UID, and then creating/moving the Firestore document. Rejected because it requires mutating or recreating documents.

### Decision 3: Client-Side Re-authentication for Password Change

- **Choice:** Use Firebase client SDK re-authentication via `reauthenticateWithCredential`.
- **Rationale:** Firebase Auth does not store passwords in Firestore. To verify the "current password" entered by the user, we must re-authenticate the current user session before calling `updatePassword`.
- **Alternative considered:** Sending the password to a server-side endpoint. Rejected as it is less secure, exposes plaintext passwords over APIs, and is not standard practice for Firebase Auth.

## Risks / Trade-offs

- **Risk:** Email delivery failure (e.g. SMTP issues) prevents the recruiter from receiving their OTP.
  - **Mitigation:** The admin list will show a "Resend OTP / Invite" option for pending users, which generates a new password and triggers a new email.
- **Risk:** Recruiters bypass the forced password change redirect.
  - **Mitigation:** Recruiter middleware (`middleware/recruiters.ts`) will check if the user profile has `requiresPasswordChange: true` and force-redirect them to the profile page until they update their password.
