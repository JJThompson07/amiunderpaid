import type { AffiliateTrackingPayload } from '~~/shared/utils/affiliates';
import type { ComponentPublicInstance } from 'vue';

type ImpressionTarget = Element | ComponentPublicInstance | null;

type UseAffiliateImpressionReturn = {
  observeImpression: (target: ImpressionTarget, getPayload: () => AffiliateTrackingPayload) => void;
};

// share of an element that must be on screen before it counts as seen
export const IMPRESSION_THRESHOLD = 0.5;

const resolveElement = (target: ImpressionTarget): Element | null => {
  if (!target) {
    return null;
  }
  if (target instanceof Element) {
    return target;
  }
  return target.$el instanceof Element ? target.$el : null;
};

/**
 * Fires `affiliate_impression` once per (partner, placement) when that affiliate element is
 * actually scrolled into view. Use one instance per page/component, and register each card
 * individually so cards below the fold on mobile aren't counted early:
 *
 *   :ref="(el) => observeImpression(el, () => payloadFor(card))"
 *
 * The payload is read when the element intersects, not when it registers, so a verdict that
 * changes after late-loading market data is still reported correctly.
 */
export const useAffiliateImpression = (): UseAffiliateImpressionReturn => {
  const { trackAffiliateImpression } = useAnalytics();

  const fired = new Set<string>();
  const payloadGetters = new WeakMap<Element, () => AffiliateTrackingPayload>();
  let observer: IntersectionObserver | null = null;

  const handleEntries = (entries: IntersectionObserverEntry[]): void => {
    for (const entry of entries) {
      const getPayload = payloadGetters.get(entry.target);
      if (!entry.isIntersecting || !getPayload) {
        continue;
      }

      observer?.unobserve(entry.target);

      const payload = getPayload();
      const key = `${payload.partner}:${payload.placement}`;
      if (fired.has(key)) {
        continue;
      }

      fired.add(key);
      trackAffiliateImpression(payload);
    }
  };

  const getObserver = (): IntersectionObserver | null => {
    // SSR and older browsers: no observer, no impressions, no errors
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return null;
    }
    if (!observer) {
      observer = new IntersectionObserver(handleEntries, { threshold: IMPRESSION_THRESHOLD });
    }
    return observer;
  };

  const observeImpression = (
    target: ImpressionTarget,
    getPayload: () => AffiliateTrackingPayload
  ): void => {
    const element = resolveElement(target);
    if (!element) {
      return;
    }

    // function refs re-run on every render; keep the latest getter, observe only once
    const alreadyRegistered = payloadGetters.has(element);
    payloadGetters.set(element, getPayload);
    if (alreadyRegistered) {
      return;
    }

    getObserver()?.observe(element);
  };

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return { observeImpression };
};
