import crypto from 'node:crypto';
import { ADZUNA_LOCATION_MAP } from '../constants/locations';
import { buildTieredJobResponse } from './jobTiering';
import { extractSearchAnchorPhrase } from './searchRelevance';
import type {
  JobListing,
  JobSearchResponse,
  SalaryDistributionResponse
} from '~~/shared/utils/market-data';
import { sanitizeAdzunaData } from '~~/shared/utils/sanitize';

// Below this many populated histogram buckets, Tier 1's full-title
// `title_only` match is judged too sparse and Tier 2 (the shorter
// extractSearchAnchorPhrase result, which relaxes the title_only AND-match)
// is retried instead. Only used by fetchAdzunaHistogram -- fetchAdzunaJobs
// always runs both tiers concurrently and returns both (see design.md
// Decision 2), so it has no analogous sufficiency threshold.
const MIN_TIER1_HISTOGRAM_BUCKETS = 3;

export const generateCacheKey = (
  title: string,
  location: string,
  country: string,
  category?: string
): string => {
  // Allow alphanumeric, plus +, #, . (for C++, C#, .NET)
  // Replace other characters with -
  const t = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.]+/g, '-');
  const l = location
    ? location
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9+#.]+/g, '-')
    : '';
  const c = category
    ? category
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9+#.]+/g, '-')
    : '';

  // v2- prefix so that a deployment of this change automatically bypasses
  // stale, unversioned cache records written by the pre-Reed-preference
  // Adzuna-only code path, without requiring a manual Firestore wipe.
  const rawKey = `v2-${country}-${l}-${t}${c ? `-cat-${c}` : ''}`;

  if (rawKey.length > 200) {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 16);
    return `${rawKey.substring(0, 180)}-${hash}`;
  }

  return rawKey;
};

type AdzunaRawSearchResponse = {
  count?: number;
  results?: JobListing[];
};

type AdzunaRawHistogramResponse = {
  histogram?: Record<string, number>;
};

const resolveAdzunaLocation = (location: string): string | undefined => {
  if (location.trim() === '') {
    return undefined;
  }
  let cleanLocation = location.split(',')[0]!.trim();
  const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
  if (ADZUNA_LOCATION_MAP[slug]) {
    cleanLocation = ADZUNA_LOCATION_MAP[slug];
  }
  return cleanLocation;
};

export const fetchAdzunaJobs = async (
  title: string,
  location: string,
  countryCode: string,
  jobType: string,
  contractType: string,
  category?: string
): Promise<JobSearchResponse> => {
  const config = useRuntimeConfig();
  // Credentials are always read from private runtimeConfig (server-only).
  // Never access via process.env directly — this bypasses Nuxt's validation layer.
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const baseParams: Record<string, string | number> = {
    app_id: appId,
    app_key: appKey,
    results_per_page: 100,
    'content-type': 'application/json'
  };

  if (jobType === 'part-time') {
    baseParams.part_time = 1;
  } else if (jobType === 'full-time') {
    baseParams.full_time = 1;
  }

  if (contractType === 'contract') {
    baseParams.contract = 1;
  } else if (contractType === 'permanent') {
    baseParams.permanent = 1;
  }

  const where = resolveAdzunaLocation(location);
  if (where) {
    baseParams.where = where;
    // Default search radius so Adzuna doesn't return 0 jobs for a small town.
    baseParams.distance = 20;
  }

  if (category) {
    baseParams.category = category;
  }

  // Does NOT catch/wrap network errors here: the gateway (jobs.ts) needs the
  // real HTTP status (429/403/404) off the raw ofetch error to decide whether
  // to fall back to Jooble (US) — collapsing it to a generic 500 here would
  // destroy that signal.
  const search = async (titleOnly: string): Promise<AdzunaRawSearchResponse> =>
    sanitizeAdzunaData(
      await $fetch<AdzunaRawSearchResponse>(
        `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
        {
          params: { ...baseParams, title_only: titleOnly },
          timeout: 6000
        }
      )
    );

  const anchorPhrase = extractSearchAnchorPhrase(title);
  // Skip the Tier 2 request entirely when the anchor phrase is a no-op (no
  // scope modifier was stripped from the title) -- it would send Adzuna an
  // identical title_only request for no benefit. Tier 1 and Tier 2 (when run)
  // are fetched concurrently and both returned -- see design.md Decision 2.
  const runTier2 = anchorPhrase !== title;

  const [tier1Raw, tier2Raw] = await Promise.all([
    search(title),
    runTier2 ? search(anchorPhrase) : Promise.resolve<AdzunaRawSearchResponse>({ results: [] })
  ]);

  const normalizedCountry: 'gb' | 'us' = countryCode === 'us' ? 'us' : 'gb';

  return buildTieredJobResponse(
    tier1Raw.results || [],
    tier2Raw.results || [],
    title,
    jobType,
    normalizedCountry,
    'adzuna'
  );
};

export const fetchAdzunaHistogram = async (
  title: string,
  location: string,
  countryCode: string,
  category?: string
): Promise<SalaryDistributionResponse> => {
  const config = useRuntimeConfig();
  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({ statusCode: 500, statusMessage: 'Market data service is misconfigured.' });
  }

  const baseParams: Record<string, string> = {
    app_id: appId,
    app_key: appKey,
    'content-type': 'application/json'
  };

  const where = resolveAdzunaLocation(location);
  if (where) {
    baseParams.where = where;
  }
  if (category) {
    baseParams.category = category;
  }

  // See fetchAdzunaJobs — errors are intentionally left unwrapped so the
  // gateway can inspect the real HTTP status.
  const search = async (titleOnly: string): Promise<AdzunaRawHistogramResponse> =>
    sanitizeAdzunaData(
      await $fetch<AdzunaRawHistogramResponse>(
        `https://api.adzuna.com/v1/api/jobs/${countryCode}/histogram`,
        {
          params: { ...baseParams, title_only: titleOnly },
          timeout: 6000
        }
      )
    );

  const anchorPhrase = extractSearchAnchorPhrase(title);

  const tier1Raw = await search(title);
  const tier1Histogram = tier1Raw.histogram || {};

  // Skip Tier 2 entirely when the anchor phrase is a no-op -- see
  // fetchAdzunaJobs for the same short-circuit and its rationale.
  if (Object.keys(tier1Histogram).length >= MIN_TIER1_HISTOGRAM_BUCKETS || anchorPhrase === title) {
    return { histogram: tier1Histogram, provider: 'adzuna' as const };
  }

  const tier2Raw = await search(anchorPhrase);
  return { histogram: tier2Raw.histogram || {}, provider: 'adzuna' as const };
};
