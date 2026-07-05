export const useUserLogging = () => {
  // Track whenever a user performs a search
  const { $siteBrand } = useNuxtApp();

  const logSearch = (
    title: string,
    country: string,
    location: string,
    salary: string,
    schedule: string = 'full-time',
    contract: string = 'permanent'
  ): string => {
    if (import.meta.dev) {
      // do not log dev searches
      return '';
    }

    const searchId = crypto.randomUUID();

    if (import.meta.client) {
      // We use the native browser 'fetch' API here instead of $fetch
      // because we need the 'keepalive: true' flag. This tells the browser:
      // "Even if the user navigates to a new page right now, finish sending this data to the database!"
      fetch('/api/user/track-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: searchId,
          title,
          country,
          location,
          salary,
          schedule,
          contract,
          brand: $siteBrand
        }),
        keepalive: true
      }).catch(() => {
        // Silently fail if they are completely offline
      });
    }

    return searchId;
  };

  const updateSearchLog = (
    searchId: string,
    data: {
      mcaScore?: string;
      marketAverage?: number;
      governmentAverage?: number;
      searchSuccess?: boolean;
    }
  ) => {
    if (import.meta.dev || !import.meta.client || !searchId) return;

    fetch('/api/user/update-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: searchId, ...data }),
      keepalive: true
    }).catch(() => {});
  };

  // You can easily add more logging functions here later!
  // e.g., const logAffiliateClick = (partner: string) => { ... }
  // e.g., const logError = (errorMsg: string) => { ... }

  return {
    logSearch,
    updateSearchLog
  };
};
