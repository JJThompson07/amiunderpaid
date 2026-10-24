import type { AffiliateOfferConfig, AffiliateTrackingPayload } from '~~/shared/utils/affiliates';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { getAffiliateToastCopyKeys, getLeadAffiliateOffer } from '~~/shared/utils/affiliates';
import type { SalaryVerdict } from '~~/shared/utils/verdict';

export const AFFILIATE_TOAST_DELAY_MS = 7000;
export const AFFILIATE_TOAST_STORAGE_KEY = 'affiliate_toast_suppressed';

type UseAffiliateOfferToastOptions = {
  country: MaybeRefOrGetter<string>;
  verdict: MaybeRefOrGetter<SalaryVerdict>;
  // results finished loading (no pending/resolving fetches, ambiguity modal closed)
  isSettled: MaybeRefOrGetter<boolean>;
  // government or live job data exists, i.e. not the no-data state
  hasResults: MaybeRefOrGetter<boolean>;
  hasRecruiters: MaybeRefOrGetter<boolean>;
};

type AffiliateToastCopyKeys = ReturnType<typeof getAffiliateToastCopyKeys>;

type UseAffiliateOfferToastReturn = {
  isVisible: ComputedRef<boolean>;
  offer: Ref<AffiliateOfferConfig | null>;
  copyKeys: Ref<AffiliateToastCopyKeys | null>;
  onCtaClick: () => void;
  onDismiss: () => void;
};

/**
 * Delayed, once-per-session offer toast for the lead affiliate partner on a salary results
 * page. The 7s timer only runs while the page is eligible (results loaded, has data, no
 * recruiter, cookie banner answered, not already shown this session). If a system toast is
 * open when the delay ends, it waits for that toast to close. It never shows if the user has
 * already seen the lead partner's card in the negotiation grid on this page.
 */
export const useAffiliateOfferToast = (
  options: UseAffiliateOfferToastOptions
): UseAffiliateOfferToastReturn => {
  const { analyticsConsent, trackAffiliateClick, trackAffiliateDismiss, trackAffiliateImpression } =
    useAnalytics();
  const { toastState } = useSystemToast();
  const { hasImpressionFired } = useSeenAffiliateImpressions();

  // session-lived truth; sessionStorage additionally carries it across full page reloads
  const sessionSuppressed = useState<boolean>('affiliate-toast-suppressed', () => false);

  const isOpen = ref(false);
  const delayElapsed = ref(false);
  // what was actually shown, so click/dismiss report the same partner and verdict
  const offer = ref<AffiliateOfferConfig | null>(null);
  const copyKeys = ref<AffiliateToastCopyKeys | null>(null);
  const shownPayload = ref<AffiliateTrackingPayload | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const leadOffer = computed(() =>
    getLeadAffiliateOffer(toValue(options.country), toValue(options.verdict))
  );

  const isStoredSuppressed = (): boolean => {
    try {
      return sessionStorage.getItem(AFFILIATE_TOAST_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const suppressForSession = (): void => {
    sessionSuppressed.value = true;
    try {
      sessionStorage.setItem(AFFILIATE_TOAST_STORAGE_KEY, 'true');
    } catch {
      // storage blocked (e.g. strict private browsing) - useState still covers this session
    }
  };

  // timers and storage are browser-only; the server render never schedules the toast
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser && isStoredSuppressed()) {
    sessionSuppressed.value = true;
  }

  const isEligible = computed(
    () =>
      toValue(options.isSettled) &&
      toValue(options.hasResults) &&
      !toValue(options.hasRecruiters) &&
      analyticsConsent.value !== null &&
      leadOffer.value !== null &&
      !sessionSuppressed.value
  );

  const clearTimer = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const show = (): void => {
    const lead = leadOffer.value;
    if (!lead) {
      return;
    }
    const verdict = toValue(options.verdict);

    offer.value = lead;
    copyKeys.value = getAffiliateToastCopyKeys(lead.slug, verdict);
    shownPayload.value = {
      partner: lead.slug,
      placement: 'toast',
      country: toValue(options.country),
      verdict
    };
    isOpen.value = true;

    // marked as soon as it's shown, so an ignored toast doesn't come back on the next search
    suppressForSession();
    trackAffiliateImpression(shownPayload.value);
  };

  // run (or cancel) the delay as eligibility changes
  watch(
    isEligible,
    (eligible) => {
      clearTimer();
      if (!eligible) {
        delayElapsed.value = false;
        return;
      }
      if (!isBrowser) {
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        delayElapsed.value = true;
      }, AFFILIATE_TOAST_DELAY_MS);
    },
    { immediate: true }
  );

  // show once the delay is over, waiting out any open system toast
  watch(
    () =>
      delayElapsed.value &&
      isEligible.value &&
      !toastState.value.isOpen &&
      leadOffer.value !== null &&
      !hasImpressionFired(leadOffer.value.slug, 'negotiation-grid'),
    (ready) => {
      if (ready && !isOpen.value) {
        show();
      }
    }
  );

  const close = (): void => {
    isOpen.value = false;
  };

  const onCtaClick = (): void => {
    if (shownPayload.value) {
      trackAffiliateClick(shownPayload.value);
    }
    close();
  };

  const onDismiss = (): void => {
    if (shownPayload.value) {
      trackAffiliateDismiss(shownPayload.value);
    }
    close();
  };

  onBeforeUnmount(clearTimer);

  return {
    // a system toast opening later takes the corner; the offer reappears once it closes
    isVisible: computed(() => isOpen.value && !toastState.value.isOpen),
    offer,
    copyKeys,
    onCtaClick,
    onDismiss
  };
};
