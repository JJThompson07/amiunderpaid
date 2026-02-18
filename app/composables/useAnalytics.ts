export const useAnalytics = () => {
  const { gtag } = useGtag();

  // Track search events from the main search
  const trackSearch = (title: string, country: string, location: string, currentSalary: string) => {
    gtag('event', 'search', {
      job_title: title,
      country,
      location,
      current_salary: currentSalary
    });
  };

  const trackAmbiguousSearch = (title: string, group: string) => {
    gtag('event', 'ambiguous_search', {
      job_title: title,
      group: group
    });
  };

  const trackResultAction = (action: string) => {
    gtag('event', 'result_action', {
      action: action
    });
  };

  const trackPageNav = (page: string) => {
    gtag('event', 'page_nav', {
      page: page
    });
  };

  return {
    trackSearch,
    trackAmbiguousSearch,
    trackResultAction,
    trackPageNav
  };
};
