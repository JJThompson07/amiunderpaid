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

  let titleAbortController: AbortController | null = null;
  let locationAbortController: AbortController | null = null;

  const fetchUKTitles = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('job_titles');
    const { hits } = await index.search(searchTerm, { filters: `country:UK`, hitsPerPage: 100 });

    const results = new Set<string>();
    hits.forEach((hit: any) => {
      const cleanGroup = hit.group ? hit.group.replace(/\s*\(.*\)$/, '') : '';
      const label = cleanGroup ? `${hit.title} (${cleanGroup})` : hit.title;
      if (hit.soc) {
        if (Object.keys(labelToIdMap.value).length > 200) {labelToIdMap.value = {};}
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
        if (Object.keys(labelToIdMap.value).length > 200) {labelToIdMap.value = {};}
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
    if (titleAbortController) {titleAbortController.abort();}

    if (!val || val.length < 2) {
      titleOptions.value = [];
      return;
    }

    titleAbortController = new AbortController();
    const signal = titleAbortController.signal;

    const term = val.trim();
    // Cache key must include country and contextual location filter to prevent stale bleed
    const locKey = locationOptions.value.length > 0 ? currentLocation.value : '';
    const cacheKey = `${country.value}:${term}:${locKey}`;

    if (titleCache.has(cacheKey)) {
      titleOptions.value = titleCache.get(cacheKey)!;
      return;
    }

    fetching.value = true;
    try {
      const results =
        country.value === 'UK' ? await fetchUKTitles(term) : await fetchUSATitles(term);
      if (signal.aborted) {return;}

      titleOptions.value = results;
      if (titleCache.size > 200) {titleCache.clear();}
      titleCache.set(cacheKey, titleOptions.value);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Silent fail for autocomplete
      }
    } finally {
      if (!signal.aborted) {fetching.value = false;}
    }
  }, 500);

  const fetchLocations = useDebounceFn(async (val: string) => {
    if (locationAbortController) {locationAbortController.abort();}

    if (!val || val.length < 2) {
      locationOptions.value = [];
      return;
    }

    locationAbortController = new AbortController();
    const signal = locationAbortController.signal;

    const term = val.trim();
    // Cache key must include country and contextual title filter to prevent stale bleed
    const titleKey = titleOptions.value.length > 0 ? currentTitle.value : '';
    const cacheKey = `${country.value}:${term}:${titleKey}`;

    if (locationCache.has(cacheKey)) {
      locationOptions.value = locationCache.get(cacheKey)!;
      return;
    }

    fetching.value = true;
    try {
      const results =
        country.value === 'UK' ? await fetchUKLocations(term) : await fetchUSALocations(term);
      if (signal.aborted) {return;}

      locationOptions.value = results;
      if (locationCache.size > 200) {locationCache.clear();}
      locationCache.set(cacheKey, locationOptions.value);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Silent fail for autocomplete
      }
    } finally {
      if (!signal.aborted) {fetching.value = false;}
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
