import type { Ref } from 'vue';

type UseAnalyticsReturn = {
  trackSearch: (
    title: string,
    country: string,
    location: string,
    currentSalary: string,
    schedule?: string,
    contract?: string
  ) => void;
  trackAmbiguousSearch: (title: string, group: string) => void;
  trackResultAction: (action: string) => void;
  trackDistribution: (title: string, country: string, location: string, fetch: boolean) => void;
  trackViewRole: (title: string, company: string, location: string, url: string) => void;
  analyticsConsent: Ref<string | null>;
};

export const useAnalytics = (): UseAnalyticsReturn => {
  const { gtag } = useGtag();
  const { $siteBrand } = useNuxtApp();

  // Cookie Consent State
  const analyticsConsent = useCookie<string | null>('analytics_consent', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365
  });

  const hasConsent = computed(() => analyticsConsent.value === 'granted');

  const trackEvent = (eventName: string, payload: Record<string, unknown>): void => {
    if (import.meta.dev) {
      // safety dev check to not track dev events
      return;
    }

    if (hasConsent.value) {
      gtag('event', eventName, {
        ...payload,
        brand: $siteBrand
      });
    }
  };

  const trackSearch = (
    title: string,
    country: string,
    location: string,
    currentSalary: string,
    schedule: string = 'full-time',
    contract: string = 'permanent'
  ): void => {
    trackEvent('search', {
      job_title: title,
      country,
      location,
      current_salary: currentSalary,
      schedule,
      contract
    });
  };

  const trackAmbiguousSearch = (title: string, group: string): void => {
    trackEvent('ambiguous_search', { job_title: title, group });
  };

  const trackResultAction = (action: string): void => {
    trackEvent('result_action', { action });
  };

  const trackDistribution = (
    title: string,
    country: string,
    location: string,
    fetch: boolean
  ): void => {
    trackEvent('fetch_distribution', { job_title: title, country, location, fetch });
  };

  const trackViewRole = (title: string, company: string, location: string, url: string): void => {
    trackEvent('view_role', { job_title: title, company, location, url });
  };

  return {
    trackSearch,
    trackAmbiguousSearch,
    trackResultAction,
    trackDistribution,
    trackViewRole,
    analyticsConsent
  };
};
