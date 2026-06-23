## Context

Recruiters view candidate leads in `app/pages/recruiter/leads.vue`. Inbound leads are written successfully by the Nitro backend to the `leads` collection, but are not loading on the front-end table. This issue points to:
1. **Firestore Security Rules**: The client side must be allowed to read from `leads` if authenticated as the recruiter.
2. **Firestore Composite Indexes**: The query requires a composite index on `(recruiterId, createdAt DESC)`.
3. **Data Mapping in leads.vue**: Verification that the computed `leadsData` fields align with `tableColumns` configuration.

## Goals / Non-Goals

**Goals:**
- Define correct Firestore security rules for the `leads` collection.
- Define the composite index inside `firestore.indexes.json`.
- Audit and confirm the data mapping in `app/pages/recruiter/leads.vue`.

**Non-Goals:**
- Modifying the fields written by the Nitro backend submission endpoint.

## Decisions

### Decision 1: Create/Update `firestore.rules`
We will specify read permission for recruiters on the `leads` collection based on matching auth UIDs:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leads/{leadId} {
      allow read: if request.auth != null && resource.data.recruiterId == request.auth.uid;
      allow write: if false; // written only via Admin SDK
    }
  }
}
```

### Decision 2: Create/Update `firestore.indexes.json`
We will define the index configuration:
```json
{
  "indexes": [
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recruiterId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Risks / Trade-offs

- **Deployment Syncing**: Both the security rules and composite index config must be deployed to the active Firebase project to ensure parity with local test environments.
