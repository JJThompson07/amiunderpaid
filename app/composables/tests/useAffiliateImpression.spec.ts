import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AffiliateTrackingPayload } from '~~/shared/utils/affiliates';
import {
  IMPRESSION_THRESHOLD,
  useAffiliateImpression,
  useSeenAffiliateImpressions
} from '../useAffiliateImpression';

const mockTrackAffiliateImpression = vi.fn();
vi.stubGlobal('useAnalytics', () => ({ trackAffiliateImpression: mockTrackAffiliateImpression }));

// minimal useState: one shared ref per key, like Nuxt's app-level state
let stateStore = new Map<string, { value: unknown }>();
vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
  if (!stateStore.has(key)) {
    stateStore.set(key, { value: init() });
  }
  return stateStore.get(key) as { value: T };
});

let unmountHooks: (() => void)[] = [];
vi.stubGlobal('onBeforeUnmount', (fn: () => void) => unmountHooks.push(fn));

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  options: IntersectionObserverInit | undefined;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(target: Element, isIntersecting = true): void {
    this.callback([{ target, isIntersecting }]);
  }
}

const payload = (overrides: Partial<AffiliateTrackingPayload> = {}): AffiliateTrackingPayload => ({
  partner: 'purple-cv',
  placement: 'negotiation-grid',
  country: 'UK',
  verdict: 'fair',
  ...overrides
});

const latestObserver = (): MockIntersectionObserver => {
  const observer = MockIntersectionObserver.instances.at(-1);
  if (!observer) {
    throw new Error('no IntersectionObserver was created');
  }
  return observer;
};

describe('useAffiliateImpression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unmountHooks = [];
    stateStore = new Map();
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('does not fire on registration, only once the element intersects', () => {
    const { observeImpression } = useAffiliateImpression();
    const el = document.createElement('a');

    observeImpression(el, () => payload());
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();
    expect(latestObserver().observe).toHaveBeenCalledWith(el);
    expect(latestObserver().options).toEqual({ threshold: IMPRESSION_THRESHOLD });

    latestObserver().trigger(el, false);
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();

    latestObserver().trigger(el);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledWith(payload());
    expect(latestObserver().unobserve).toHaveBeenCalledWith(el);
  });

  it('fires each card independently', () => {
    const { observeImpression } = useAffiliateImpression();
    const top = document.createElement('a');
    const bottom = document.createElement('a');

    observeImpression(top, () => payload({ partner: 'salary-negotiator' }));
    observeImpression(bottom, () => payload({ partner: 'cv-library' }));

    latestObserver().trigger(top);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(1);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledWith(
      payload({ partner: 'salary-negotiator' })
    );

    latestObserver().trigger(bottom);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(2);
  });

  it('does not re-fire for the same partner and placement', () => {
    const { observeImpression } = useAffiliateImpression();
    const el = document.createElement('a');
    const replacement = document.createElement('a');

    observeImpression(el, () => payload());
    latestObserver().trigger(el);
    latestObserver().trigger(el);

    // a re-rendered element for the same partner/placement is still deduplicated
    observeImpression(replacement, () => payload());
    latestObserver().trigger(replacement);

    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(1);
  });

  it('observes an element once but reports the latest payload', () => {
    const { observeImpression } = useAffiliateImpression();
    const el = document.createElement('a');

    observeImpression(el, () => payload({ verdict: 'unknown' }));
    observeImpression(el, () => payload({ verdict: 'underpaid' }));
    expect(latestObserver().observe).toHaveBeenCalledTimes(1);

    latestObserver().trigger(el);
    expect(mockTrackAffiliateImpression).toHaveBeenCalledWith(payload({ verdict: 'underpaid' }));
  });

  it('resolves component instances to their root element', () => {
    const { observeImpression } = useAffiliateImpression();
    const el = document.createElement('div');

    observeImpression({ $el: el } as never, () => payload());
    expect(latestObserver().observe).toHaveBeenCalledWith(el);
  });

  it('ignores null refs and components without an element root', () => {
    const { observeImpression } = useAffiliateImpression();

    observeImpression(null, () => payload());
    observeImpression({ $el: document.createComment('async') } as never, () => payload());

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('ignores entries for elements it did not register', () => {
    const { observeImpression } = useAffiliateImpression();
    observeImpression(document.createElement('a'), () => payload());

    latestObserver().trigger(document.createElement('a'));
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();
  });

  it('is a safe no-op without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    Reflect.deleteProperty(window, 'IntersectionObserver');

    const { observeImpression } = useAffiliateImpression();
    expect(() => observeImpression(document.createElement('a'), () => payload())).not.toThrow();
    expect(() => unmountHooks.forEach((hook) => hook())).not.toThrow();
    expect(mockTrackAffiliateImpression).not.toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    const { observeImpression } = useAffiliateImpression();
    observeImpression(document.createElement('a'), () => payload());

    unmountHooks.forEach((hook) => hook());
    expect(latestObserver().disconnect).toHaveBeenCalled();
  });
});

describe('useSeenAffiliateImpressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unmountHooks = [];
    stateStore = new Map();
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('records a card as seen once its impression fires', () => {
    const { observeImpression } = useAffiliateImpression();
    const { hasImpressionFired } = useSeenAffiliateImpressions();
    const el = document.createElement('a');

    observeImpression(el, () => payload());
    expect(hasImpressionFired('purple-cv', 'negotiation-grid')).toBe(false);

    latestObserver().trigger(el);
    expect(hasImpressionFired('purple-cv', 'negotiation-grid')).toBe(true);
    expect(hasImpressionFired('purple-cv', 'toast')).toBe(false);
    expect(hasImpressionFired('salary-negotiator', 'negotiation-grid')).toBe(false);
  });

  it('shares seen state between separate composable instances', () => {
    const { markImpressionSeen } = useSeenAffiliateImpressions();
    const { hasImpressionFired } = useSeenAffiliateImpressions();

    markImpressionSeen('cv-library', 'negotiation-grid');
    markImpressionSeen('cv-library', 'negotiation-grid');
    expect(hasImpressionFired('cv-library', 'negotiation-grid')).toBe(true);
    expect(stateStore.get('affiliate-page-seen-impressions')?.value).toEqual([
      'cv-library:negotiation-grid'
    ]);
  });

  it('clears seen state on reset', () => {
    const { hasImpressionFired, markImpressionSeen, resetSeenImpressions } =
      useSeenAffiliateImpressions();

    markImpressionSeen('purple-cv', 'negotiation-grid');
    resetSeenImpressions();
    expect(hasImpressionFired('purple-cv', 'negotiation-grid')).toBe(false);
  });

  it('re-fires grid impressions on a second search while seen state resets', () => {
    // first results page
    const firstPage = useSeenAffiliateImpressions();
    firstPage.resetSeenImpressions();
    const firstGrid = useAffiliateImpression();
    const firstEl = document.createElement('a');
    firstGrid.observeImpression(firstEl, () => payload());
    latestObserver().trigger(firstEl);
    unmountHooks.forEach((hook) => hook());
    unmountHooks = [];

    // second search: the page resets seen state in setup, then the grid mounts again
    const secondPage = useSeenAffiliateImpressions();
    secondPage.resetSeenImpressions();
    expect(secondPage.hasImpressionFired('purple-cv', 'negotiation-grid')).toBe(false);

    const secondGrid = useAffiliateImpression();
    const secondEl = document.createElement('a');
    secondGrid.observeImpression(secondEl, () => payload());
    latestObserver().trigger(secondEl);

    expect(mockTrackAffiliateImpression).toHaveBeenCalledTimes(2);
    expect(secondPage.hasImpressionFired('purple-cv', 'negotiation-grid')).toBe(true);
  });
});
