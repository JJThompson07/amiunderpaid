import { FieldValue } from 'firebase-admin/firestore';
import {
  chunkForRateLimit,
  countCategoryLookups,
  formatHistoryMonths,
  lastCompleteMonth
} from './adzunaHistory';
import { invalidateIndustryTrendsCache } from './industryTrendsCache';
import type { HistoryPoint } from '~~/shared/utils/market-data';

type AdzunaHistoryResponse = {
  month?: Record<string, number>;
};

type AdzunaCategoriesResponse = {
  results?: { label?: string; tag?: string }[];
};

export type SyncOutcome = {
  categoryTag: string;
  country: string;
  status: 'ok' | 'error';
  error?: string;
  label?: string;
  // The newest data point written this run (monthly delta) or backfilled
  // (12-month backfill) -- omitted when Adzuna returned no history months to
  // write. Lets callers (e.g. the cron's summary email) report what new data
  // actually landed, not just a pass/fail count.
  latestMonth?: string;
  latestAverage?: number;
  // True when the Adzuna call was skipped entirely because the stored doc
  // already had the most recent complete month (see the pre-check in
  // syncOne). Lets callers distinguish "already fresh, nothing to do" from a
  // genuine no-op caused by Adzuna returning no data.
  skipped?: boolean;
};

export type SyncSummary = {
  success: true;
  months: number;
  synced: number;
  failed: number;
  results: SyncOutcome[];
};

// Adzuna's documented limit is 25 requests/minute (confirmed by Adzuna
// support). Batches of 20 leave a safety margin, paced one batch per minute
// -- this also covers the 2 category-label calls made just before the first
// history batch, since 2 + 20 = 22 still stays under 25.
const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// This app is strictly dual-tenant (AmIUnderpaid/UK, BenchmarkMyRole/US) --
// the sync always covers exactly these two countries, independent of which
// countries happen to appear in adzuna_jobs_cache.
const TRACKED_COUNTRIES = ['gb', 'us'] as const;

// 429 is Adzuna's own rate-limit response; 503 ("Service Temporarily
// Unavailable") shows up from Adzuna under the same throttling pressure --
// confirmed live in a single production cron run where 15 categories failed:
// 10 were 503 and only 5 were 429. Both mean "retry later", not "this
// request is broken", so both get the same backoff treatment below.
const isRetryableAdzunaError = (e: unknown): boolean => {
  const status =
    (e as { response?: { status?: number }; statusCode?: number })?.response?.status ??
    (e as { statusCode?: number })?.statusCode;
  return status === 429 || status === 503;
};

// Two-stage backoff, on top of the batch pacing below. The first retry (10s)
// is defense in depth for the case where Adzuna's rate-limit window doesn't
// align exactly with our batch boundaries (confirmed live: a 429'd call
// succeeded after just a ~10s wait). But if the *entire* batch collided with
// the limit (e.g. quota was already partly consumed before this run
// started), a 10s wait isn't enough -- Adzuna counts per-minute, so the
// quota isn't guaranteed to have cleared until a full window has elapsed.
// The second retry waits out a full RATE_LIMIT_WINDOW_MS to cover that case
// instead of giving up and leaving the category unsynced until the next
// scheduled run.
const RETRY_DELAYS_MS = [10_000, RATE_LIMIT_WINDOW_MS];

const fetchWithRetry = async <T>(
  url: string,
  params: Record<string, unknown>,
  attempt = 0
): Promise<T> => {
  try {
    return await $fetch<T>(url, { params });
  } catch (e) {
    if (isRetryableAdzunaError(e) && attempt < RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      return fetchWithRetry<T>(url, params, attempt + 1);
    }
    throw e;
  }
};

// ofetch embeds the full request URL -- including the app_id/app_key query
// params, since that's how Adzuna's API accepts credentials -- in its thrown
// error message (confirmed live: a real 503 error read
// "...?app_id=<real id>&app_key=<real key>&category=...: 503 Service
// Temporarily Unavailable"). That message ends up in the admin endpoint's
// response, the cron's console.error log, and the Resend summary email --
// none of which should carry live API credentials. Strip them before this
// value goes anywhere.
const redactAdzunaCredentials = (message: string): string =>
  message.replace(/\b(app_id|app_key)=[^&"]+/g, '$1=REDACTED');

// One call per country (not per category) to resolve human-readable labels
// (e.g. "IT Jobs" for "it-jobs") for the UI's toggle pills and chart legend
// -- and, since this is Adzuna's own authoritative category taxonomy for the
// country, this Map's keys are also the set of categories runIndustryTrendsSync
// syncs (see below). A failure here must propagate rather than being
// swallowed into an empty Map: an empty Map used to only cost display
// labels, but now it would silently skip every category for this country.
const fetchCategoryLabels = async (
  country: string,
  appId: string,
  appKey: string
): Promise<Map<string, string>> => {
  const raw = await fetchWithRetry<AdzunaCategoriesResponse>(
    `https://api.adzuna.com/v1/api/jobs/${country}/categories`,
    { app_id: appId, app_key: appKey, 'content-type': 'application/json' }
  );
  const labels = new Map<string, string>();
  for (const entry of raw?.results || []) {
    // A missing `label` still gets a Map entry (falling back to the tag
    // itself) because this Map's keys now drive which categories get
    // synced -- dropping the entry here would silently skip syncing a
    // real category just because Adzuna didn't send a display label for it.
    if (entry.tag) {
      labels.set(entry.tag, entry.label || entry.tag);
    }
  }
  return labels;
};

const syncOne = async (
  pair: { categoryTag: string; country: string },
  months: number,
  appId: string,
  appKey: string,
  categoryLabels: Map<string, string>,
  lookupCount: number,
  now: Date
): Promise<SyncOutcome> => {
  const { categoryTag, country } = pair;
  const label = categoryLabels.get(categoryTag) || categoryTag;
  const db = useAdminFirestore();
  const docRef = db.collection('adzuna_industry_trends').doc(`${country}_${categoryTag}`);

  try {
    if (months < 12) {
      // Monthly delta only (never the one-time backfill): skip the Adzuna
      // call entirely if the stored doc already has the most recent complete
      // month -- conserves Adzuna's 2,500 calls/month cap on repeat runs
      // within the same publish cycle, since a full sync costs ~20-25 calls
      // regardless of whether the underlying data actually changed. Still
      // refresh lookupCount via a Firestore-only write, since that costs
      // zero Adzuna quota and keeps the "top 10 by activity" ranking current.
      const expectedMonth = lastCompleteMonth(now);
      const existingSnap = await docRef.get();
      const existingHistory = (existingSnap.data()?.history as HistoryPoint[]) || [];
      if (existingHistory.some((point) => point.month === expectedMonth)) {
        await docRef.set({ lookupCount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return { categoryTag, country, status: 'ok', label, skipped: true };
      }
    }

    const raw = await fetchWithRetry<AdzunaHistoryResponse>(
      `https://api.adzuna.com/v1/api/jobs/${country}/history`,
      {
        app_id: appId,
        app_key: appKey,
        category: categoryTag,
        months,
        'content-type': 'application/json'
      }
    );

    const formatted = formatHistoryMonths(raw?.month || {});
    if (formatted.length === 0) {
      return { categoryTag, country, status: 'ok', label };
    }

    if (months >= 12) {
      // Backfill: replace the stored history wholesale with the fresh window.
      await docRef.set(
        {
          country,
          categoryTag,
          label,
          history: formatted,
          lookupCount,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } else {
      // Monthly delta: merge the new point(s) into existing history, de-duped by month.
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const existing = (snap.data()?.history as HistoryPoint[]) || [];
        const merged = new Map(existing.map((point) => [point.month, point.average]));
        for (const point of formatted) {
          merged.set(point.month, point.average);
        }
        tx.set(
          docRef,
          {
            country,
            categoryTag,
            label,
            history: formatHistoryMonths(Object.fromEntries(merged)),
            lookupCount,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      });
    }

    const latest = formatted.at(-1)!;
    return {
      categoryTag,
      country,
      status: 'ok',
      label,
      latestMonth: latest.month,
      latestAverage: latest.average
    };
  } catch (e) {
    return {
      categoryTag,
      country,
      status: 'error',
      error: e instanceof Error ? redactAdzunaCredentials(e.message) : 'Unknown error',
      label
    };
  }
};

/**
 * Runs the industry-trends sync: for each tracked country, fetches Adzuna's
 * full category taxonomy and syncs every category it returns -- unconditionally,
 * independent of real search-cache traffic -- via Adzuna's /history endpoint,
 * writing results to adzuna_industry_trends. Paced to stay under Adzuna's
 * 25 req/min limit. Shared by both the admin-triggered endpoint and the
 * monthly cron. `now` defaults to the real current time; callers only
 * override it in tests.
 */
export const runIndustryTrendsSync = async (
  months: number,
  now: Date = new Date()
): Promise<SyncSummary> => {
  const config = useRuntimeConfig();
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const db = useAdminFirestore();
  const cacheSnap = await db
    .collection('adzuna_jobs_cache')
    .select('categoryTag', 'searchParams')
    .get();

  // Still read for lookupCount only (the frontend's default-selected-industries
  // ranking) -- no longer used to decide which categories get synced.
  const cacheDocs = cacheSnap.docs.map((doc) => doc.data());

  const pairs: { categoryTag: string; country: string }[] = [];
  const labelsByCountry = new Map<string, Map<string, string>>();
  const lookupCountsByCountry = new Map<string, Map<string, number>>();
  const results: SyncOutcome[] = [];

  for (const country of TRACKED_COUNTRIES) {
    lookupCountsByCountry.set(country, countCategoryLookups(cacheDocs, country));

    let categoryLabels: Map<string, string>;
    try {
      categoryLabels = await fetchCategoryLabels(country, appId, appKey);
    } catch (e) {
      // A categories-fetch failure must be a visible failure, not a silent
      // "zero categories to sync" success -- that's exactly the kind of
      // silent staleness this sync was redesigned to eliminate, just moved
      // up one level. The other tracked country still proceeds normally.
      results.push({
        categoryTag: 'categories-fetch',
        country,
        status: 'error',
        label: 'Category Taxonomy',
        error: e instanceof Error ? redactAdzunaCredentials(e.message) : 'Unknown error'
      });
      continue;
    }

    if (categoryLabels.size === 0) {
      // A 200 response with zero categories is itself an unexpected upstream
      // condition in production (each tracked country has ~27 categories) --
      // treat it the same as a fetch failure instead of silently reporting
      // 0 synced/0 failed for this country, which would look identical to a
      // quiet, successful "nothing changed" run.
      results.push({
        categoryTag: 'categories-fetch',
        country,
        status: 'error',
        label: 'Category Taxonomy',
        error: 'Adzuna categories response contained zero results.'
      });
      continue;
    }

    labelsByCountry.set(country, categoryLabels);
    for (const categoryTag of categoryLabels.keys()) {
      pairs.push({ categoryTag, country });
    }
  }

  const batches = chunkForRateLimit(pairs, RATE_LIMIT_PER_MINUTE);

  for (let i = 0; i < batches.length; i++) {
    const batchStart = Date.now();
    const batchResults = await Promise.all(
      batches[i]!.map((pair) =>
        syncOne(
          pair,
          months,
          appId,
          appKey,
          labelsByCountry.get(pair.country) || new Map(),
          lookupCountsByCountry.get(pair.country)?.get(pair.categoryTag) ?? 0,
          now
        )
      )
    );
    results.push(...batchResults);

    // A batch that skipped the Adzuna call for every pair (all already fresh
    // for this delta -- see the pre-check in syncOne) consumed zero quota, so
    // there's nothing to pace against. Sleeping a full rate-limit window
    // anyway would turn an all-skipped repeat run into a multi-minute no-op.
    const madeNoAdzunaCalls = batchResults.every((r) => r.skipped === true);
    const isLastBatch = i === batches.length - 1;
    if (!isLastBatch && !madeNoAdzunaCalls) {
      const elapsed = Date.now() - batchStart;
      const remaining = RATE_LIMIT_WINDOW_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    }
  }

  const failed = results.filter((r) => r.status === 'error');

  try {
    // Without this, the public endpoint keeps serving its pre-sync snapshot
    // for up to its own 24h cache window regardless of how fresh Firestore
    // now is (confirmed live: a successful sync updated Firestore but
    // /api/market-data/industry-trends kept returning stale data until this
    // was added). Best-effort: a cache-invalidation failure shouldn't mask
    // an otherwise-successful sync that already wrote real data.
    await invalidateIndustryTrendsCache();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to invalidate industry-trends cache after sync', e);
  }

  return {
    success: true,
    months,
    synced: results.length - failed.length,
    failed: failed.length,
    results
  };
};
