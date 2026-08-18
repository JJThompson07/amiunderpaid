type SearchLogUpdate = {
  mcaScore?: number | null;
  marketAverage?: number | null;
  governmentAverage?: number | null;
  microPercentile?: number | null;
  macroPercentile?: number | null;
  livePercentile?: number | null;
  searchSuccess?: boolean;
  provider?: string;
};

type UseUserLoggingReturn = {
  logSearch: (
    title: string,
    country: string,
    location: string,
    salary: string,
    schedule?: string,
    contract?: string
  ) => Promise<string>;
  updateSearchLog: (searchId: string, data: SearchLogUpdate) => void;
};

export const useUserLogging = (): UseUserLoggingReturn => {
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
        // We use the native browser 'fetch' API here instead of Nuxt's '$fetch'
        // because we need the 'keepalive: true' flag. This ensures the search log
        // is recorded even if the user immediately navigates to a new page or tab.
        const response = await fetch('/api/user/track-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            country,
            location,
            salary,
            schedule,
            contract,
            brand: $siteBrand
          }),
          keepalive: true
        });

        const data = await response.json();
        if (data.success && data.id) {
          if (data.token) {
            useState('currentSearchToken').value = data.token;
          }
          return data.id;
        }
      } catch {
        // Silently fail
      }
    }
    /* v8 ignore stop */

    return '';
  };

  const updateSearchLog = (searchId: string, data: SearchLogUpdate): void => {
    /* v8 ignore start */
    if (import.meta.dev || !import.meta.client || !searchId) {
      return;
    }

    const token = useState('currentSearchToken').value;

    fetch('/api/user/update-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: searchId, token, ...data }),
      keepalive: true
    }).catch(() => undefined);
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
