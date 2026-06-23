## Why

Although candidate leads are successfully submitted and saved in the Firestore `leads` collection, they do not render on the recruiter dashboard "Inbound Leads" table in `app/pages/recruiter/leads.vue`. This occurs due to missing Firestore client read permissions under Security Rules, a missing composite index required to order query results by `createdAt desc` with a `recruiterId` filter, and a potential mismatch between raw data fields and UI table columns.

## What Changes

- **Firestore Security Rules**: Update or create `firestore.rules` to permit authenticated recruiters to read their own leads documents (where `resource.data.recruiterId == request.auth.uid`).
- **Firestore Composite Indexes**: Update or create `firestore.indexes.json` to define the composite index for the `leads` collection on fields `recruiterId` (ascending) and `createdAt` (descending).
- **Leads Data Mapping Validation**: Verify and adjust the data transformation mapping in the `leadsData` computed property in `leads.vue` to ensure alignment with defined table columns.

## Capabilities

### New Capabilities
- `recruiter-leads-display`: Read and display Firestore lead documents in real time on the recruiter dashboard leads table.

### Modified Capabilities
<!-- No requirement changes to existing specs -->

## Impact

- `app/pages/recruiter/leads.vue`
- `firestore.rules`
- `firestore.indexes.json`
