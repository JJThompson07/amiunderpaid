import { beforeEach, describe, expect, it, vi } from 'vitest';

const removeItemMock = vi.fn().mockResolvedValue(undefined);
vi.stubGlobal('useStorage', () => ({ removeItem: removeItemMock }));

describe('invalidateIndustryTrendsCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the Nitro cache entry for both gb and us, matching defineCachedFunction key format', async () => {
    const { invalidateIndustryTrendsCache } = await import('../industryTrendsCache');

    await invalidateIndustryTrendsCache();

    expect(removeItemMock).toHaveBeenCalledTimes(2);
    expect(removeItemMock).toHaveBeenCalledWith(
      '/cache:nitro/functions:industryTrendsFetch:gb.json'
    );
    expect(removeItemMock).toHaveBeenCalledWith(
      '/cache:nitro/functions:industryTrendsFetch:us.json'
    );
  });
});
