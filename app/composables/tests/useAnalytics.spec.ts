import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnalytics } from '../useAnalytics';

const mockGtag = vi.fn();
vi.stubGlobal('useGtag', () => ({ gtag: mockGtag }));
vi.stubGlobal('useNuxtApp', () => ({ $siteBrand: 'TestBrand' }));

let mockCookieValue: string | null = null;
vi.stubGlobal('useCookie', () => ({
  get value(): string | null {
    return mockCookieValue;
  },
  set value(val: string | null) {
    mockCookieValue = val;
  }
}));
vi.stubGlobal('computed', <T>(fn: () => T) => ({
  get value(): T {
    return fn();
  }
}));

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieValue = null;
  });

  it('provides analyticsConsent reactive cookie state', () => {
    const { analyticsConsent } = useAnalytics();
    expect(analyticsConsent.value).toBeNull();
    analyticsConsent.value = 'granted';
    expect(analyticsConsent.value).toBe('granted');
  });

  it('tracks search when consent is granted', () => {
    const { trackSearch } = useAnalytics();
    mockCookieValue = 'granted';
    trackSearch('Developer', 'UK', 'London', '50000');
    expect(mockGtag).toHaveBeenCalledWith('event', 'search', {
      job_title: 'Developer',
      country: 'UK',
      location: 'London',
      current_salary: '50000',
      schedule: 'full-time',
      contract: 'permanent',
      brand: 'TestBrand'
    });
  });

  it('does not track search when consent is missing', () => {
    const { trackSearch } = useAnalytics();
    mockCookieValue = null;
    trackSearch('Developer', 'UK', 'London', '50000');
    expect(mockGtag).not.toHaveBeenCalled();
  });

  it('tracks ambiguous search', () => {
    const { trackAmbiguousSearch } = useAnalytics();
    mockCookieValue = 'granted';
    trackAmbiguousSearch('Manager', 'Management');
    expect(mockGtag).toHaveBeenCalledWith('event', 'ambiguous_search', {
      job_title: 'Manager',
      group: 'Management',
      brand: 'TestBrand'
    });
  });

  it('tracks result action', () => {
    const { trackResultAction } = useAnalytics();
    mockCookieValue = 'granted';
    trackResultAction('click');
    expect(mockGtag).toHaveBeenCalledWith('event', 'result_action', {
      action: 'click',
      brand: 'TestBrand'
    });
  });

  it('tracks distribution fetch', () => {
    const { trackDistribution } = useAnalytics();
    mockCookieValue = 'granted';
    trackDistribution('Developer', 'UK', 'London', true);
    expect(mockGtag).toHaveBeenCalledWith('event', 'fetch_distribution', {
      job_title: 'Developer',
      country: 'UK',
      location: 'London',
      fetch: true,
      brand: 'TestBrand'
    });
  });

  it('tracks view role', () => {
    const { trackViewRole } = useAnalytics();
    mockCookieValue = 'granted';
    trackViewRole('Developer', 'Company Inc', 'London', 'https://example.com/job');
    expect(mockGtag).toHaveBeenCalledWith('event', 'view_role', {
      job_title: 'Developer',
      company: 'Company Inc',
      location: 'London',
      url: 'https://example.com/job',
      brand: 'TestBrand'
    });
  });

  describe('affiliate tracking', () => {
    const payload = {
      partner: 'purple-cv',
      placement: 'negotiation-grid',
      country: 'UK',
      verdict: 'underpaid'
    } as const;

    it.each([
      ['trackAffiliateClick', 'affiliate_click'],
      ['trackAffiliateImpression', 'affiliate_impression'],
      ['trackAffiliateDismiss', 'affiliate_dismiss']
    ] as const)('%s sends %s when consent is granted', (helper, eventName) => {
      const analytics = useAnalytics();
      mockCookieValue = 'granted';
      analytics[helper](payload);
      expect(mockGtag).toHaveBeenCalledWith('event', eventName, {
        partner: 'purple-cv',
        placement: 'negotiation-grid',
        country: 'UK',
        verdict: 'underpaid',
        brand: 'TestBrand'
      });
    });

    it.each([null, 'denied'])('sends no affiliate events when consent is %s', (consent) => {
      const { trackAffiliateClick, trackAffiliateDismiss, trackAffiliateImpression } =
        useAnalytics();
      mockCookieValue = consent;
      trackAffiliateClick(payload);
      trackAffiliateImpression(payload);
      trackAffiliateDismiss(payload);
      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('drops any fields beyond the tracked dimensions', () => {
      const { trackAffiliateClick } = useAnalytics();
      mockCookieValue = 'granted';
      trackAffiliateClick({ ...payload, salary: 42000 } as typeof payload);
      expect(mockGtag.mock.calls[0]?.[2]).not.toHaveProperty('salary');
    });
  });
});
