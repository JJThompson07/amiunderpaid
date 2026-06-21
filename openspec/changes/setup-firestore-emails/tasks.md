## 1. Firebase Extension Installation & Configuration

- [ ] 1.1 Open the [Firebase Console](https://console.firebase.google.com) and navigate to the project dashboard.
- [ ] 1.2 Go to **Extensions** in the left sidebar, search for "Trigger Email from Firestore", and click **Install**.
- [ ] 1.3 Configure the following properties during installation:
  - **SMTP Connection URI**: e.g., `smtps://username:password@smtp.example.com:465` (use your actual SMTP provider settings).
  - **Email documents collection**: `mail`
  - **Default sender name & address**: E.g. `AmIUnderpaid Team <noreply@amiunderpaid.com>` (Ensure the sender domain matches your SMTP SPF/DKIM configured domains to prevent spam flagging).
  - **Users collection**: Leave empty or set to `users`.
  - **Templates collection**: Leave empty.
- [ ] 1.4 Complete the installation and verify the extension status shows "Active" in the Firebase Console.

## 2. Server Code Integration (Plaintext Fallback)

- [x] 2.1 Open `server/api/user/leads/submit.post.ts` and locate the recruiter notification email write action.
- [x] 2.2 Add a plaintext `text` field to the recruiter's `message` object with a clean layout matching the HTML content.
- [x] 2.3 Locate the candidate confirmation email write action in the same file.
- [x] 2.4 Add a plaintext `text` field to the candidate's `message` object with a matching layout.
- [x] 2.5 Run typechecks and linting to ensure no compile errors are introduced.

## 3. Local Verification & Logging

- [ ] 3.1 Run the local Nuxt development server.
- [ ] 3.2 Submit a lead using the recruiter leads UI.
- [ ] 3.3 Verify a new document is written to the `mail` collection in the local Firestore emulator or Firebase console.
- [ ] 3.4 Inspect the `mail` document and check that the extension successfully appended the `delivery` field containing `state: "SUCCESS"`.
- [ ] 3.5 Check the recipient inboxes (recruiter and candidate) to verify the formatting of both HTML and plaintext fallbacks.
