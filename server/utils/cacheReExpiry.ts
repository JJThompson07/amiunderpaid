import type { CollectionReference, Firestore, Query } from 'firebase-admin/firestore';

export type ReExpireCategoryCacheParams = {
  categoryTag: string;
  countryCode: 'gb' | 'us';
  cacheDays: number;
  now?: Date;
};

export type ReExpireCategoryCacheSummary = {
  updatedJobs: number;
  updatedDistributions: number;
};

const BATCH_LIMIT = 500;

const computeExpiresAt = (now: Date, cacheDays: number): Date => {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + cacheDays);
  return expiresAt;
};

// Re-expires every document matching (categoryTag, country) in `collectionRef`,
// BATCH_LIMIT docs per commit. Unlike cachePurge.ts's delete pass, updating a
// doc's expiresAt does NOT remove it from this query's own match set (the
// query filters on categoryTag/country, not expiresAt), so re-running the
// same query would re-match and re-update the same page forever. Paginating
// by a stable `__name__` (document ID) cursor instead advances through the
// full match set exactly once regardless of the update.
const reExpireAllMatching = async (
  db: Firestore,
  collectionRef: CollectionReference,
  categoryTag: string,
  countryCode: string,
  expiresAt: Date
): Promise<number> => {
  let updatedCount = 0;
  const baseQuery = (): Query =>
    collectionRef
      .where('categoryTag', '==', categoryTag)
      .where('searchParams.country', '==', countryCode)
      .orderBy('__name__')
      .limit(BATCH_LIMIT);

  let query: Query = baseQuery();
  let snapshot = await query.get();

  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.update(doc.ref, { expiresAt }));
    await batch.commit();
    updatedCount += snapshot.size;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    query = baseQuery().startAfter(lastDoc);
    snapshot = await query.get();
  }

  return updatedCount;
};

// Recomputes expiresAt on already-cached adzuna_jobs_cache /
// adzuna_distribution_cache documents for one category+country, so an admin
// lowering a category's cacheDays at /admin/adzuna takes effect on results
// already cached, not just future cache writes.
export const reExpireCategoryCache = async (
  db: Firestore,
  { categoryTag, countryCode, cacheDays, now = new Date() }: ReExpireCategoryCacheParams
): Promise<ReExpireCategoryCacheSummary> => {
  const expiresAt = computeExpiresAt(now, cacheDays);

  const [updatedJobs, updatedDistributions] = await Promise.all([
    reExpireAllMatching(
      db,
      db.collection('adzuna_jobs_cache'),
      categoryTag,
      countryCode,
      expiresAt
    ),
    reExpireAllMatching(
      db,
      db.collection('adzuna_distribution_cache'),
      categoryTag,
      countryCode,
      expiresAt
    )
  ]);

  return { updatedJobs, updatedDistributions };
};
