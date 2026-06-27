## Context

When deploying the `stripe` branch to production:

1. **Logo Uploads**: Requires the declaration of `storage.rules` to allow client-side upload requests to `/recruiter_logos/{userId}/*` while blocking unauthorized writes.
2. **Pricing Reliability**: If `platform_settings/pricing` doesn't exist, checkouts fail. We will implement fallback values in `create-checkout.post.ts` and `cancel-territory.post.ts` matching the UI's default configuration.

## Goals / Non-Goals

**Goals:**

- Define `storage.rules` in the workspace root.
- Implement fallback pricing configurations in the backend endpoints to prevent runtime crashes.

**Non-Goals:**

- Altering the calculation band calculations (must still lookup matching bands).

## Decisions

### Decision 1: Create `storage.rules`

We will configure read/write permissions for logos:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recruiter_logos/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Decision 2: Pricing Fallback logic in Checkout and Cancellation Endpoints

We will define the default pricing banding inside a helper structure. If the Firestore document does not exist, the code will load this pricing data fallback instead:

```typescript
const DEFAULT_PRICING = {
  UK: {
    band1: { basic: 50, exclusive: 250 },
    band2: { basic: 30, exclusive: 150 },
    band3: { basic: 20, exclusive: 100 },
    band4: { basic: 10, exclusive: 50 },
    band5: { basic: 5, exclusive: 25 }
  },
  USA: {
    band1: { basic: 60, exclusive: 300 },
    band2: { basic: 40, exclusive: 200 },
    band3: { basic: 25, exclusive: 125 },
    band4: { basic: 15, exclusive: 75 },
    band5: { basic: 10, exclusive: 50 }
  }
};
```

And resolve using:

```typescript
const platformPricing = pricingDoc.exists ? pricingDoc.data() || {} : DEFAULT_PRICING;
```

## Risks / Trade-offs

- **None**: This is fully backwards compatible and acts strictly as a fallback.
