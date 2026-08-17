export const useUserLogging = () => {
  // Track whenever a user performs a search
  const { $siteBrand } = useNuxtApp();

  const logSearch = async (
    title: string,
    country: string,
    location: string,
    salary: string,
    schedule: string = 'full-time',
    contract: string = 'permanent'
  ): Promise<string> => {
    /* v8 ignore start */
    if (import.meta.dev) {
      return '';
    }
    
    if (import.meta.client) {
      try {
        const response = await $fetch<{ success: boolean; id?: string }>('/api/user/track-search', {
          method: 'POST',
          body: {
            title,
            country,
            location,
            salary,
            schedule,
            contract,
            brand: $siteBrand
          }
        });
        
        if (response.success && response.id) {
          return response.id;
        }
      } catch {
        // Silently fail
      }
    }
    /* v8 ignore stop */

    return '';
  };

  const updateSearchLog = (
    searchId: string,
    data: {
      mcaScore?: number | null;
      marketAverage?: number | null;
      governmentAverage?: number | null;
      microPercentile?: number | null;
      macroPercentile?: number | null;
      livePercentile?: number | null;
      searchSuccess?: boolean;
      provider?: string;
    }
  ) => {
    /* v8 ignore start */
    if (import.meta.dev || !import.meta.client || !searchId) {
      return;
    }

    fetch('/api/user/update-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: searchId, ...data }),
      keepalive: true
    }).catch(() => {});
    /* v8 ignore stop */
  };

  // You can easily add more logging functions here later!
  // e.g., const logAffiliateClick = (partner: string) => { ... }
  // e.g., const logError = (errorMsg: string) => { ... }

  return {
    logSearch,
    updateSearchLog
  };
};
