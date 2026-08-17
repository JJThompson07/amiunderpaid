<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div
      class="w-full max-w-md bg-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 class="text-lg font-black text-slate-900">{{ $t('modals.ambiguity.title') }}</h3>
        <p class="text-sm text-slate-500 mt-1 mb-4">
          <i18n-t keypath="modals.ambiguity.content" tag="span" class="leading-relaxed">
            <template #title>
              <span class="font-bold">"{{ searchTerm }}"</span>
            </template>
          </i18n-t>
        </p>

        <AmIInputGeneric
          v-model="localSearchQuery"
          placeholder="Search other roles..."
          :icon="Search"
          :loading="isSearching" />
      </div>

      <div class="max-h-[50vh] overflow-y-auto p-2">
        <button
          v-for="match in displayOptions"
          :key="match.id_code"
          class="w-full text-left p-4 rounded-xl hover:bg-primary-50 transition-colors group flex items-center justify-between"
          @click="$emit('resolve', match.id_code)">
          <div>
            <div class="font-bold text-slate-700 group-hover:text-primary-700">
              {{ match.group_name }}
            </div>
            <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-0.5">
              SOC: {{ match.id_code }}
            </div>
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600">
            <ArrowRight class="w-5 h-5" />
          </div>
        </button>
      </div>

      <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          class="text-xs font-bold text-slate-400 hover:text-slate-600 px-4 py-2"
          @click="$emit('close')">
          {{ $t('modals.ambiguity.use-default') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Search } from 'lucide-vue-next';
import type { PropType } from 'vue';
import { computed, ref, watch } from 'vue';
import type { SearchClient } from 'algoliasearch';

const props = defineProps({
  searchTerm: {
    type: String,
    required: true
  },
  options: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  // Added this to catch the prop passed from Search.vue
  country: {
    type: String,
    default: ''
  }
});

// Changed 'select' to 'resolve' to match the parent's @resolve listener
defineEmits<{
  (e: 'resolve', id_code: string): void;
  (e: 'close'): void;
}>();

const { $algolia } = useNuxtApp();
const localSearchQuery = ref('');
const isSearching = ref(false);
const searchResults = ref<any[]>([]);

const performSearch = useDebounceFn(async (query: string) => {
  if (!query || query.length < 2) {
    searchResults.value = [];
    return;
  }
  isSearching.value = true;
  try {
    const indexName = props.country === 'USA' ? 'usa_job_groups' : 'uk_job_groups';
    const index = ($algolia as SearchClient).initIndex(indexName);
    const { hits } = await index.search(query, {
      removeWordsIfNoResults: 'allOptional',
      hitsPerPage: 10
    });

    searchResults.value = hits.map((h: any) => ({
      id_code: h.gov_id,
      group_name: h.group_name
    }));
  } catch (err) {
    console.error('Failed to search dictionary:', err);
  } finally {
    isSearching.value = false;
  }
}, 300);

watch(localSearchQuery, (newVal) => performSearch(newVal));

const displayOptions = computed(() => {
  if (localSearchQuery.value && localSearchQuery.value.length >= 2) {
    return searchResults.value;
  }
  return props.options;
});
</script>
