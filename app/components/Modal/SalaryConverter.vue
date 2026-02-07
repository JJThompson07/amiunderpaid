<template>
  <div
    class="ami-i-hourly-calculator fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <section
      class="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <!-- Header -->
      <header class="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 class="text-lg font-black text-slate-900">Don't Get Paid Annually?</h3>
        <p class="text-sm text-slate-500 mt-1">
          Use our calculator to convert your hourly, daily, or weekly wage into an annual salary
          equivalent for a more accurate comparison.
        </p>
      </header>

      <div class="p-6">
        <div class="flex flex-col gap-4">
          <AmIInput
            v-model="wage"
            v-model:param-value="period"
            type="number"
            label="Current Wage"
            placeholder="30"
            :icon="country === 'UK' ? PoundSterling : DollarSign"
            :params="periodOptions" />

          <div v-if="period === 'hour'">
            <AmIInput
              v-model="hoursPerWeek"
              type="number"
              label="Hours Per Week"
              placeholder="40"
              :icon="Timer" />
          </div>

          <div v-if="period === 'day'">
            <AmIInput
              v-model="daysPerWeek"
              type="number"
              label="Days Per Week"
              placeholder="5"
              :icon="Calendar" />
          </div>

          <div v-if="annualSalary > 0" class="p-4 bg-green-50 rounded-xl">
            <p class="text-sm text-green-700">
              Your annual salary equivalent is
              <span class="font-bold">£{{ annualSalary.toLocaleString() }}</span
              >.
            </p>
          </div>

          <button
            class="self-end text-sm font-bold text-slate-400 hover:text-slate-600 px-4 py-2"
            @click="$emit('close')">
            Close
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Calendar, DollarSign, PoundSterling, Timer } from 'lucide-vue-next';

defineProps({
  country: {
    type: String,
    required: true
  }
});

defineEmits(['select', 'close']);

const wage = ref<number>(25);
const hoursPerWeek = ref<number>(40);
const daysPerWeek = ref<number>(5);
const period = ref('hour');
const annualSalary = computed(() => {
  if (wage.value <= 0) return 0;
  switch (period.value) {
    case 'hour':
      return wage.value * hoursPerWeek.value * 52; // Assuming 52 weeks/year
    case 'day':
      return wage.value * daysPerWeek.value * 52; // Assuming 52 weeks/year
    case 'week':
      return wage.value * 52; // Assuming 52 weeks/year
    default:
      return 0;
  }
});

const periodOptions = [
  { label: '/ hr', value: 'hour' },
  { label: '/ day', value: 'day' },
  { label: '/ wk', value: 'week' }
];
</script>
