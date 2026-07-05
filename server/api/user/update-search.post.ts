// server/api/user/update-search.post.ts
import { getFirestore } from 'firebase-admin/firestore';

interface UpdateSearchBody {
  id: string;
  mcaScore?: string;
  marketAverage?: number;
  governmentAverage?: number;
  searchSuccess?: boolean;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateSearchBody>(event);

  if (!body.id) {
    return { success: false, error: 'Missing search ID' };
  }

  const db = getFirestore();

  try {
    const updateData: Record<string, any> = {};

    if (body.mcaScore !== undefined) updateData.mcaScore = body.mcaScore;
    if (body.marketAverage !== undefined) updateData.marketAverage = body.marketAverage;
    if (body.governmentAverage !== undefined) updateData.governmentAverage = body.governmentAverage;
    if (body.searchSuccess !== undefined) updateData.searchSuccess = body.searchSuccess;

    if (Object.keys(updateData).length > 0) {
      await db.collection('search_history').doc(body.id).update(updateData);
    }

    return { success: true };
  } catch {
    // silent fail so not to disrupt the user
    return { success: false };
  }
});
