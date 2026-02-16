<template>
  <div class="flex items-center justify-center">
    <!-- Modal Card -->
    <div
      class="relative w-full bg-white rounded-2xl shadow-2xl transform transition-all overflow-hidden flex flex-col">
      <!-- Header -->
      <div
        class="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-secondary-800">
        <h3 class="font-bold text-slate-50">Ready To Take Action?</h3>
      </div>

      <!-- Content -->
      <div class="relative p-6 overflow-y-auto flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-4">
          <!-- Loop through cards -->
          <component
            :is="card.component || AmICardAction"
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
              <span v-html="card.bodyHtml"></span>
            </template>
            <template #cta>
              <!-- Link CTA -->
              <a
                v-if="card.ctaType === 'link'"
                :href="card.ctaUrl"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white rounded-lg transition-colors shadow-md"
                :class="card.ctaClass"
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
          </component>
        </div>

        <!-- Collapsible Script Section -->
        <ModalGeneric v-model="showScript">
          <div class="space-y-4 p-4">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-slate-700 text-sm">Your Custom Email Script</h4>
              <button
                class="text-xs font-bold text-secondary-600 flex items-center gap-1 hover:text-secondary-800"
                @click="copyToClipboard">
                <component :is="copied ? CheckCircle2 : Copy" class="w-3 h-3" />
                {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
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
import { Copy, CheckCircle2, TrendingUp, FileText, Mail, Binoculars } from 'lucide-vue-next';
import { AmICardAction, LazyAmICardAction } from '#components';
import { ref, computed } from 'vue';
// ** type definitions **

// ** props **
const props = defineProps<{
  title: string;
  currentSalary: number;
  marketAverage: number;
  currencySymbol: string;
  country: string;
}>();

// ** emits **
defineEmits(['close']);

// ** data & refs **
const copied = ref(false);
const showScript = ref(false);
const { trackResultAction } = useAnalytics();
const { isXl } = useViewport();

// ** computed properties **
const isUnderpaid = computed(() => props.marketAverage > props.currentSalary);

const emailSubject = computed(() => `Salary Review Discussion - ${props.title} Role`);

const emailBody = computed(() => {
  const emailBody = isUnderpaid.value
    ? `Based on my recent research into the current market for ${props.title} roles, the average benchmark is currently ${props.currencySymbol}${props.marketAverage.toLocaleString()}.

Given my recent contributions to [Project/Team Name] and the current market rate, I would like to discuss bringing my salary closer to this benchmark (${props.currencySymbol}${props.marketAverage.toLocaleString()}).

I'm keen to continue delivering value to the team and would appreciate the opportunity to discuss this further.`
    : `Over the past year, I have [mention 1-2 key achievements]. I am keen to discuss how my compensation can evolve to reflect these increased responsibilities and the value I am delivering to the team.

When would be a good time to chat?`;

  return `Subject: ${emailSubject.value}

Hi [Manager Name],

I hope you're having a good week.

I'm writing to request a meeting to discuss my current role and a salary alignment. 

${emailBody}

Best regards,
[Your Name]`;
});

// ** methods **
const toggleScript = () => {
  showScript.value = !showScript.value;

  // only track the action when the user views the script, not when they hide it
  if (showScript.value) {
    trackResultAction('view_script');
  }
};

const copyToClipboard = async () => {
  await navigator.clipboard.writeText(emailBody.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

const cards = computed(() => {
  const list = [
    {
      id: 1,
      component: undefined,
      header: 'Master Negotiations',
      strapline: 'Knowing your value is only the first step',
      icon: TrendingUp,
      premier: true,
      sponsored: true,
      bgColour: 'bg-salary-negotiator-50/50',
      borderColour: 'border-salary-negotiator-100',
      hoverClass: 'hover:border-salary-negotiator-200',
      affiliateBgColour: 'bg-salary-negotiator-100',
      affiliateTextColour: 'text-salary-negotiator-600',
      bodyHtml: `We've partnered with <strong class="text-salary-negotiator-500">The Salary Negotiator</strong> to help you bridge the gap. Master the exact scripts and strategies used by top executives to secure the pay you actually deserve.`,
      ctaType: 'link',
      ctaUrl: 'https://thesalarynegotiator.com/courses?ref=ndlknjh',
      ctaText: 'Explore Courses',
      ctaClass: 'bg-salary-negotiator-500 hover:bg-salary-negotiator-700'
    },
    {
      id: 2,
      component: undefined,
      header: 'Career Progression',
      strapline: "Templates alone don't win interviews",
      icon: FileText,
      premier: true,
      sponsored: true,
      bgColour: 'bg-purple-cv-50/50',
      borderColour: 'border-purple-cv-100',
      hoverClass: 'hover:border-purple-cv-200',
      affiliateBgColour: 'bg-purple-cv-100',
      affiliateTextColour: 'text-purple-cv-600',
      bodyHtml: `Position yourself for your next big move with a professionally written CV from <strong class="text-purple-cv-900">PurpleCV</strong>. Their experts design documents specifically to beat the algorithms and stand out to recruiters.`,
      ctaType: 'link',
      ctaUrl: 'https://purplecv.co.uk/cv-writing?wpam_id=1293',
      ctaText: 'PurpleCV',
      ctaClass: 'bg-purple-cv-900 hover:bg-purple-cv-700'
    },
    {
      id: 3,
      component: LazyAmICardAction,
      header: 'Get Discovered',
      strapline: 'Find a job that works for you, fast',
      icon: Binoculars,
      sponsored: true,
      bgColour: 'bg-cv-library-50/50',
      borderColour: 'border-cv-library-100',
      hoverClass: 'hover:border-cv-library-200',
      affiliateBgColour: 'bg-cv-library-100',
      affiliateTextColour: 'text-cv-library-700',
      bodyHtml: `Register your free CV on the UK's leading job site (<strong class="text-cv-library-700">CV-Library</strong>) and let top employers come to you - it's fast, easy and free.`,
      ctaType: 'link',
      ctaUrl: 'https://www.cv-library.co.uk/register?id=107202',
      ctaText: 'Register CV',
      ctaClass: 'bg-cv-library-700 hover:bg-cv-library-500'
    },
    {
      id: 4,
      component: undefined,
      header: 'Email Template',
      strapline: 'A template script to help you start the conversation.',
      icon: Mail,
      bodyHtml: `Whether you're underpaid or looking to justify a raise, use this script to confidently communicate your value and set up a discussion with your manager.`,
      ctaType: 'button',
      ctaText: showScript.value ? 'Hide Script' : 'View Script',
      ctaAction: toggleScript,
      ctaProps: {
        bgColour: 'bg-white',
        animationColour: 'bg-slate-200',
        textColour: 'text-slate-900',
        class: 'border-slate-300 border'
      }
    }
  ];

  return !isXl.value && props.country === 'UK'
    ? list
    : (list.filter((item) => !item.component) as typeof list);
});

// ** watchers **
</script>
