<template>
  <div
    class="government-section p-4 bg-white border shadow-xl rounded-2xl border-slate-200 relative flex-1 flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <div class="p-1.5 bg-amber-100 rounded-lg text-amber-600">
        <AlertCircle class="w-4 h-4" aria-hidden="true" />
      </div>
      <h3 class="font-bold text-slate-900">Refine Government Match</h3>
    </div>
    <div class="p-5 flex-1 flex flex-col gap-4">
      <p class="text-xs text-slate-600">
        We found live job data
        <span v-if="adzunaCategory"
          >in <strong>{{ adzunaCategory }}</strong></span
        >, but couldn't automatically match a government benchmark. Please search for the most
        relevant government category below:
      </p>

      <AmIAutocompleteInput
        v-model="searchQuery"
        label="Search Government Categories"
        placeholder="e.g. Engineering professionals"
        :icon="Search"
        :options="options"
        :loading="loading"
        pre-filtered-options
        @update:model-value="handleSearch" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, Search } from 'lucide-vue-next';
import { ref, computed } from 'vue';
import type { SearchClient } from 'algoliasearch';

const props = defineProps<{
  adzunaCategory?: string;
  country: string;
}>();

const emit = defineEmits<{
  (e: 'select', match: any): void;
}>();

const searchQuery = ref('');
const hits = ref<any[]>([]);
const loading = ref(false);

const options = computed(() => {
  const unique = new Set<string>();
  hits.value.forEach((hit) => {
    const cleanGroup = hit.group ? hit.group.replace(/\s*\(.*\)$/, '') : '';
    unique.add(cleanGroup ? `${hit.title} (${cleanGroup})` : hit.title);
  });
  return Array.from(unique);
});

const performSearch = useDebounceFn(async (val: string) => {
  loading.value = true;
  try {
    const { $algolia } = useNuxtApp();
    const indexName = props.country === 'USA' ? 'regional_salary_benchmarks' : 'salary_benchmarks';
    const index = ($algolia as SearchClient).initIndex(indexName);

    const { hits: results } = await index.search(val, {
      filters: `country:${props.country}`,
      hitsPerPage: 50
    });

    hits.value = results;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}, 300);

const handleSearch = (val: string) => {
  // Check if selected
  const selected = hits.value.find((hit) => {
    const cleanGroup = hit.group ? hit.group.replace(/\s*\(.*\)$/, '') : '';
    const label = cleanGroup ? `${hit.title} (${cleanGroup})` : hit.title;
    return label === val;
  });

  if (selected) {
    emit('select', selected);
    return;
  }

  if (!val || val.length < 2) {
    hits.value = [];
    return;
  }

  performSearch(val);
};
</script>
