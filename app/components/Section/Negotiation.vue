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
      <div class="relative p-6 overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Card 1: Free Script (The 'Quick Win') -->
          <div
            class="flex flex-col h-full p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-slate-300 transition-colors">
            <div class="mb-4">
              <div
                class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 mb-3">
                <Mail class="w-5 h-5" />
              </div>
              <h4 class="text-lg font-bold text-slate-900">Email Template</h4>
              <p class="text-xs text-slate-500 mt-1">
                A proven script to initiate the conversation with your manager.
              </p>
            </div>
            <div class="mt-auto pt-4">
              <button
                class="block w-full py-2.5 text-center text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                @click="toggleScript">
                {{ showScript ? 'Hide Script' : 'View Script' }}
              </button>
            </div>
          </div>

          <!-- Card 2: Negotiation Course (Affiliate) -->
          <div
            class="flex flex-col h-full p-5 border border-secondary-100 rounded-xl bg-secondary-50/50 hover:border-secondary-200 transition-colors relative overflow-hidden">
            <div
              class="absolute top-0 right-0 px-2 py-1 bg-secondary-100 text-[10px] font-bold text-secondary-600 rounded-bl-lg">
              RECOMMENDED
            </div>
            <div class="mb-4">
              <div
                class="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-600 mb-3">
                <TrendingUp class="w-5 h-5" />
              </div>
              <h4 class="text-lg font-bold text-slate-900">Master Negotiation</h4>
              <p class="text-xs text-slate-600 mt-1">
                <span v-if="isUnderpaid">
                  Don't leave money on the table. Learn the exact tactics to close the
                  {{ currencySymbol }}{{ diffAmount.toLocaleString() }} gap.
                </span>
                <span v-else>
                  You're in a strong position, which effectively makes negotiating harder. Learn
                  advanced strategies to break the ceiling.
                </span>
              </p>
            </div>
            <div class="mt-auto pt-4">
              <!-- <a
                href="https://example.com/negotiate"
                target="_blank"
                class="block w-full py-2.5 text-center text-sm font-bold text-white bg-secondary-600 rounded-lg hover:bg-secondary-700 transition-colors shadow-sm">
                Start Course
              </a> -->
              <AmIButton disabled class="text-center">Coming Soon</AmIButton>
            </div>
          </div>

          <!-- Card 3: CV Help (Affiliate) -->
          <div
            class="flex flex-col h-full p-5 border border-primary-100 rounded-xl bg-primary-50/50 hover:border-primary-200 transition-colors">
            <div class="mb-4">
              <div
                class="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 mb-3">
                <FileText class="w-5 h-5" />
              </div>
              <h4 class="text-lg font-bold text-slate-900">Career Progression</h4>
              <p class="text-xs text-slate-600 mt-1">
                Position yourself for your next big move. Get your CV reviewed by experts to
                highlight your achievements and unlock new opportunities.
              </p>
            </div>
            <div class="mt-auto pt-4">
              <!-- <a
                href="https://example.com/cv-review"
                target="_blank"
                class="block w-full py-2.5 text-center text-sm font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                Get Reviewed
              </a> -->
              <AmIButton disabled class="text-center">Coming Soon</AmIButton>
            </div>
          </div>
        </div>

        <!-- Collapsible Script Section -->
        <div
          v-if="showScript"
          class="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
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
import { Copy, CheckCircle2, TrendingUp, FileText, Mail } from 'lucide-vue-next';
import { ref, computed } from 'vue';
import { trackResultAction } from '../../composables/useAnalytics';

// ** type definitions **

// ** props **
const props = defineProps<{
  title: string;
  currentSalary: number;
  marketAverage: number;
  currencySymbol: string;
}>();

// ** emits **
defineEmits(['close']);

// ** data & refs **
const copied = ref(false);
const showScript = ref(false);

// ** computed properties **
const diffAmount = computed(() => Math.abs(props.marketAverage - props.currentSalary));
const isUnderpaid = computed(() => props.marketAverage > props.currentSalary);

const emailSubject = computed(() => `Subject: Salary Review Discussion - ${props.title} Role`);

const emailBody = computed(() => {
  if (isUnderpaid.value) {
    return `Subject: ${emailSubject.value}

Hi [Manager Name],

I hope you're having a good week.

I'm writing to request a meeting to discuss my compensation. 

Based on my recent research into the current market for ${props.title} roles, the average benchmark is currently ${props.currencySymbol}${props.marketAverage.toLocaleString()}.

Given my recent contributions to [Project/Team Name] and the current market rate, I would like to discuss bringing my salary closer to this benchmark (${props.currencySymbol}${props.marketAverage.toLocaleString()}).

I'm keen to continue delivering value to the team and would appreciate the opportunity to discuss this further.

Best regards,`;
  } else {
    return `Subject: ${emailSubject.value}

Hi [Manager Name],

I hope you're having a good week.

I would appreciate the opportunity to schedule a brief meeting to discuss my performance and career progression.

Over the past year, I have [mention 1-2 key achievements]. I am keen to discuss how my compensation can evolve to reflect these increased responsibilities and the value I am delivering to the team.

When would be a good time to chat?

Best regards,`;
  }
});

// ** methods **
const toggleScript = () => {
  showScript.value = !showScript.value;

  // only track the action when the user views the script, not when they hide it
  if (showScript.value) {
    trackResultAction('view_script', {
      action: 'view_script'
    });
  }
};

const copyToClipboard = async () => {
  await navigator.clipboard.writeText(emailBody.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

// ** watchers **
</script>
