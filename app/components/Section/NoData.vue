<template>
  <div
    class="relative flex flex-col w-full max-w-4xl gap-6 p-8 mx-auto bg-white border shadow-xl rounded-3xl border-slate-200">
    <div class="flex flex-col items-center gap-4 text-center">
      <div class="p-3 bg-slate-100 rounded-2xl text-slate-400">
        <SearchX class="w-8 h-8" />
      </div>
      <div>
        <h2 class="text-xl font-bold text-slate-900">No exact match found</h2>
        <p class="mt-1 text-sm text-slate-500">
          We couldn't find enough data for <strong class="text-slate-900">{{ title }}</strong>
          <span v-if="location"
            >in <strong class="text-slate-900">{{ location }}</strong></span
          >.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Option 1: Search Again -->
      <div class="flex flex-col gap-3 p-5 border border-slate-100 bg-slate-50 rounded-2xl">
        <h3 class="text-sm font-bold text-slate-900">Try a different search</h3>
        <p class="text-xs mb-4 text-slate-500">Check for typos or try a broader job title.</p>
        <NuxtLink to="/" class="w-full mt-auto">
          <AmIButton
            block
            bg-colour="bg-white"
            text-colour="text-slate-700"
            class="border border-slate-200 hover:bg-slate-50">
            Start New Search
          </AmIButton>
        </NuxtLink>
      </div>

      <!-- Option 2: Select Category -->
      <div
        class="flex flex-col gap-3 p-5 border border-secondary-100 bg-secondary-50/50 rounded-2xl">
        <h3 class="text-sm font-bold text-secondary-900">Find by Category</h3>
        <p class="text-xs mb-2 text-secondary-700/70">Select a government benchmark category.</p>

        <div class="mt-auto">
          <AmIAutocompleteInput
            v-model="searchQuery"
            label="Search Categories"
            placeholder="e.g. Engineering"
            :icon="Search"
            :options="options"
            :loading="loading"
            pre-filtered-options
            @update:model-value="handleSearch" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SearchX, Search } from 'lucide-vue-next';
import { ref, computed } from 'vue';
import type { SearchClient } from 'algoliasearch';

const props = defineProps<{
  title: string;
  location: string;
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
      hitsPerPage: 20
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
