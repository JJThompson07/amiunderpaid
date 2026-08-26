import { normalizeCountryCode } from '../../utils/adzunaHistory';
import type { HistoryPoint, IndustryTrendEntry } from '~~/shared/utils/market-data';

type IndustryTrendDoc = {
  categoryTag: string;
  label?: string;
  history?: HistoryPoint[];
  lookupCount?: number;
};

const fetchIndustryTrends = defineCachedFunction(
  async (countryCode: 'gb' | 'us'): Promise<IndustryTrendEntry[]> => {
    const db = useAdminFirestore();
    const snap = await db
      .collection('adzuna_industry_trends')
      .where('country', '==', countryCode)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data() as IndustryTrendDoc;
      return {
        categoryTag: data.categoryTag,
        label: data.label || data.categoryTag,
        history: data.history || [],
        // Computed and stored by runIndustryTrendsSync during the monthly
        // sync (reusing that job's own adzuna_jobs_cache read) rather than
        // re-querying the whole cache collection on every cache-miss here.
        // Falls back to 0 for docs written before this field existed.
        lookupCount: data.lookupCount ?? 0
      };
    });
  },
  {
    // Data only changes on a monthly sync, so a day-scale cache is generous
    // headroom without ever serving obviously-stale results.
    maxAge: 60 * 60 * 24,
    name: 'industryTrendsFetch',
    getKey: (countryCode: string) => countryCode
  }
);

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const countryCode = normalizeCountryCode(query.country);

  const industries = await fetchIndustryTrends(countryCode);

  return { country: countryCode, industries };
});
