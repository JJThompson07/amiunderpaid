// Counts the government benchmark datasets the admin seeder can manage. Runs server-side because
// both collections are deny-by-default in firestore.rules (they're only read publicly via Algolia).

export type BenchmarkSummaryRow = {
  country: string;
  year: number;
  period: string;
  count: number;
  scope: 'National' | 'Regional';
};

const COLLECTIONS = [
  { name: 'salary_benchmarks', scope: 'National' },
  { name: 'regional_salary_benchmarks', scope: 'Regional' }
] as const;
const COUNTRIES = ['UK', 'USA'];
const PERIODS = ['year'];
const YEARS_BACK = 5;

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const db = useAdminFirestore();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK }, (_, i) => currentYear - i);

  const lookups: Promise<BenchmarkSummaryRow>[] = [];
  for (const col of COLLECTIONS) {
    for (const country of COUNTRIES) {
      for (const year of years) {
        for (const period of PERIODS) {
          lookups.push(
            db
              .collection(col.name)
              .where('country', '==', country)
              .where('year', '==', year)
              .where('period', '==', period)
              .count()
              .get()
              .then((snapshot) => ({
                country,
                year,
                period,
                count: snapshot.data().count,
                scope: col.scope
              }))
          );
        }
      }
    }
  }

  try {
    const rows = await Promise.all(lookups);
    return rows.filter((row) => row.count > 0);
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load dataset summary.' });
  }
});
