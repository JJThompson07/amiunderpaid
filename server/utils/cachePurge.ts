import type { Firestore, Query } from 'firebase-admin/firestore';

export type PurgeOptions = {
  now?: Date;
};

export type PurgeSummary = {
  deletedJobs: number;
  deletedDistributions: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Legacy adzuna_jobs_cache/adzuna_distribution_cache docs predate the
// expiresAt field. Their longest possible TTL (primary-provider cacheDays)
// was 120 days, so timestamp < now-120d safely captures every legacy entry
// without needing a compound query.
const LEGACY_CACHE_TTL_DAYS = 120;

const BATCH_LIMIT = 500;

const daysAgo = (now: Date, days: number): Date => new Date(now.getTime() - days * MS_PER_DAY);

// Deletes every document matched by `query`, BATCH_LIMIT docs at a time,
// looping until the query returns no more results. There's no cursor to
// advance here -- re-running the same query after each commit is what
// naturally advances through the matching set, since each commit removes
// the docs the next `.get()` would otherwise return again.
const deleteAllMatching = async (db: Firestore, query: Query): Promise<number> => {
  let deletedCount = 0;
  let snapshot = await query.limit(BATCH_LIMIT).get();

  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deletedCount += snapshot.size;

    snapshot = await query.limit(BATCH_LIMIT).get();
  }

  return deletedCount;
};

// Purges expired/legacy entries from one market-data cache collection.
// Two sequential queries rather than one compound OR: modern docs are caught
// by `expiresAt < now`, and since those are deleted first, the legacy
// `timestamp < now-120d` pass can never re-match (and thus never
// double-count) a doc the first pass already removed.
const purgeCacheCollection = async (
  db: Firestore,
  collectionName: string,
  now: Date
): Promise<number> => {
  const collectionRef = db.collection(collectionName);

  const expiredCount = await deleteAllMatching(db, collectionRef.where('expiresAt', '<', now));

  const legacyCount = await deleteAllMatching(
    db,
    collectionRef.where('timestamp', '<', daysAgo(now, LEGACY_CACHE_TTL_DAYS))
  );

  return expiredCount + legacyCount;
};

export const purgeExpiredCache = async (
  db: Firestore = useAdminFirestore(),
  options: PurgeOptions = {}
): Promise<PurgeSummary> => {
  const now = options.now ?? new Date();

  const deletedJobs = await purgeCacheCollection(db, 'adzuna_jobs_cache', now);
  const deletedDistributions = await purgeCacheCollection(db, 'adzuna_distribution_cache', now);

  return {
    deletedJobs,
    deletedDistributions
  };
};
