import { normalizeCountryCode } from '../../utils/adzunaHistory';
import type { HistoryPoint, IndustryTrendEntry } from '~~/shared/utils/market-data';

type IndustryTrendDoc = {
  categoryTag: string;
  label?: string;
  history?: HistoryPoint[];
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
        history: data.history || []
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
