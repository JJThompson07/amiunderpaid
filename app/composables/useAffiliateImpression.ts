import type {
  AffiliatePartnerSlug,
  AffiliatePlacement,
  AffiliateTrackingPayload
} from '~~/shared/utils/affiliates';
import type { ComponentPublicInstance } from 'vue';

type ImpressionTarget = Element | ComponentPublicInstance | null;

type UseAffiliateImpressionReturn = {
  observeImpression: (target: ImpressionTarget, getPayload: () => AffiliateTrackingPayload) => void;
};

// share of an element that must be on screen before it counts as seen
export const IMPRESSION_THRESHOLD = 0.5;

type UseSeenAffiliateImpressionsReturn = {
  markImpressionSeen: (partner: AffiliatePartnerSlug, placement: AffiliatePlacement) => void;
  hasImpressionFired: (partner: AffiliatePartnerSlug, placement: AffiliatePlacement) => boolean;
  resetSeenImpressions: () => void;
};

const seenKey = (partner: AffiliatePartnerSlug, placement: AffiliatePlacement): string =>
  `${partner}:${placement}`;

/**
 * Which affiliate cards the user has seen on the current results page, shared across
 * components (e.g. so the offer toast can skip a partner already seen in the grid).
 * The results page resets it in setup, before its children register, so it is scoped to
 * one page view. This is separate from each useAffiliateImpression instance's own
 * once-per-page-view dedupe, which drives the impression events themselves.
 *
 * Call it during setup: the returned functions are safe to use later, e.g. from timers.
 */
export const useSeenAffiliateImpressions = (): UseSeenAffiliateImpressionsReturn => {
  const seen = useState<string[]>('affiliate-page-seen-impressions', () => []);

  return {
    markImpressionSeen: (partner, placement): void => {
      const key = seenKey(partner, placement);
      if (!seen.value.includes(key)) {
        seen.value = [...seen.value, key];
      }
    },
    hasImpressionFired: (partner, placement): boolean =>
      seen.value.includes(seenKey(partner, placement)),
    resetSeenImpressions: (): void => {
      seen.value = [];
    }
  };
};

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
  const { markImpressionSeen } = useSeenAffiliateImpressions();

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
      const key = seenKey(payload.partner, payload.placement);
      if (fired.has(key)) {
        continue;
      }

      fired.add(key);
      markImpressionSeen(payload.partner, payload.placement);
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
