<template>
  <div class="relative z-20 w-full max-w-4xl mx-auto">
    <!-- Main Card -->
    <div
      class="relative overflow-hidden bg-white border shadow-xl rounded-2xl shadow-indigo-900/10 border-slate-200">
      <div class="p-6 md:p-8">
        <div class="grid grid-cols-1 gap-4">
          <!-- Job Title Input -->
          <AmIInput
            v-model="jobTitle"
            label="Job Title"
            placeholder="e.g. Product Manager"
            :icon="Briefcase" />

          <div class="flex w-full gap-2 items-center">
            <!-- Location Input -->
            <AmIInput
              v-model="location"
              class="flex-1"
              label="Location"
              placeholder="e.g. London"
              :icon="MapPin" />

            <!-- Salary Input -->
            <AmIInput
              v-model="salary"
              class="flex-1"
              label="Salary Expectation (optional)"
              placeholder="e.g. 60,000"
              :icon="Briefcase"
              :param-value="period"
              :params="timeframes"
              @update:param-value="($event) => (period = $event)" />

            <!-- Action Button -->
            <AmIButton @click="searchSalary">
              <div class="flex gap-1 items-center">
                <span>Check</span>
                <ArrowRight class="w-4 h-4" />
              </div>
            </AmIButton>
          </div>
        </div>
      </div>

      <!-- Footer / Disclaimer -->
      <div
        class="flex items-center justify-between px-6 py-3 text-xs border-t bg-slate-50 border-slate-100 text-slate-400">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Live data from 142,000+ job listings
        </div>
        <span>Last updated: Feb 2026</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MapPin, ArrowRight, Briefcase } from 'lucide-vue-next'

export type SelectOption = {
  label: string
  value: string
}

const jobTitle = ref('')
const location = ref('')
const salary = ref('')
const period = ref('year')

const searchSalary = () => {
  // We will connect this to the real API later.
  // For now, it logs the data to the console to prove it works.
  console.log('Searching for:', {
    job: jobTitle.value,
    loc: location.value,
    sal: salary.value,
    period: period.value,
  })
}

const timeframes: SelectOption[] = [
  {
    label: 'Per Year',
    value: 'year',
  },
  {
    label: 'Per Month',
    value: 'month',
  },
  {
    label: 'Per Day',
    value: 'day',
  },
  {
    label: 'Per Hour',
    value: 'hour',
  },
]
</script>
