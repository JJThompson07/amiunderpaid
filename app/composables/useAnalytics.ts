export const useAnalytics = () => {
  const { gtag } = useGtag();
  const { $siteBrand } = useNuxtApp();

  // Track search events from the main search
  const trackSearch = (title: string, country: string, location: string, currentSalary: string) => {
    gtag('event', 'search', {
      job_title: title,
      country,
      location,
      current_salary: currentSalary,
      brand: $siteBrand
    });
  };

  const trackAmbiguousSearch = (title: string, group: string) => {
    gtag('event', 'ambiguous_search', {
      job_title: title,
      group: group,
      brand: $siteBrand
    });
  };

  const trackResultAction = (action: string) => {
    gtag('event', 'result_action', {
      action: action,
      brand: $siteBrand
    });
  };

  return {
    trackSearch,
    trackAmbiguousSearch,
    trackResultAction
  };
};
