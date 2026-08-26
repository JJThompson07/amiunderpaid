import { runIndustryTrendsSync } from '../../utils/industryTrendsSync';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const body = await readBody<{ months?: number }>(event).catch(() => ({}) as { months?: number });
  const months = body?.months === 12 ? 12 : 1;

  return await runIndustryTrendsSync(months);
});
