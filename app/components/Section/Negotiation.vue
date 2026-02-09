<template>
  <div class="flex items-center justify-center">
    <!-- Modal Card -->
    <div
      class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl transform transition-all overflow-hidden flex flex-col">
      <!-- Header -->
      <div
        class="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-secondary-700">
        <h3 class="font-bold text-slate-50">Ready To Take Action?</h3>
      </div>

      <!-- Content -->
      <div class="relative p-6 overflow-y-auto flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Card 1: Negotiation Course (Affiliate) -->
          <div
            class="flex flex-col gap-4 h-full p-4 border border-salary-negotiator-100 rounded-xl bg-salary-negotiator-50/50 hover:border-salary-negotiator-200 transition-colors relative overflow-hidden">
            <div
              class="absolute top-0 right-0 px-2 py-1 bg-primary-100 text-[10px] font-bold text-primary-600 rounded-bl-lg">
              PREMIER
            </div>
            <div class="flex flex-col gap-4">
              <div class="flex gap-2 items-center">
                <div
                  class="w-10 h-10 flex items-center justify-center rounded-full bg-salary-negotiator-100 text-salary-negotiator-600">
                  <TrendingUp class="w-5 h-5" />
                </div>
                <h4 class="text-lg font-bold text-slate-900">Master Negotiations</h4>
              </div>
              <div class="text-xs text-slate-600 flex flex-col gap-2">
                <p><strong>Knowing your value is only the first step.</strong></p>
                <p>
                  We've partnered with
                  <strong class="text-salary-negotiator-500">The Salary Negotiator</strong> to help
                  you bridge the gap. Master the exact scripts and strategies used by top executives
                  to secure the pay you actually deserve.
                </p>
                <p class="text-right"><small>(Sponsored)</small></p>
              </div>
            </div>
            <div class="mt-auto">
              <a
                href="https://thesalarynegotiator.com/courses?ref=ndlknjh"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white bg-salary-negotiator-500 rounded-lg hover:bg-salary-negotiator-700 transition-colors shadow-md"
                >Explore Courses</a
              >
            </div>
          </div>

          <!-- Card 2: CV Help (Affiliate) -->
          <div
            class="flex flex-col gap-4 h-full p-4 border border-purple-cv-100 rounded-xl bg-purple-cv-50/50 hover:border-purple-cv-200 transition-colors overflow-hidden relative">
            <div
              class="absolute top-0 right-0 px-2 py-1 bg-primary-100 text-2xs font-bold text-primary-600 rounded-bl-lg">
              PREMIER
            </div>
            <div class="mb-4 flex flex-col gap-4">
              <div class="flex gap-2 items-center">
                <div
                  class="w-10 h-10 flex items-center justify-center rounded-full bg-purple-cv-100 text-purple-cv-600">
                  <FileText class="w-5 h-5" />
                </div>
                <h4 class="text-lg font-bold text-slate-900">Career Progression</h4>
              </div>
              <div v-if="country === 'USA'" class="text-xs text-slate-600 flex flex-col gap-2">
                <p><strong>Templates alone don't win interviews.</strong></p>
                <p>
                  Position yourself for your next big move with a professionally written CV from
                  <strong class="text-resumeble-700">Resumeble</strong>. Their experts design
                  documents specifically to beat the algorithms and stand out to recruiters.
                </p>
                <p class="text-right"><small>(Sponsored)</small></p>
              </div>
              <div v-else class="text-xs text-slate-600 flex flex-col gap-2">
                <p><strong>Templates alone don't win interviews.</strong></p>
                <p>
                  Position yourself for your next big move with a professionally written CV from
                  <strong class="text-purple-cv-900">PurpleCV</strong>. Their experts design
                  documents specifically to beat the algorithms and stand out to recruiters.
                </p>
                <p class="text-right"><small>(Sponsored)</small></p>
              </div>
            </div>
            <div class="mt-auto">
              <AmIButton v-if="country === 'USA'" disabled class="text-center"
                >Coming Soon</AmIButton
              >
              <a
                v-else
                href="https://purplecv.co.uk/cv-writing?wpam_id=1293"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white bg-purple-cv-900 rounded-lg hover:bg-purple-cv-700 transition-colors shadow-md"
                >PurpleCV</a
              >
            </div>
          </div>

          <!-- Card 3: UK only free CV review (Affiliate)-->
          <div
            v-if="country === 'UK'"
            class="flex flex-col gap-4 h-full p-4 border border-cv-library-100 rounded-xl bg-cv-library-50/50 hover:border-cv-library-200 transition-colors">
            <div class="flex gap-2 items-center">
              <div
                class="w-10 h-10 flex items-center justify-center rounded-full bg-cv-library-100 text-cv-library-600">
                <FileUser class="w-5 h-5" />
              </div>
              <h4 class="text-lg font-bold text-slate-900">Free CV Review</h4>
            </div>
            <div class="text-xs text-slate-600 flex flex-col gap-2">
              <p><strong>Not sure if your CV is up to scratch?</strong></p>
              <p>
                Get a free CV review from the experts at
                <strong class="text-cv-library-700">CVLibrary</strong>. Create an account, upload
                your CV, and receive personalized feedback to help you stand out in the competitive
                UK job market.
              </p>
              <p class="text-right"><small>(Sponsored)</small></p>
            </div>
            <div class="mt-auto">
              <a
                href="https://www.cv-library.co.uk/register?id=107202"
                target="_blank"
                rel="sponsored"
                class="block w-full p-3 text-center text-sm font-bold text-white bg-cv-library-700 rounded-lg hover:bg-cv-library-500 transition-colors shadow-md"
                >Get My Free Review</a
              >
            </div>
          </div>

          <!-- Card 4: Free Script (The 'Quick Win') -->
          <div
            class="flex flex-col gap-4 h-full p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-slate-300 transition-colors">
            <div class="flex flex-col gap-4">
              <div class="flex gap-2 items-center">
                <div
                  class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  <Mail class="w-5 h-5" />
                </div>
                <h4 class="text-lg font-bold text-slate-900">Email Template</h4>
              </div>
              <div class="text-xs text-slate-500 flex flex-col gap-2">
                <p>A template script to help you start the conversation.</p>
                <p>
                  Whether you're underpaid or looking to justify a raise, use this script to
                  confidently communicate your value and set up a discussion with your manager.
                </p>
              </div>
            </div>
            <div class="mt-auto">
              <AmIButton
                bg-colour="bg-white"
                animation-colour="bg-slate-200"
                text-colour="text-slate-900"
                class="border-slate-300 border"
                @click="toggleScript">
                {{ showScript ? 'Hide Script' : 'View Script' }}
              </AmIButton>
            </div>
          </div>
        </div>

        <!-- Collapsible Script Section -->
        <div
          v-if="showScript"
          class="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div class="space-y-4">
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
        </div>
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
