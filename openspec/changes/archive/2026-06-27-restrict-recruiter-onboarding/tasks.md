## 1. Disable Public Registration & Implement Request Access Form

- [x] 1.1 Update `app/pages/recruiter/login.vue` to set `:allow-signup="false"` on the `<AmIFormLogin>` component.
- [x] 1.2 Add a "Request Access" link/button inside the `app/pages/recruiter/login.vue` page near the login form.
- [x] 1.3 Create a new modal component `app/components/Modal/RequestAccess.vue` featuring fields for `Name` (which becomes `agency_name`) and `Email`.
- [x] 1.4 Create a Nuxt backend route `/api/user/recruiter/request-access.post.ts` to handle and validate request submissions, writing them to the Firestore `users` collection with `role: 'recruiter'`, `status: 'requested'`, and `createdAt`.
- [x] 1.5 Add i18n translation keys for the Request Access modal headers, labels, and feedback messages in `i18n/locales/en-GB/recruiter.json` and `en-US/recruiter.json`.

## 2. Update Admin Dashboard UI & Endpoints

- [x] 2.1 Update `server/api/admin/recruiters/index.get.ts` to map the `status` from Firestore (default to `'active'` if missing or `'requested'`) and safely skip fetching Auth records for recruiters who do not yet have a Firebase Auth account.
- [x] 2.2 Update `app/pages/admin/recruiters.vue` table columns to display the new "Requested Access" status.
- [x] 2.3 Update the status slot in `app/pages/admin/recruiters.vue` to render visual status badges for `'requested'`, `'active'`, and `'rejected'`.
- [x] 2.4 Add **Accept** and **Reject** buttons to the recruiters table for rows containing a `'requested'` status.
- [x] 2.5 Implement a backend route `/api/admin/recruiters/accept.post.ts` that:
  - Generates a random alphanumeric one-time password (OTP).
  - Creates a Firebase Auth user using `getAuth().createUser` with UID matching the Firestore doc ID.
  - Updates the Firestore recruiter user doc status to `'active'` and adds `requiresPasswordChange: true`.
  - Queues an invitation email inside the Firestore `mail` collection containing the credentials.
- [x] 2.6 Implement a backend route `/api/admin/recruiters/reject.post.ts` that updates the Firestore recruiter user doc status to `'rejected'` (or deletes it).
- [x] 2.7 Hook up Accept and Reject clicks in `app/pages/admin/recruiters.vue` to trigger requests to the new admin endpoints, showing loading states and reloading the table on success.

## 3. Forced Password Reset Middleware

- [x] 3.1 Update `app/middleware/recruiters.ts` to retrieve `requiresPasswordChange` from the Firestore user document.
- [x] 3.2 Add a check in `app/middleware/recruiters.ts` to force-redirect recruiters with `requiresPasswordChange === true` to `/recruiter/profile` if they attempt to navigate to any other recruiter page.

## 4. Recruiter Profile Password Update Form

- [x] 4.1 Update `app/pages/recruiter/profile.vue` to add a new "Change Password" card/section with inputs for Current Password, New Password, and Confirm Password.
- [x] 4.2 Add client-side logic to `app/pages/recruiter/profile.vue` using Firebase Client SDK to re-authenticate the recruiter session and update the password.
- [x] 4.3 Update the user profile document in Firestore to set `requiresPasswordChange: false` upon successful password update.
- [x] 4.4 Add translation labels and toast message keys for the password update form in `i18n/locales/en-GB/recruiter.json` and `en-US/recruiter.json`.

## 5. Recruiter Navigation Logout Button

- [x] 5.1 Update `app/components/AmI/NavBar.vue` to import and call `useRecruiterAuth()`'s `logout()` function.
- [x] 5.2 Add support for action-based links (like `action: 'logout'`) in `app/components/AmI/NavBar.vue`'s template and check if it triggers on click.
- [x] 5.3 Add the "Log Out" item to `recruiterLinks` computed property at the end.
