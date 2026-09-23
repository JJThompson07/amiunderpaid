import { reExpireCategoryCache } from '../../utils/cacheReExpiry';

// This endpoint is protected by server/middleware/admin-guard.ts
// Only existing admins (with the claim) can reach this block.

type CategoryReExpiryInput = {
  tag: string;
  country: 'UK' | 'USA';
  cacheDays: number;
};

const isValidCategoryInput = (value: unknown): value is CategoryReExpiryInput => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.tag === 'string' &&
    candidate.tag.length > 0 &&
    (candidate.country === 'UK' || candidate.country === 'USA') &&
    typeof candidate.cacheDays === 'number' &&
    Number.isFinite(candidate.cacheDays)
  );
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const categories = body?.categories;

  if (
    !Array.isArray(categories) ||
    categories.length === 0 ||
    !categories.every(isValidCategoryInput)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A non-empty list of { tag, country, cacheDays } categories is required.'
    });
  }

  try {
    const db = useAdminFirestore();

    let updatedJobs = 0;
    let updatedDistributions = 0;

    for (const category of categories as CategoryReExpiryInput[]) {
      const summary = await reExpireCategoryCache(db, {
        categoryTag: category.tag,
        countryCode: category.country === 'USA' ? 'us' : 'gb',
        cacheDays: category.cacheDays
      });
      updatedJobs += summary.updatedJobs;
      updatedDistributions += summary.updatedDistributions;
    }

    return { success: true, updatedJobs, updatedDistributions };
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to re-expire cached category results.'
    });
  }
});
