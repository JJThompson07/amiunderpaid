import { FieldValue } from 'firebase-admin/firestore';
import {
  chunkForRateLimit,
  countCategoryLookups,
  extractActiveCategoryCountryPairs,
  formatHistoryMonths
} from './adzunaHistory';
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

const isRateLimited = (e: unknown): boolean => {
  const status =
    (e as { response?: { status?: number }; statusCode?: number })?.response?.status ??
    (e as { statusCode?: number })?.statusCode;
  return status === 429;
};

// Retries once on 429 after a short wait -- defense in depth alongside the
// batch pacing below, in case Adzuna's rate-limit window doesn't align
// exactly with our batch boundaries (confirmed live: a 429'd call succeeded
// after just a ~10s wait).
const fetchWithRetry = async <T>(
  url: string,
  params: Record<string, unknown>,
  retriesLeft = 1
): Promise<T> => {
  try {
    return await $fetch<T>(url, { params });
  } catch (e) {
    if (isRateLimited(e) && retriesLeft > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      return fetchWithRetry<T>(url, params, retriesLeft - 1);
    }
    throw e;
  }
};

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
      error: e instanceof Error ? e.message : 'Unknown error',
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

  return {
    success: true,
    months,
    synced: results.length - failed.length,
    failed: failed.length,
    results
  };
};
