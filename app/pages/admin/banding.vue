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
        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div
              class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
              <PoundSterlingIcon class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">United Kingdom (£)</h2>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-slate-200 custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr>
                  <th
                    class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/3">
                    Region Band
                  </th>
                  <th
                    class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/3">
                    Basic (/mo)
                  </th>
                  <th
                    class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/3">
                    Exclusive (/mo)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="band in 5"
                  :key="'uk-' + band"
                  class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-b-0">
                  <td class="p-4 align-middle">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200 shrink-0">
                        {{ band }}
                      </div>
                      <span class="text-sm font-black text-slate-800">Band {{ band }}</span>
                    </div>
                  </td>
                  <td class="p-4 align-middle">
                    <AmIInputGeneric
                      v-model="form.UK[`band${band}`].basic"
                      type="number"
                      placeholder="£" />
                  </td>
                  <td class="p-4 align-middle">
                    <AmIInputGeneric
                      v-model="form.UK[`band${band}`].exclusive"
                      type="number"
                      placeholder="£" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div
              class="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600">
              <DollarSignIcon class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">United States ($)</h2>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-slate-200 custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr>
                  <th
                    class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/3">
                    Region Band
                  </th>
                  <th
                    class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/3">
                    Basic (/mo)
                  </th>
                  <th
                    class="p-4 border-b border-slate-200 bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider w-1/3">
                    Exclusive (/mo)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="band in 5"
                  :key="'us-' + band"
                  class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-b-0">
                  <td class="p-4 align-middle">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200 shrink-0">
                        {{ band }}
                      </div>
                      <span class="text-sm font-black text-slate-800">Band {{ band }}</span>
                    </div>
                  </td>
                  <td class="p-4 align-middle">
                    <AmIInputGeneric
                      v-model="form.USA[`band${band}`].basic"
                      type="number"
                      placeholder="$" />
                  </td>
                  <td class="p-4 align-middle">
                    <AmIInputGeneric
                      v-model="form.USA[`band${band}`].exclusive"
                      type="number"
                      placeholder="$" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        v-if="!loadingPricing"
        class="flex items-center justify-between bg-white p-6 rounded-3xl shadow-xs border border-slate-200 mt-2 sticky bottom-6 z-20">
        <p
          v-if="showSuccess"
          class="text-sm font-bold text-positive-600 animate-pulse flex items-center gap-2">
          <CheckCircle2Icon class="w-5 h-5" /> Pricing updated successfully!
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
import { PoundSterlingIcon, DollarSignIcon, CheckCircle2Icon } from 'lucide-vue-next';

definePageMeta({
  middleware: 'admin'
});

const { pricingData, loadingPricing, updatePricing } = usePricing();

const isSaving = ref(false);
const showSuccess = ref(false);
const error = ref('');

// Pre-filled with your exact pricing spec
const form = ref<Record<string, any>>({
  UK: {
    band1: { basic: 50, exclusive: 250 },
    band2: { basic: 30, exclusive: 150 },
    band3: { basic: 20, exclusive: 100 },
    band4: { basic: 10, exclusive: 50 },
    band5: { basic: 5, exclusive: 25 }
  },
  USA: {
    band1: { basic: 60, exclusive: 300 },
    band2: { basic: 40, exclusive: 200 },
    band3: { basic: 25, exclusive: 125 },
    band4: { basic: 15, exclusive: 75 },
    band5: { basic: 10, exclusive: 50 }
  }
});

// Sync Firestore data to local form when it loads (overriding defaults if DB has data)
watch(
  pricingData,
  (newData) => {
    if (newData) {
      if (newData.UK) form.value.UK = JSON.parse(JSON.stringify(newData.UK));
      if (newData.USA) form.value.USA = JSON.parse(JSON.stringify(newData.USA));
    }
  },
  { immediate: true, deep: true }
);

const handleSave = async () => {
  isSaving.value = true;
  error.value = '';
  showSuccess.value = false;

  try {
    // Deep clone and ensure all values are numbers before pushing to Firestore
    const payload = {
      UK: Object.keys(form.value.UK).reduce(
        (acc, band) => {
          acc[band] = {
            basic: Number(form.value.UK[band].basic),
            exclusive: Number(form.value.UK[band].exclusive)
          };
          return acc;
        },
        {} as Record<string, any>
      ),
      USA: Object.keys(form.value.USA).reduce(
        (acc, band) => {
          acc[band] = {
            basic: Number(form.value.USA[band].basic),
            exclusive: Number(form.value.USA[band].exclusive)
          };
          return acc;
        },
        {} as Record<string, any>
      )
    };

    await updatePricing(payload);

    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    error.value = 'Failed to update pricing. Check permissions.';
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
