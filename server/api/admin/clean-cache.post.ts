import { purgeExpiredCache } from '../../utils/cachePurge';

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  try {
    const { deletedJobs, deletedDistributions } = await purgeExpiredCache();

    return {
      success: true,
      message: 'Cache cleaned successfully.',
      stats: {
        deletedJobs,
        deletedDistributions
      }
    };
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to clean cache',
      data: e instanceof Error ? e.message : 'Unknown error'
    });
  }
});
