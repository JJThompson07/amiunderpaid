// app/composables/useJobAutocomplete.ts
import type { Ref } from 'vue';
import type { SearchClient } from 'algoliasearch';
import type { AutocompleteOption } from '~/components/AmI/Input/Autocomplete.vue';

// Define cache maps outside the composable so they persist for the lifetime of the SPA session
const titleCache = new Map<string, AutocompleteOption[]>();
const locationCache = new Map<string, AutocompleteOption[]>();

export const useJobAutocomplete = (
  country: Ref<string>,
  currentLocation: Ref<string>,
  currentTitle: Ref<string>
) => {
  const fetching = ref(false);
  const titleOptions = ref<AutocompleteOption[]>([]);
  const locationOptions = ref<AutocompleteOption[]>([]);
  const labelToIdMap = ref<Record<string, string>>({});

  const fetchUKTitles = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('job_titles');
    const { hits } = await index.search(searchTerm, { filters: `country:UK`, hitsPerPage: 100 });

    const results = new Set<string>();
    hits.forEach((hit: any) => {
      const cleanGroup = hit.group ? hit.group.replace(/\s*\(.*\)$/, '') : '';
      const label = cleanGroup ? `${hit.title} (${cleanGroup})` : hit.title;
      if (hit.soc) {
        labelToIdMap.value[label] = hit.soc;
      }
      results.add(label);
    });

    return Array.from(results).map((label) => ({ value: label, label }));
  };

  const fetchUSATitles = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');
    let filters = `country:USA`;

    if (currentLocation.value && locationOptions.value.length > 0) {
      const locVal = currentLocation.value.toLowerCase().replace(/"/g, '\\"');
      filters += ` AND searchLocation:"${locVal}"`;
    }

    const { hits } = await index.search(searchTerm, { filters, hitsPerPage: 20 });
    const results = new Set<string>();

    hits.forEach((hit: any) => {
      const id = hit.id_code || hit.objectID;
      if (id) {
        labelToIdMap.value[hit.title] = id;
      }
      results.add(hit.title);
    });

    return Array.from(results).map((title) => ({ value: title, label: title }));
  };

  const fetchUKLocations = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');
    const { facetHits } = await index.searchForFacetValues('location', searchTerm, {
      filters: `country:UK`,
      maxFacetHits: 20
    });
    return facetHits.map((h: any) => ({ value: h.value, label: h.value }));
  };

  const fetchUSALocations = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');
    let filters = `country:USA`;

    if (currentTitle.value && titleOptions.value.length > 0) {
      const titleVal = currentTitle.value.toLowerCase().replace(/"/g, '\\"');
      filters += ` AND searchTitle:"${titleVal}"`;
    }

    const { facetHits } = await index.searchForFacetValues('location', searchTerm, {
      filters,
      maxFacetHits: 20
    });
    return facetHits.map((h: any) => ({ value: h.value, label: h.value }));
  };

  const fetchTitles = useDebounceFn(async (val: string) => {
    if (!val || val.length < 2) {
      titleOptions.value = [];
      return;
    }
    
    const term = val.trim();
    // Cache key must include country and contextual location filter to prevent stale bleed
    const cacheKey = `${country.value}:${term}:${currentLocation.value}`;
    
    if (titleCache.has(cacheKey)) {
      titleOptions.value = titleCache.get(cacheKey)!;
      return;
    }

    fetching.value = true;
    try {
      titleOptions.value =
        country.value === 'UK' ? await fetchUKTitles(term) : await fetchUSATitles(term);
      if (titleCache.size > 200) titleCache.clear();
      titleCache.set(cacheKey, titleOptions.value);
    } catch {
      // Silent fail for autocomplete
    } finally {
      fetching.value = false;
    }
  }, 500);

  const fetchLocations = useDebounceFn(async (val: string) => {
    if (!val || val.length < 2) {
      locationOptions.value = [];
      return;
    }
    
    const term = val.trim();
    // Cache key must include country and contextual title filter to prevent stale bleed
    const cacheKey = `${country.value}:${term}:${currentTitle.value}`;
    
    if (locationCache.has(cacheKey)) {
      locationOptions.value = locationCache.get(cacheKey)!;
      return;
    }

    fetching.value = true;
    try {
      locationOptions.value =
        country.value === 'UK'
          ? await fetchUKLocations(term)
          : await fetchUSALocations(term);
      if (locationCache.size > 200) locationCache.clear();
      locationCache.set(cacheKey, locationOptions.value);
    } catch {
      // Silent fail for autocomplete
    } finally {
      fetching.value = false;
    }
  }, 500);

  return {
    fetching,
    titleOptions,
    locationOptions,
    labelToIdMap,
    fetchTitles,
    fetchLocations
  };
};
