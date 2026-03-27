import { ref } from 'vue';
import type { SearchClient } from 'algoliasearch';
import type { AutocompleteOption } from '~/components/AmI/Input/Autocomplete.vue';
import { useDebounceFn } from '@vueuse/core';

export const useSearchAutocomplete = (
  currentCountry: Ref<string>,
  location: Ref<string>,
  title: Ref<string>
) => {
  const fetching = ref(false);
  const titleOptions = ref<AutocompleteOption[]>([]);
  const locationOptions = ref<AutocompleteOption[]>([]);

  // Map to temporarily hold the IDs for the selected labels
  const labelToIdMap = ref<Record<string, string>>({});

  const fetchUKTitles = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('job_titles');

    const { hits } = await index.search(searchTerm, {
      filters: `country:UK`,
      hitsPerPage: 100
    });

    const results = new Set<string>();
    hits.forEach((hit: any) => {
      const cleanGroup = hit.group ? hit.group.replace(/\s*\(.*\)$/, '') : '';
      const label = cleanGroup ? `${hit.title} (${cleanGroup})` : hit.title;

      // Store the SOC code linked to this specific label
      if (hit.soc) {
        labelToIdMap.value[label] = hit.soc;
      }

      results.add(label);
    });

    return Array.from(results).map((t) => {
      return {
        value: t,
        label: t
      };
    });
  };

  const fetchUSATitles = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();

    const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

    let filters = `country:USA`;
    if (location.value && locationOptions.value.length > 0) {
      const locVal = location.value.toLowerCase().replace(/"/g, '\\"');
      filters += ` AND searchLocation:"${locVal}"`;
    }

    const { hits } = await index.search(searchTerm, {
      filters,
      hitsPerPage: 20
    });

    const results = new Set<string>();
    hits.forEach((hit: any) => {
      // Store the ID code linked to this specific title
      const id = hit.id_code || hit.objectID;
      if (id) {
        labelToIdMap.value[hit.title] = id;
      }
      results.add(hit.title);
    });

    return Array.from(results).map((t) => {
      return {
        value: t,
        label: t
      };
    });
  };

  const fetchUKLocations = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

    const { facetHits } = await index.searchForFacetValues('location', searchTerm, {
      filters: `country:UK`,
      maxFacetHits: 20
    });

    return facetHits.map((h: any) => {
      return {
        value: h.value,
        label: h.value
      };
    });
  };

  const fetchUSALocations = async (searchTerm: string) => {
    const { $algolia } = useNuxtApp();
    const index = ($algolia as SearchClient).initIndex('regional_salary_benchmarks');

    let filters = `country:USA`;
    if (title.value && titleOptions.value.length > 0) {
      const titleVal = title.value.toLowerCase().replace(/"/g, '\\"');
      filters += ` AND searchTitle:"${titleVal}"`;
    }

    const { facetHits } = await index.searchForFacetValues('location', searchTerm, {
      filters,
      maxFacetHits: 20
    });

    return facetHits.map((h: any) => {
      return {
        value: h.value,
        label: h.value
      };
    });
  };

  const fetchTitles = useDebounceFn(async (val: string) => {
    if (!val || val.length < 2) {
      titleOptions.value = [];
      return;
    }

    fetching.value = true;
    const searchTerm = val.trim();

    try {
      if (currentCountry.value === 'UK') {
        titleOptions.value = await fetchUKTitles(searchTerm);
      } else {
        titleOptions.value = await fetchUSATitles(searchTerm);
      }
    } catch {
      // Silent fail for autocomplete
    } finally {
      fetching.value = false;
    }
  }, 300);

  const fetchLocations = useDebounceFn(async (val: string) => {
    if (!val || val.length < 2) {
      locationOptions.value = [];
      return;
    }

    fetching.value = true;

    try {
      if (currentCountry.value === 'UK') {
        locationOptions.value = await fetchUKLocations(val);
      } else {
        locationOptions.value = await fetchUSALocations(val);
      }
    } catch {
      // Silent fail for autocomplete
    } finally {
      fetching.value = false;
    }
  }, 300);

  return {
    fetching,
    titleOptions,
    locationOptions,
    labelToIdMap,
    fetchTitles,
    fetchLocations
  };
};
