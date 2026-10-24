import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, toValue, watch } from 'vue';
import type { EffectScope } from 'vue';

import {
  AFFILIATE_TOAST_DELAY_MS,
  AFFILIATE_TOAST_STORAGE_KEY,
  useAffiliateOfferToast
} from '../useAffiliateOfferToast';
import type { SalaryVerdict } from '~~/shared/utils/verdict';

vi.stubGlobal('ref', ref);
vi.stubGlobal('computed', computed);
vi.stubGlobal('watch', watch);
vi.stubGlobal('toValue', toValue);

let stateStore = new Map<string, { value: unknown }>();
vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
  if (!stateStore.has(key)) {
    stateStore.set(key, ref(init()));
  }
  return stateStore.get(key);
});

const analyticsConsent = ref<string | null>('granted');
const mockTrackAffiliateClick = vi.fn();
const mockTrackAffiliateDismiss = vi.fn();
const mockTrackAffiliateImpression = vi.fn();
vi.stubGlobal('useAnalytics', () => ({
  analyticsConsent,
  trackAffiliateClick: mockTrackAffiliateClick,
  trackAffiliateDismiss: mockTrackAffiliateDismiss,
  trackAffiliateImpression: mockTrackAffiliateImpression
}));

const toastState = ref({ isOpen: false, title: '', message: '', type: 'info' });
vi.stubGlobal('useSystemToast', () => ({ toastState }));

const seenInGrid = ref<string[]>([]);
vi.stubGlobal('useSeenAffiliateImpressions', () => ({
  hasImpressionFired: (partner: string, placement: string): boolean =>
    seenInGrid.value.includes(`${partner}:${placement}`)
}));

let unmountHooks: (() => void)[] = [];
vi.stubGlobal('onBeforeUnmount', (fn: () => void) => unmountHooks.push(fn));

const page = {
  country: ref('UK'),
  verdict: ref<SalaryVerdict>('underpaid'),
  isSettled: ref(true),
  hasResults: ref(true),
  hasRecruiters: ref(false)
};

// each instance runs in its own effect scope, stopped on unmount like a real component,
// so watchers from one test can't react to the next test's setup
let scopes: EffectScope[] = [];

const mountToast = (): ReturnType<typeof useAffiliateOfferToast> => {
  const scope = effectScope();
  scopes.push(scope);
  const toast = scope.run(() => useAffiliateOfferToast(page));
  if (!toast) {
    throw new Error('toast composable did not initialise');
  }
  return toast;
};

const unmount = (): void => {
  unmountHooks.forEach((hook) => hook());
  unmountHooks = [];
  scopes.forEach((scope) => scope.stop());
  scopes = [];
};

// advance the delay and let both watchers flush
const elapse = async (ms = AFFILIATE_TOAST_DELAY_MS): Promise<void> => {
  vi.advanceTimersByTime(ms);
  await nextTick();
  await nextTick();
};

describe('useAffiliateOfferToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    sessionStorage.clear();
    stateStore = new Map();
    unmountHooks = [];
    analyticsConsent.value = 'granted';
    toastState.value = { isOpen: false, title: '', message: '', type: 'info' };
    seenInGrid.value = [];
    page.country.value = 'UK';
    page.verdict.value = 'underpaid';
    page.isSettled.value = true;
    page.hasResults.value = true;
    page.hasRecruiters.value = false;
  });

  afterEach(() => {
    unmount();
    vi.useRealTimers();
  });

  it('shows the lead offer only once the delay has elapsed', async () => {
    const toast = mountToast();

    await elapse(AFFILIATE_TOAST_DELAY_MS - 1);
    expect(toast.isVisible.value).toBe(false);

    await elapse(1);
    expect(toast.isVisible.value).toBe(true);
    expect(toast.offer.value?.slug).toBe('salary-negotiator');
    expect(toast.copyKeys.value).toEqual({
      title: 'toast.affiliate.salary-negotiator.underpaid.title',
      message: 'toast.affiliate.salary-negotiator.underpaid.message',
      cta: 'toast.affiliate.salary-negotiator.cta'
    });
    expect(mockTrackAffiliateImpression).toHaveBeenCalledWith({
      partner: 'salary-negotiator',
      placement: 'toast',
      country: 'UK',
      verdict: 'underpaid'
    });
  });

  it('leads with the verdict-relevant partner', async () => {
    page.verdict.value = 'overpaid';
    const toast = mountToast();
    await elapse();
    expect(toast.offer.value?.slug).toBe('purple-cv');
    expect(toast.copyKeys.value?.title).toBe('toast.affiliate.purple-cv.overpaid.title');
  });

  it('only starts the delay once results have settled', async () => {
    page.isSettled.value = false;
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);

    page.isSettled.value = true;
    await nextTick();
    await elapse(AFFILIATE_TOAST_DELAY_MS - 1);
    expect(toast.isVisible.value).toBe(false);
    await elapse(1);
    expect(toast.isVisible.value).toBe(true);
  });

  it('restarts the delay if results reload mid-countdown', async () => {
    const toast = mountToast();
    await elapse(5000);

    page.isSettled.value = false;
    await nextTick();
    page.isSettled.value = true;
    await nextTick();

    await elapse(5000);
    expect(toast.isVisible.value).toBe(false);
    await elapse(2000);
    expect(toast.isVisible.value).toBe(true);
  });

  it('never shows without benchmark data', async () => {
    page.hasResults.value = false;
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();
  });

  it('never shows when a recruiter covers the search', async () => {
    page.hasRecruiters.value = true;
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
  });

  it('never shows when no offer serves the country', async () => {
    page.country.value = 'FR';
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
  });

  it('waits for the cookie banner to be answered before starting the delay', async () => {
    analyticsConsent.value = null;
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);

    // declining still counts as answered; the toast isn't consent-dependent, only the banner is
    analyticsConsent.value = 'denied';
    await nextTick();
    await elapse();
    expect(toast.isVisible.value).toBe(true);
  });

  it('waits for an open system toast to close, then shows immediately', async () => {
    toastState.value = { ...toastState.value, isOpen: true };
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();

    toastState.value = { ...toastState.value, isOpen: false };
    await nextTick();
    expect(toast.isVisible.value).toBe(true);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(1);
  });

  it('steps aside while a system toast opens on top of it', async () => {
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(true);

    toastState.value = { ...toastState.value, isOpen: true };
    expect(toast.isVisible.value).toBe(false);
    toastState.value = { ...toastState.value, isOpen: false };
    expect(toast.isVisible.value).toBe(true);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(1);
  });

  it('does not show if the lead card was already seen in the grid', async () => {
    seenInGrid.value = ['salary-negotiator:negotiation-grid'];
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
  });

  it('still shows if only a different partner was seen in the grid', async () => {
    seenInGrid.value = ['purple-cv:negotiation-grid'];
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(true);
  });

  it('marks the session as suppressed as soon as it shows, even if ignored', async () => {
    mountToast();
    await elapse();
    expect(sessionStorage.getItem(AFFILIATE_TOAST_STORAGE_KEY)).toBe('true');
    unmount();

    // second search, same session
    const second = mountToast();
    await elapse();
    expect(second.isVisible.value).toBe(false);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(1);
  });

  it('respects a suppression stored by an earlier page load', async () => {
    sessionStorage.setItem(AFFILIATE_TOAST_STORAGE_KEY, 'true');
    const toast = mountToast();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
  });

  it('stays suppressed for the session when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const first = mountToast();
    await elapse();
    expect(first.isVisible.value).toBe(true);
    unmount();

    const second = mountToast();
    await elapse();
    expect(second.isVisible.value).toBe(false);
  });

  it('tracks the shown offer on CTA click and closes', async () => {
    const toast = mountToast();
    await elapse();

    // a later verdict change must not alter what the click reports
    page.verdict.value = 'fair';
    toast.onCtaClick();

    expect(mockTrackAffiliateClick).toHaveBeenCalledWith({
      partner: 'salary-negotiator',
      placement: 'toast',
      country: 'UK',
      verdict: 'underpaid'
    });
    expect(toast.isVisible.value).toBe(false);
  });

  it('tracks a dismissal and closes', async () => {
    const toast = mountToast();
    await elapse();
    toast.onDismiss();

    expect(mockTrackAffiliateDismiss).toHaveBeenCalledWith({
      partner: 'salary-negotiator',
      placement: 'toast',
      country: 'UK',
      verdict: 'underpaid'
    });
    expect(toast.isVisible.value).toBe(false);
  });

  it('ignores CTA and dismiss before anything was shown', () => {
    const toast = mountToast();
    toast.onCtaClick();
    toast.onDismiss();
    expect(mockTrackAffiliateClick).not.toHaveBeenCalled();
    expect(mockTrackAffiliateDismiss).not.toHaveBeenCalled();
  });

  it('cancels the pending delay on unmount', async () => {
    const toast = mountToast();
    await elapse(3000);
    unmount();
    await elapse();
    expect(toast.isVisible.value).toBe(false);
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();
  });
});
