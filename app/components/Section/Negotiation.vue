<template>
  <div class="flex items-center justify-center">
    <!-- Modal Card -->
    <div
      class="relative w-full bg-white rounded-2xl shadow-2xl transform transition-all overflow-hidden flex flex-col">
      <!-- Header -->
      <div
        class="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-secondary-700">
        <h3 class="font-bold text-slate-50">Ready To Take Action?</h3>
      </div>

      <!-- Content -->
      <div class="relative p-6 overflow-y-auto flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-4">
          <!-- Card 1: Negotiation Course (Affiliate) -->
          <AmICardAction
            :icon="TrendingUp"
            premier
            header="Master Negotiations"
            strapline="Knowing your value is only the first step"
            bg-colour="bg-salary-negotiator-50/50"
            border-colour="border-salary-negotiator-100"
            hover-class="hover:border-salary-negotiator-200"
            affiliate-bg-colour="bg-salary-negotiator-100"
            affiliate-text-colour="text-salary-negotiator-600"
            sponsored>
            <template #body>
              We've partnered with
              <strong class="text-salary-negotiator-500">The Salary Negotiator</strong> to help you
              bridge the gap. Master the exact scripts and strategies used by top executives to
              secure the pay you actually deserve.
            </template>
            <template #cta>
              <a
                href="https://thesalarynegotiator.com/courses?ref=ndlknjh"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white bg-salary-negotiator-500 rounded-lg hover:bg-salary-negotiator-700 transition-colors shadow-md"
                >Explore Courses</a
              >
            </template>
          </AmICardAction>

          <!-- Card 2: CV Help (Affiliate) -->
          <AmICardAction
            :icon="FileText"
            premier
            header="Career Progression"
            strapline="Templates alone don't win interviews"
            bg-colour="bg-purple-cv-50/50"
            border-colour="border-purple-cv-100"
            hover-class="hover:border-purple-cv-200"
            affiliate-bg-colour="bg-purple-cv-100"
            affiliate-text-colour="text-purple-cv-600"
            sponsored>
            <template #body>
              Position yourself for your next big move with a professionally written CV from
              <strong class="text-purple-cv-900">PurpleCV</strong>. Their experts design documents
              specifically to beat the algorithms and stand out to recruiters.
            </template>
            <template #cta>
              <a
                href="https://purplecv.co.uk/cv-writing?wpam_id=1293"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white bg-purple-cv-900 rounded-lg hover:bg-purple-cv-700 transition-colors shadow-md"
                >PurpleCV</a
              >
            </template>
          </AmICardAction>

          <!-- Card 3: UK only free CV review (Affiliate)-->
          <LazyAmICardAction
            v-if="country === 'UK' && !isXl"
            bg-colour="bg-cv-library-50/50"
            border-colour="border-cv-library-100"
            hover-class="hover:border-cv-library-200"
            affiliate-bg-colour="bg-cv-library-100"
            affiliate-text-colour="text-cv-library-700"
            :icon="FileUser"
            header="Get Discovered"
            strapline="Find a job that works for you, fast"
            sponsored>
            <template #body>
              Register your free CV on the UK's leading job site (<strong
                class="text-cv-library-700"
                >CV-Library</strong
              >) and let top employers come to you - it's fast, easy and free.
            </template>
            <template #cta>
              <a
                href="https://www.cv-library.co.uk/register?id=107202"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white bg-cv-library-700 rounded-lg hover:bg-cv-library-500 transition-colors shadow-md"
                >Register CV</a
              >
            </template>
          </LazyAmICardAction>

          <!-- Card 4: Free Script (The 'Quick Win') -->
          <AmICardAction
            header="Email Template"
            strapline="A template script to help you start the conversation."
            :icon="Mail">
            <template #body>
              Whether you're underpaid or looking to justify a raise, use this script to confidently
              communicate your value and set up a discussion with your manager.
            </template>
            <template #cta>
              <AmIButton
                bg-colour="bg-white"
                animation-colour="bg-slate-200"
                text-colour="text-slate-900"
                class="border-slate-300 border"
                @click="toggleScript">
                {{ showScript ? 'Hide Script' : 'View Script' }}
              </AmIButton>
            </template>
          </AmICardAction>
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
import { Copy, CheckCircle2, TrendingUp, FileText, Mail, FileUser } from 'lucide-vue-next';
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

// ** watchers **
</script>
