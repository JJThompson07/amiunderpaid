<template>
  <div class="flex items-center justify-center">
    <!-- Modal Card -->
    <div
      class="relative w-full bg-white rounded-2xl shadow-2xl transform transition-all overflow-hidden flex flex-col">
      <!-- Header -->
      <div
        class="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-secondary-800">
        <h3 class="font-bold text-slate-50">{{ $t('sections.negotiation.title') }}</h3>
      </div>

      <!-- Content -->
      <div class="relative p-6 overflow-y-auto flex flex-col gap-6">
        <div
          class="grid grid-cols-1 gap-4"
          :class="country === 'USA' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'">
          <!-- Loop through cards -->
          <AmICardAction
            v-for="card in cards"
            :key="card.header"
            :icon="card.icon"
            :premier="card.premier"
            :header="card.header"
            :strapline="card.strapline"
            :bg-colour="card.bgColour"
            :border-colour="card.borderColour"
            :hover-class="card.hoverClass"
            :affiliate-bg-colour="card.affiliateBgColour"
            :affiliate-text-colour="card.affiliateTextColour"
            :sponsored="card.sponsored">
            <template #body>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="card.bodyHtml" />
            </template>
            <template #cta>
              <!-- Link CTA -->
              <a
                v-if="card.ctaType === 'link'"
                :ref="(el) => registerImpression(el, card.partner)"
                :href="card.ctaUrl"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white rounded-lg transition-colors shadow-md"
                :class="card.ctaClass"
                @click="onAffiliateClick(card.partner)"
                @auxclick.middle="onAffiliateClick(card.partner)"
                >{{ card.ctaText }}</a
              >
              <!-- Button CTA -->
              <AmIButton
                v-else-if="card.ctaType === 'button'"
                v-bind="card.ctaProps"
                @click="card.ctaAction">
                {{ card.ctaText }}
              </AmIButton>
            </template>
          </AmICardAction>
        </div>

        <!-- Collapsible Script Section -->
        <ModalGeneric v-model="showScript">
          <div class="space-y-4 p-4">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-700 text-sm">
                {{ $t('sections.negotiation.custom-email-script') }}
              </h4>
              <button
                class="text-xs font-bold text-secondary-600 flex items-center gap-1 hover:text-secondary-800"
                @click="copyToClipboard">
                <component :is="copied ? CheckCircle2 : Copy" class="w-3 h-3" />
                {{ copied ? $t('sections.negotiation.copied') : $t('sections.negotiation.copy') }}
              </button>
            </div>

            <div
              class="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm whitespace-pre-wrap leading-relaxed select-all">
              {{ emailBody }}
            </div>
          </div>
        </ModalGeneric>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// imports
import { Binoculars, CheckCircle2, Copy, FileText, Mail, TrendingUp } from 'lucide-vue-next';
import type { AffiliatePartnerSlug, AffiliateTrackingPayload } from '~~/shared/utils/affiliates';
import type { Component, ComponentPublicInstance } from 'vue';
import { computed, ref } from 'vue';
import { calculateSalaryVerdict } from '~~/shared/utils/verdict';
import { getOrderedAffiliateOffers } from '~~/shared/utils/affiliates';
// ** type definitions **
type CardTheme = {
  icon: Component;
  bgColour: string;
  borderColour: string;
  hoverClass: string;
  affiliateBgColour: string;
  affiliateTextColour: string;
  nameClass: string;
  ctaClass: string;
};

// presentation stays here rather than in the server-importable offer registry
const CARD_THEMES: Record<AffiliatePartnerSlug, CardTheme> = {
  'salary-negotiator': {
    icon: TrendingUp,
    bgColour: 'bg-salary-negotiator-50/50',
    borderColour: 'border-salary-negotiator-100',
    hoverClass: 'hover:border-salary-negotiator-200',
    affiliateBgColour: 'bg-salary-negotiator-100',
    affiliateTextColour: 'text-salary-negotiator-600',
    nameClass: 'text-salary-negotiator-500',
    ctaClass: 'bg-salary-negotiator-500 hover:bg-salary-negotiator-700'
  },
  'purple-cv': {
    icon: FileText,
    bgColour: 'bg-purple-cv-50/50',
    borderColour: 'border-purple-cv-100',
    hoverClass: 'hover:border-purple-cv-200',
    affiliateBgColour: 'bg-purple-cv-100',
    affiliateTextColour: 'text-purple-cv-600',
    nameClass: 'text-purple-cv-700',
    ctaClass: 'bg-purple-cv-900 hover:bg-purple-cv-700'
  },
  'cv-library': {
    icon: Binoculars,
    bgColour: 'bg-cv-library-50/50',
    borderColour: 'border-cv-library-100',
    hoverClass: 'hover:border-cv-library-200',
    affiliateBgColour: 'bg-cv-library-100',
    affiliateTextColour: 'text-cv-library-700',
    nameClass: 'text-cv-library-700',
    ctaClass: 'bg-cv-library-700 hover:bg-cv-library-500'
  }
};

// ** props **
const props = defineProps<{
  title: string;
  currentSalary: number;
  marketAverage: number;
  currencySymbol: string;
  country: string;
}>();

// ** emits **
defineEmits<{
  (e: 'close'): void;
}>();

// ** data & refs **
const copied = ref(false);
const showScript = ref(false);
const { trackAffiliateClick, trackResultAction } = useAnalytics();
const { observeImpression } = useAffiliateImpression();

// ** computed properties **
const verdict = computed(() => calculateSalaryVerdict(props.currentSalary, props.marketAverage));

const emailSubject = computed(() => `Salary Review Discussion - ${props.title} Role`);

const emailBody = computed(() => {
  // within the ±2.5% band the user is fairly paid, so they get the incentive script
  const emailBody =
    verdict.value === 'underpaid'
      ? $t('email.body.underpaid', {
          title: props.title,
          currency: props.currencySymbol,
          average: props.marketAverage.toLocaleString()
        })
      : $t('email.body.incentive');

  return `${$t('email.subject', { subject: emailSubject.value })}${$t('email.intro')}${emailBody}${$t('email.closing')}`;
});

// ** methods **
const toggleScript = (): void => {
  showScript.value = !showScript.value;

  // only track the action when the user views the script, not when they hide it
  if (showScript.value) {
    trackResultAction('view_script');
  }
};

const affiliatePayload = (partner: AffiliatePartnerSlug): AffiliateTrackingPayload => ({
  partner,
  placement: 'negotiation-grid',
  country: props.country,
  verdict: verdict.value
});

const onAffiliateClick = (partner: AffiliatePartnerSlug | undefined): void => {
  if (partner) {
    trackAffiliateClick(affiliatePayload(partner));
  }
};

const registerImpression = (
  el: Element | ComponentPublicInstance | null,
  partner: AffiliatePartnerSlug | undefined
): void => {
  if (partner) {
    observeImpression(el, () => affiliatePayload(partner));
  }
};

const copyToClipboard = async (): Promise<void> => {
  await navigator.clipboard.writeText(emailBody.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

const cards = computed(() => {
  const affiliateCards = getOrderedAffiliateOffers(props.country, verdict.value).map((offer) => {
    const theme = CARD_THEMES[offer.slug];
    return {
      header: $t(offer.titleKey),
      strapline: $t(offer.straplineKey),
      icon: theme.icon,
      premier: offer.premier,
      sponsored: offer.sponsored,
      bgColour: theme.bgColour,
      borderColour: theme.borderColour,
      hoverClass: theme.hoverClass,
      affiliateBgColour: theme.affiliateBgColour,
      affiliateTextColour: theme.affiliateTextColour,
      bodyHtml: $t(offer.bodyHtmlKey, {
        name: `<strong class="${theme.nameClass}">${$t(offer.nameKey)}</strong>`
      }),
      ctaType: 'link' as const,
      partner: offer.slug,
      ctaUrl: offer.url,
      ctaText: $t(offer.ctaTextKey),
      ctaClass: theme.ctaClass,
      ctaAction: undefined,
      ctaProps: undefined
    };
  });

  // the free email script always closes the grid
  const scriptCard = {
    header: $t('sections.negotiation.custom.title'),
    strapline: $t('sections.negotiation.custom.strapline'),
    icon: Mail,
    premier: false,
    sponsored: false,
    bgColour: undefined,
    borderColour: undefined,
    hoverClass: undefined,
    affiliateBgColour: undefined,
    affiliateTextColour: undefined,
    bodyHtml: $t('sections.negotiation.custom.body-html'),
    ctaType: 'button' as const,
    partner: undefined,
    ctaUrl: undefined,
    ctaText: showScript.value
      ? $t('sections.negotiation.custom.cta-hide')
      : $t('sections.negotiation.custom.cta-show'),
    ctaClass: undefined,
    ctaAction: toggleScript,
    ctaProps: {
      bgColour: 'bg-white',
      animationColour: 'bg-slate-200',
      textColour: 'text-slate-900',
      class: 'border-slate-300 border'
    }
  };

  return [...affiliateCards, scriptCard];
});

// ** watchers **
</script>
