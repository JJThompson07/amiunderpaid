export const useUserLogging = () => {
  // Track whenever a user performs a search
  const logSearch = (
    title: string,
    country: string,
    location: string,
    salary: string,
    schedule: string = 'full-time',
    contract: string = 'permanent'
  ) => {
    if (import.meta.client) {
      // We use the native browser 'fetch' API here instead of $fetch
      // because we need the 'keepalive: true' flag. This tells the browser:
      // "Even if the user navigates to a new page right now, finish sending this data to the database!"
      fetch('/api/track-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          country,
          location,
          salary,
          schedule,
          contract
        }),
        keepalive: true
      }).catch(() => {
        // Silently fail if they are completely offline
      });
    }
  };

  // You can easily add more logging functions here later!
  // e.g., const logAffiliateClick = (partner: string) => { ... }
  // e.g., const logError = (errorMsg: string) => { ... }

  return {
    logSearch
  };
};
