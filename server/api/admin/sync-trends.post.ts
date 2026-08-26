import { FieldValue } from 'firebase-admin/firestore';
import { extractActiveCategoryCountryPairs, formatHistoryMonths } from '../../utils/adzunaHistory';
import type { HistoryPoint } from '~~/shared/utils/market-data';

type AdzunaHistoryResponse = {
  month?: Record<string, number>;
};

type AdzunaCategoriesResponse = {
  results?: { label?: string; tag?: string }[];
};

type SyncOutcome = {
  categoryTag: string;
  country: string;
  status: 'ok' | 'error';
  error?: string;
};

// Bounded concurrency: N categories x 2 countries is a real number of
// sequential network round-trips, and Vercel serverless functions have an
// execution time limit -- a fully sequential loop risks timing out.
const CONCURRENCY = 4;

// One call per country (not per category) to resolve human-readable labels
// (e.g. "IT Jobs" for "it-jobs") for the UI's toggle pills and chart legend.
const fetchCategoryLabels = async (
  country: string,
  appId: string,
  appKey: string
): Promise<Map<string, string>> => {
  const labels = new Map<string, string>();
  try {
    const raw = await $fetch<AdzunaCategoriesResponse>(
      `https://api.adzuna.com/v1/api/jobs/${country}/categories`,
      { params: { app_id: appId, app_key: appKey, 'content-type': 'application/json' } }
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
  categoryLabels: Map<string, string>
): Promise<SyncOutcome> => {
  const { categoryTag, country } = pair;
  const label = categoryLabels.get(categoryTag) || categoryTag;

  try {
    const raw = await $fetch<AdzunaHistoryResponse>(
      `https://api.adzuna.com/v1/api/jobs/${country}/history`,
      {
        params: {
          app_id: appId,
          app_key: appKey,
          category: categoryTag,
          months,
          'content-type': 'application/json'
        }
      }
    );

    const formatted = formatHistoryMonths(raw?.month || {});
    if (formatted.length === 0) {
      return { categoryTag, country, status: 'ok' };
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
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      });
    }

    return { categoryTag, country, status: 'ok' };
  } catch (e) {
    return {
      categoryTag,
      country,
      status: 'error',
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
};

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const config = useRuntimeConfig();
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const body = await readBody<{ months?: number }>(event).catch(() => ({}) as { months?: number });
  const months = body?.months === 12 ? 12 : 1;

  const db = useAdminFirestore();
  const cacheSnap = await db
    .collection('adzuna_jobs_cache')
    .select('categoryTag', 'searchParams')
    .get();

  const pairs = extractActiveCategoryCountryPairs(cacheSnap.docs.map((doc) => doc.data()));

  const countriesInUse = [...new Set(pairs.map((p) => p.country))];
  const labelsByCountry = new Map<string, Map<string, string>>();
  for (const country of countriesInUse) {
    labelsByCountry.set(country, await fetchCategoryLabels(country, appId, appKey));
  }

  const results: SyncOutcome[] = [];
  for (let i = 0; i < pairs.length; i += CONCURRENCY) {
    const chunk = pairs.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((pair) =>
        syncOne(pair, months, appId, appKey, labelsByCountry.get(pair.country) || new Map())
      )
    );
    results.push(...chunkResults);
  }

  const failed = results.filter((r) => r.status === 'error');

  return {
    success: true,
    months,
    synced: results.length - failed.length,
    failed: failed.length,
    results
  };
});
