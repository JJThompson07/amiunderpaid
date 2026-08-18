import { FetchError } from 'ofetch';

// Minimal shape of a raw Adzuna job/geodata entry — only the fields this
// admin discovery endpoint actually reads (area[1] region names).
type AdzunaRawLocation = {
  area?: string[];
  display_name?: string;
};

type AdzunaRawSearchResponse = {
  results?: { location?: AdzunaRawLocation }[];
};

type AdzunaGeodataItem = {
  location?: AdzunaRawLocation;
};

export default defineEventHandler(async (event) => {
  await verifyAdmin(event);

  const config = useRuntimeConfig();
  const query = getQuery(event);
  const country = query.country ? String(query.country).toLowerCase() : 'gb';
  const targetCountry = country === 'usa' || country === 'us' ? 'us' : 'gb';

  const appId = config.adzunaAppId;
  const appKey = config.adzunaAppKey;

  if (!appId || !appKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Market data service is misconfigured.'
    });
  }

  try {
    // Strategy: fetch a broad search with no location filter, then extract
    // unique area[1] values from the results to discover Adzuna's region names.
    // We request 50 results to get a good spread of regions.
    const rawData = await $fetch<AdzunaRawSearchResponse>(
      `https://api.adzuna.com/v1/api/jobs/${targetCountry}/search/1`,
      {
        params: {
          app_id: appId,
          app_key: appKey,
          results_per_page: 50,
          what: 'software', // broad search term to get diverse results
          'content-type': 'application/json'
        }
      }
    );

    // Extract unique region names from area[1] across all results
    const regions = new Set<string>();
    if (rawData?.results) {
      for (const job of rawData.results) {
        const area = job?.location?.area;
        if (Array.isArray(area) && area.length >= 2 && area[1]) {
          regions.add(area[1]);
        }
      }
    }

    // Also try the geodata endpoint for a more complete picture
    let geodataRegions: string[] = [];
    try {
      const geodata = await $fetch<AdzunaGeodataItem[]>(
        `https://api.adzuna.com/v1/api/jobs/${targetCountry}/geodata`,
        {
          params: {
            app_id: appId,
            app_key: appKey,
            location0: targetCountry === 'gb' ? 'UK' : 'US',
            'content-type': 'application/json'
          }
        }
      );

      // The geodata response typically has location keys at the region level
      if (Array.isArray(geodata)) {
        for (const item of geodata) {
          const area = item?.location?.area;
          if (Array.isArray(area) && area.length >= 2 && area[1]) {
            regions.add(area[1]);
          }
        }
      }
      geodataRegions = Array.isArray(geodata)
        ? geodata.map((item) => item?.location?.display_name || item?.location?.area?.[1] || '')
        : [];
    } catch {
      // geodata endpoint may not be available, that's fine
    }

    return {
      country: targetCountry,
      regionsFromSearch: Array.from(regions).sort(),
      regionsFromGeodata: geodataRegions.filter(Boolean).sort(),
      totalSearchResults: rawData?.results?.length || 0
    };
  } catch (e) {
    const isFetchError = e instanceof FetchError;
    const status = isFetchError ? e.response?.status : undefined;
    throw createError({
      statusCode: status === 429 ? 503 : status || 500,
      statusMessage: 'Market data temporarily unavailable.',
      data: import.meta.dev && isFetchError ? e.data : undefined
    });
  }
});
