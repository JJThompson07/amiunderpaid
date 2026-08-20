// One-off migration: copies every `territory_claims` document into
// `territory_category_owners` under the same `{territoryId}_{categoryValue}`
// doc ID. Part of fix-territory-locks-not-read — see openspec/changes/
// fix-territory-locks-not-read/tasks.md, section 4.
//
// `territory_claims` stopped being written after the Phase 4 denormalisation,
// so in the steady state there should be no overlap with `territory_category_owners`.
// The merge logic below only exists to protect against a document existing in
// both (e.g. a fresh post-Phase-4 purchase for a key that also has stale
// pre-Phase-4 data): the target's `takenExclusiveMonths`/`basicOwners` win per
// key, and only source months absent from the target are added, so a newer
// live write can never be clobbered by a stale migrated one.
//
// Usage:
//   pnpm tsx scripts/migrate-territory-claims.ts --dry-run   (report only, no writes)
//   pnpm tsx scripts/migrate-territory-claims.ts             (writes to territory_category_owners)
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

type ClaimDoc = {
  territoryId?: number;
  categoryValue?: string;
  takenExclusiveMonths?: Record<string, string>;
  basicOwners?: string[];
  [key: string]: unknown;
};

async function migrate(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccountBase64) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in .env');
    process.exit(1);
  }

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  }

  const db = getFirestore();

  console.log(`Reading source collection 'territory_claims'...`);
  const sourceSnap = await db.collection('territory_claims').get();
  console.log(`Found ${sourceSnap.size} document(s) in territory_claims.`);

  if (sourceSnap.empty) {
    console.log('Nothing to migrate.');
    return;
  }

  let created = 0;
  let merged = 0;
  let unchanged = 0;

  for (const doc of sourceSnap.docs) {
    const sourceData = doc.data() as ClaimDoc;
    const targetRef = db.collection('territory_category_owners').doc(doc.id);
    const targetSnap = await targetRef.get();

    if (!targetSnap.exists) {
      created++;
      console.log(
        `[${dryRun ? 'DRY-RUN' : 'CREATE'}] ${doc.id}: no existing target, will copy as-is.`
      );
      if (!dryRun) {
        await targetRef.set(sourceData);
      }
      continue;
    }

    const targetData = targetSnap.data() as ClaimDoc;

    // Target wins on every key already present; only add source months/owners
    // the target doesn't already have.
    const mergedMonths: Record<string, string> = { ...(sourceData.takenExclusiveMonths || {}) };
    for (const [month, owner] of Object.entries(targetData.takenExclusiveMonths || {})) {
      mergedMonths[month] = owner; // target overwrites any source value for the same month
    }

    const mergedBasicOwners = Array.from(
      new Set([...(sourceData.basicOwners || []), ...(targetData.basicOwners || [])])
    );

    // Merging only ever adds keys the target doesn't already have (target always
    // wins on overlap), so a plain key-count comparison is sufficient here and
    // avoids false positives from JSON.stringify being sensitive to key order.
    const targetMonthCount = Object.keys(targetData.takenExclusiveMonths || {}).length;
    const monthsChanged = Object.keys(mergedMonths).length > targetMonthCount;
    const ownersChanged = mergedBasicOwners.length !== (targetData.basicOwners || []).length;

    if (!monthsChanged && !ownersChanged) {
      unchanged++;
      console.log(`[SKIP] ${doc.id}: target already has equivalent or newer data.`);
      continue;
    }

    merged++;
    console.log(
      `[${dryRun ? 'DRY-RUN' : 'MERGE'}] ${doc.id}: adding source-only months/owners not present in target.`
    );
    if (!dryRun) {
      await targetRef.set(
        { takenExclusiveMonths: mergedMonths, basicOwners: mergedBasicOwners },
        { merge: true }
      );
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Source documents:      ${sourceSnap.size}`);
  console.log(`Created in target:     ${created}`);
  console.log(`Merged into target:    ${merged}`);
  console.log(`Unchanged (no-op):     ${unchanged}`);
  console.log(dryRun ? '\nDry run only — no writes were made.' : '\nMigration complete.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
