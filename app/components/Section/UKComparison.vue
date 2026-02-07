<template>
  <div class="mb-6 overflow-hidden bg-white border shadow-xl rounded-2xl border-slate-200">
    <div class="p-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-indigo-50 rounded-lg text-secondary-600">
          <MapPin class="w-5 h-5" />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-slate-900">{{ location }}</h3>
          <p class="text-xs text-slate-500">Comparing against the regional average for all jobs.</p>
        </div>
        <div>
          <p class="text-sm text-slate-500 font-bold px-1">
            AVG: £{{ regionalData.salary.toLocaleString() }}
          </p>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Job vs Location -->
        <div
          class="flex items-center gap-2 p-4 rounded-xl"
          :class="
            jobTrend === 1 ? 'bg-positive-50' : jobTrend === -1 ? 'bg-negative-50' : 'bg-slate-50'
          ">
          <component
            :is="jobTrend === 1 ? TrendingUp : jobTrend === -1 ? TrendingDown : Minus"
            class="w-8 h-8 inline"
            :class="
              jobTrend === 1 ? 'text-positive-700' : jobTrend === -1 ? 'text-negative-700' : ''
            " />
          <div class="flex items-center">
            <p class="text-sm text-slate-700 leading-relaxed">
              The average salary for <span class="font-bold">{{ displayTitle }}</span> is
              <strong v-if="jobTrend === 0"> The Same</strong>
              <span
                v-else
                class="font-bold px-1 py-0.5 rounded-md text-center"
                :class="
                  jobTrend > 0
                    ? 'bg-positive-100 text-positive-700'
                    : 'bg-negative-100 text-negative-700'
                ">
                {{ Math.abs(jobVsLocationDiff) }}% {{ jobTrend > 0 ? 'higher' : 'lower' }}
              </span>
              than the average salary for all jobs in <strong>{{ location }}</strong
              >.
            </p>
          </div>
        </div>

        <!-- User vs Location -->
        <div
          v-if="userSalary > 0"
          class="flex items-center gap-2 p-4 rounded-xl"
          :class="
            userTrend === 1 ? 'bg-positive-50' : userTrend === -1 ? 'bg-negative-50' : 'bg-slate-50'
          ">
          <component
            :is="userTrend === 1 ? TrendingUp : userTrend === -1 ? TrendingDown : Minus"
            class="w-8 h-8 inline"
            :class="
              userTrend === 1 ? 'text-positive-700' : userTrend === -1 ? 'text-negative-700' : ''
            " />
          <div class="flex items-center">
            <p class="text-sm text-slate-700 leading-relaxed">
              Your salary of <span class="font-bold">£{{ userSalary.toLocaleString() }}</span> is
              <strong v-if="userTrend === 0"> The Same</strong>
              <span
                v-else
                class="font-bold px-1 py-0.5 rounded-md text-center"
                :class="
                  userVsLocationDiff > 0
                    ? 'bg-positive-100 text-positive-700'
                    : 'bg-negative-100 text-negative-700'
                ">
                {{ Math.abs(userVsLocationDiff) }}%
                {{ userTrend > 0 ? 'higher' : 'lower' }}
              </span>
              than the average salary for all jobs in <strong>{{ location }}</strong
              >.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { MapPin, Minus, TrendingDown, TrendingUp } from 'lucide-vue-next';

const props = defineProps({
  country: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  displayTitle: {
    type: String,
    required: true
  },
  marketAverage: {
    type: Number,
    required: true
  },
  userSalary: {
    type: Number,
    default: 0
  },
  regionalData: {
    type: Object as PropType<SalaryBenchmark>,
    default: null
  }
});

const jobVsLocationDiff = computed(() => {
  if (!props.regionalData || !props.marketAverage) return 0;
  const locAvg = props.regionalData.salary;
  if (locAvg === 0) return 0;
  return Math.round(((props.marketAverage - locAvg) / locAvg) * 100);
});

const userVsLocationDiff = computed(() => {
  if (!props.regionalData || !props.userSalary) return 0;
  const locAvg = props.regionalData.salary;
  if (locAvg === 0) return 0;
  return Math.round(((props.userSalary - locAvg) / locAvg) * 100);
});

const jobTrend = computed(() => {
  if (jobVsLocationDiff.value > 0) return 1;
  if (jobVsLocationDiff.value < 0) return -1;
  return 0;
});

const userTrend = computed(() => {
  if (userVsLocationDiff.value > 0) return 1;
  if (userVsLocationDiff.value < 0) return -1;
  return 0;
});
</script>
