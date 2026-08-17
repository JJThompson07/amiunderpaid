// server/api/user/update-search.post.ts
import { getFirestore } from 'firebase-admin/firestore';

type UpdateSearchBody = {
  id: string;
  token?: string;
  mcaScore?: number | null;
  marketAverage?: number | null;
  governmentAverage?: number | null;
  microPercentile?: number | null;
  macroPercentile?: number | null;
  livePercentile?: number | null;
  searchSuccess?: boolean;
  provider?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateSearchBody>(event);

  if (!body.id || !body.token) {
    return { success: false, error: 'Missing search ID or token' };
  }

  // Security Remediation: Verify the HMAC token before allowing the update
  const config = useRuntimeConfig();
  if (!verifySearchToken(body.id, body.token, config.stripeWebhookSecret || 'fallback-secret-for-dev')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const db = getFirestore();

  try {
    const updateData: Record<string, any> = {};

    if (body.mcaScore !== undefined) {
      updateData.mcaScore = body.mcaScore;
    }
    if (body.marketAverage !== undefined) {
      updateData.marketAverage = body.marketAverage;
    }
    if (body.governmentAverage !== undefined) {
      updateData.governmentAverage = body.governmentAverage;
    }
    if (body.microPercentile !== undefined) {
      updateData.microPercentile = body.microPercentile;
    }
    if (body.macroPercentile !== undefined) {
      updateData.macroPercentile = body.macroPercentile;
    }
    if (body.livePercentile !== undefined) {
      updateData.livePercentile = body.livePercentile;
    }
    if (body.searchSuccess !== undefined) {
      updateData.searchSuccess = body.searchSuccess;
    }
    if (body.provider !== undefined) {
      updateData.provider = body.provider;
    }

    if (Object.keys(updateData).length > 0) {
      await db.collection('search_history').doc(body.id).update(updateData);
    }

    return { success: true };
  } catch {
    // silent fail so not to disrupt the user
    return { success: false };
  }
});
