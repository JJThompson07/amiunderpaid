<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop />

    <div class="max-w-5xl mx-auto relative flex flex-col gap-6">
      <header
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-3xl font-black text-slate-900">Pricing Bands</h1>
          <p class="text-slate-500 mt-1">
            Manage tiered subscription and exclusivity pricing by country.
          </p>
        </div>
      </header>

      <AmILoader v-if="loadingPricing" message="Loading pricing configuration..." class="mt-12" />

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 flex flex-col">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div
              class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
              <PoundSterling class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">United Kingdom (£)</h2>
          </div>

          <AmITable :columns="pricingColumns" :data="form.UK" class="flex-1 h-full">
            <template #band="{ row }">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200 shrink-0">
                  {{ row.band }}
                </div>
                <span class="text-sm font-black text-slate-800">Band {{ row.band }}</span>
              </div>
            </template>
            <template #basic="{ row }">
              <AmIInputGeneric v-model="row.basic" type="number" placeholder="£" />
            </template>
            <template #exclusive="{ row }">
              <AmIInputGeneric v-model="row.exclusive" type="number" placeholder="£" />
            </template>
          </AmITable>
        </div>

        <div
          class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200 flex flex-col">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div
              class="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600">
              <DollarSign class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">United States ($)</h2>
          </div>

          <AmITable :columns="pricingColumns" :data="form.USA" class="flex-1 h-full">
            <template #band="{ row }">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200 shrink-0">
                  {{ row.band }}
                </div>
                <span class="text-sm font-black text-slate-800">Band {{ row.band }}</span>
              </div>
            </template>
            <template #basic="{ row }">
              <AmIInputGeneric v-model="row.basic" type="number" placeholder="$" />
            </template>
            <template #exclusive="{ row }">
              <AmIInputGeneric v-model="row.exclusive" type="number" placeholder="$" />
            </template>
          </AmITable>
        </div>
      </div>

      <div
        v-if="!loadingPricing"
        class="flex items-center justify-between bg-white p-6 rounded-3xl shadow-xs border border-slate-200 mt-2 sticky bottom-6 z-20">
        <p
          v-if="showSuccess"
          class="text-sm font-bold text-positive-600 animate-pulse flex items-center gap-2">
          <CheckCircle2 class="w-5 h-5" /> Pricing updated successfully!
        </p>
        <p v-else-if="error" class="text-sm font-bold text-red-600">{{ error }}</p>
        <p v-else class="text-xs text-slate-400 font-medium hidden md:block">
          Changes will instantly apply to all active recruiter sessions.
        </p>

        <AmIButton title="Save Pricing" :disabled="isSaving" @click="handleSave">
          <div class="flex items-center gap-2 px-4 py-1">
            <span
              v-if="isSaving"
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ isSaving ? 'Saving...' : 'Publish Changes' }}</span>
          </div>
        </AmIButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { PoundSterling, DollarSign, CheckCircle2 } from 'lucide-vue-next';

definePageMeta({ middleware: 'admin' });

const { pricingData, loadingPricing, updatePricing } = usePricing();

const isSaving = ref(false);
const showSuccess = ref(false);
const error = ref('');

const pricingColumns = [
  { key: 'band', label: 'Region Band', class: 'w-1/3' },
  { key: 'basic', label: 'Basic (/mo)', class: 'w-1/3' },
  { key: 'exclusive', label: 'Exclusive (/mo)', class: 'w-1/3' }
];

const form = ref({
  UK: [
    { band: 1, basic: 50, exclusive: 250 },
    { band: 2, basic: 30, exclusive: 150 },
    { band: 3, basic: 20, exclusive: 100 },
    { band: 4, basic: 10, exclusive: 50 },
    { band: 5, basic: 5, exclusive: 25 }
  ],
  USA: [
    { band: 1, basic: 60, exclusive: 300 },
    { band: 2, basic: 40, exclusive: 200 },
    { band: 3, basic: 25, exclusive: 125 },
    { band: 4, basic: 15, exclusive: 75 },
    { band: 5, basic: 10, exclusive: 50 }
  ]
});

const objectToArray = (obj: any) => {
  return [1, 2, 3, 4, 5].map((band) => ({
    band,
    basic: obj[`band${band}`]?.basic || 0,
    exclusive: obj[`band${band}`]?.exclusive || 0
  }));
};

watch(
  pricingData,
  (newData) => {
    if (newData) {
      if (newData.UK) form.value.UK = objectToArray(newData.UK);
      if (newData.USA) form.value.USA = objectToArray(newData.USA);
    }
  },
  { immediate: true, deep: true }
);

const handleSave = async () => {
  isSaving.value = true;
  error.value = '';
  showSuccess.value = false;

  try {
    const arrayToObject = (arr: any[]) => {
      return arr.reduce(
        (acc, row) => {
          acc[`band${row.band}`] = { basic: Number(row.basic), exclusive: Number(row.exclusive) };
          return acc;
        },
        {} as Record<string, any>
      );
    };

    const payload = {
      UK: arrayToObject(form.value.UK),
      USA: arrayToObject(form.value.USA)
    };

    await updatePricing(payload);

    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch {
    error.value = 'Failed to update pricing. Check permissions.';
  } finally {
    isSaving.value = false;
  }
};
</script>
