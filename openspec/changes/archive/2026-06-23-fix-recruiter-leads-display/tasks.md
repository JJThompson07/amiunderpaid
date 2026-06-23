## 1. Firebase Rules and Configuration

- [x] 1.1 Create or update `firestore.rules` in the workspace root.
- [x] 1.2 Add rule logic to the `leads` collection blocking client-side write access, and granting read permissions if `resource.data.recruiterId == request.auth.uid`.
- [x] 1.3 Create or update `firestore.indexes.json` in the workspace root.
- [x] 1.4 Configure the composite index for the `leads` collection: `recruiterId` (ascending) and `createdAt` (descending).

## 2. Frontend Mapping & Audit

- [x] 2.1 Audit the `tableColumns` keys in `app/pages/recruiter/leads.vue` (`date`, `name`, `role`, `location`).
- [x] 2.2 Verify the `leadsData` computed property in `app/pages/recruiter/leads.vue` returns objects with identical property keys (`date`, `name`, `role`, `location`).

## 3. Local Verification

- [x] 3.1 Run the local development server and Firebase Emulator.
- [x] 3.2 Verify that the recruiter leads table dynamically displays inbound leads and does not produce Firestore indexing or permission errors in the browser console.
