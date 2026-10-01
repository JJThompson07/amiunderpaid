import { FieldValue } from 'firebase-admin/firestore';
import {
  chunkForRateLimit,
  countCategoryLookups,
  extractActiveCategoryCountryPairs,
  formatHistoryMonths
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
// (e.g. "IT Jobs" for "it-jobs") for the UI's toggle pills and chart legend.
const fetchCategoryLabels = async (
  country: string,
  appId: string,
  appKey: string
): Promise<Map<string, string>> => {
  const labels = new Map<string, string>();
  try {
    const raw = await fetchWithRetry<AdzunaCategoriesResponse>(
      `https://api.adzuna.com/v1/api/jobs/${country}/categories`,
      { app_id: appId, app_key: appKey, 'content-type': 'application/json' }
    );
    for (const entry of raw?.results || []) {
      if (entry.tag && entry.label) {
        labels.set(entry.tag, entry.label);
      }
    }
  } catch {
    // Label lookup is a nice-to-have; sync still proceeds using the tag as a fallback label.
  }
  return labels;
};

const syncOne = async (
  pair: { categoryTag: string; country: string },
  months: number,
  appId: string,
  appKey: string,
  categoryLabels: Map<string, string>,
  lookupCount: number
): Promise<SyncOutcome> => {
  const { categoryTag, country } = pair;
  const label = categoryLabels.get(categoryTag) || categoryTag;

  try {
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

    const db = useAdminFirestore();
    const docRef = db.collection('adzuna_industry_trends').doc(`${country}_${categoryTag}`);

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
 * Runs the industry-trends sync: derives active category/country pairs from
 * real search traffic, pulls Adzuna's /history endpoint for each, and writes
 * results to adzuna_industry_trends. Paced to stay under Adzuna's 25 req/min
 * limit. Shared by both the admin-triggered endpoint and the monthly cron.
 */
export const runIndustryTrendsSync = async (months: number): Promise<SyncSummary> => {
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

  const cacheDocs = cacheSnap.docs.map((doc) => doc.data());
  const pairs = extractActiveCategoryCountryPairs(cacheDocs);

  const countriesInUse = [...new Set(pairs.map((p) => p.country))];
  const labelsByCountry = new Map<string, Map<string, string>>();
  const lookupCountsByCountry = new Map<string, Map<string, number>>();
  for (const country of countriesInUse) {
    labelsByCountry.set(country, await fetchCategoryLabels(country, appId, appKey));
    // Reuses the adzuna_jobs_cache read above rather than a second Firestore
    // query -- see countCategoryLookups for what this measures and why.
    lookupCountsByCountry.set(country, countCategoryLookups(cacheDocs, country));
  }

  const results: SyncOutcome[] = [];
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
          lookupCountsByCountry.get(pair.country)?.get(pair.categoryTag) ?? 0
        )
      )
    );
    results.push(...batchResults);

    const isLastBatch = i === batches.length - 1;
    if (!isLastBatch) {
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
