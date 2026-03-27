import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter, navigateTo, useNuxtApp, useRequestURL, useSeoMeta, useHead } from '#imports';
import { getRawDiffPercentage } from '~/helpers/utility';
import { useViewport } from '~/composables/useViewport';
import { useAdzuna } from '~/composables/useAdzuna';
import { useAnalytics } from '~/composables/useAnalytics';
import { useMarketData } from '~/composables/useMarketData';
import { useI18n } from 'vue-i18n';

interface SalarySearchOptions {
  isBenchmark: boolean;
}

export async function useSalarySearch(options: SalarySearchOptions = { isBenchmark: false }) {
  const { $siteBrand } = useNuxtApp();
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const govId = ref((route.query.gov_id as string) || undefined);
  const jobType = ref((route.query.schedule as string) || 'full-time');
  const contractType = ref((route.query.contract as string) || 'permanent');
  const showAmbiguityModal = ref(false);
  const searchConfirmed = ref(
    (import.meta.client ? history.state?.confirmed : false) || !!govId.value || false
  );
  const showUserSelection = ref(false);
  const userSelected = ref(false);

  const { isXl } = useViewport();

  // Destructure Adzuna from auto-imported composable
  const adzuna = useAdzuna();
  const { trackAmbiguousSearch } = useAnalytics();
  const marketData = useMarketData();

  // ** helpers **
  const unslugify = (slug: string) => {
    if (!slug) return '';
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ** computed properties **
  const displayTitle = computed(() => unslugify((route.params.title as string) || 'Professional'));
  const country = computed(() => (route.params.country as string)?.toUpperCase() || 'UK');
  const location = computed(() =>
    route.params.location ? unslugify(route.params.location as string) : ''
  );

  const userSalary = ref(Number(route.query.compare) || 0);
  const userPeriod = ref(route.query.period?.toString() || 'year');

  // Clean title for Adzuna and display purposes
  const searchTitle = ref((route.query.q as string) || displayTitle.value);

  const currencySymbol = computed(() => (country.value === 'USA' ? '$' : '£'));
  const adzunaCategory = computed(() => adzuna.jobsData.value?.results?.[0]?.category?.label);

  // Strict Data Check:
  const hasGovernmentData = computed(() => {
    if ((marketData.marketAverage?.value ?? 0) === 0) return false;
    if (marketData.isGenericFallback.value && displayTitle.value.toLowerCase() !== 'professional')
      return false;
    return true;
  });

  const isUnderpaid = computed<boolean>(
    () =>
      userSalary.value > 0 &&
      userSalary.value < (marketData.marketAverage?.value ?? 0) &&
      diffPercent.value < -2.5
  );

  const diffPercent = computed<number>(() => {
    const avg = marketData.marketAverage?.value ?? 0;
    if (userSalary.value === 0 || avg === 0) return 0;
    return getRawDiffPercentage(userSalary.value, avg);
  });

  const jobListings = computed(() => {
    return (adzuna.jobsData.value?.results || []).sort((a: any, b: any) => {
      return b.salary_max - a.salary_max;
    });
  });

  const isAdminVerified = computed(() => {
    if (userSelected.value) return true;
    if (govId.value) return true;
    return !!adzuna.cachedGovIdCode.value;
  });

  // 1. Create a unique key for caching based on all parameters
  const asyncDataKey = computed(
    () =>
      `salary-${country.value}-${location.value}-${searchTitle.value}-${userPeriod.value}-${govId.value}-${jobType.value}-${contractType.value}`
  );

  // 2. Use useAsyncData to fetch sequentially
  const { data, refresh, pending } = await useAsyncData(
    asyncDataKey.value,
    async () => {
      // Wait for Adzuna first to check for cached IDs
      await adzuna.fetchJobs(
        searchTitle.value,
        location.value,
        country.value,
        jobType.value,
        contractType.value
      );

      // Determine the ID to pass to Algolia (User URL param > Cached DB Param > undefined)
      const targetGovId = govId.value || adzuna.cachedGovIdCode.value;

      // Fetch Government Match
      if (country.value === 'UK') {
        await marketData.fetchUkMarketData(
          searchTitle.value,
          location.value,
          userPeriod.value,
          targetGovId
        );
      } else {
        await marketData.fetchUSAMarketData(
          searchTitle.value,
          location.value,
          userPeriod.value,
          targetGovId
        );
      }

      return true;
    },
    {
      watch: [asyncDataKey],
      dedupe: 'defer', // CRITICAL for live updates
      server: true
    }
  );

  // ** methods **
  const handleAmbiguitySelect = async (match: any) => {
    const exactId = match.id_code || match.soc || match.objectID;
    govId.value = exactId;

    trackAmbiguousSearch(match.title, match.group);

    // Log user's manual correction securely
    try {
      await $fetch('/api/adzuna/update-match', {
        method: 'POST',
        body: {
          title: searchTitle.value,
          location: location.value,
          country: country.value === 'USA' ? 'us' : 'gb',
          gov_id_code: exactId,
          gov_title: match.title,
          is_automatic: false,
          job_type: jobType.value,
          contract_type: contractType.value
        }
      });
    } catch {
      // Silently ignore so it doesn't disrupt the user's flow
    }

    if (country.value === 'UK') {
      marketData.fetchUkMarketData(searchTitle.value, location.value, userPeriod.value, exactId);
    } else {
      marketData.fetchUSAMarketData(searchTitle.value, location.value, userPeriod.value, exactId);
    }

    showAmbiguityModal.value = false;
    showUserSelection.value = false;
    userSelected.value = true;
    searchConfirmed.value = true;
  };

  onMounted(() => {
    const { compare, ...remainingQuery } = route.query;

    // only trigger if other queries than compare are present
    if (Object.keys(remainingQuery).length > 0) {
      navigateTo(
        {
          path: route.path,
          query: compare ? { compare: compare } : undefined
        },
        { replace: true }
      );
    }
  });

  watch(asyncDataKey, () => refresh());

  // ** watchers **
  watch(marketData.loading, (newLoading) => {
    if (newLoading === false) {
      const userLocation = location.value;
      const dbLocation = marketData.matchedLocation.value;

      // Securely log automatic matches for admin review/approval
      if (
        import.meta.client &&
        hasGovernmentData.value &&
        !marketData.isGenericFallback.value &&
        marketData.matchedIdCode.value &&
        !govId.value
      ) {
        $fetch('/api/adzuna/update-match', {
          method: 'POST',
          body: {
            title: searchTitle.value,
            location: location.value,
            country: country.value === 'USA' ? 'us' : 'gb',
            gov_id_code: marketData.matchedIdCode.value,
            gov_title: marketData.matchedTitle.value,
            is_automatic: true,
            job_type: jobType.value,
            contract_type: contractType.value
          }
        }).catch(() => {
          // Let it fail silently in the background
        });
      }

      if (
        userLocation &&
        hasGovernmentData.value &&
        dbLocation.toLowerCase() !== userLocation.toLowerCase()
      ) {
        if (dbLocation.toLowerCase() === country.value.toLowerCase()) {
          const prefix = options.isBenchmark ? 'benchmark' : 'salary';
          const newPath = `/${prefix}/${route.params.title}/${route.params.country}`;
          navigateTo(
            {
              path: newPath,
              query: route.query,
              state: { ...history.state }
            },
            { replace: true }
          );
        }
      }
    }
  });

  watch(marketData.ambiguousMatches, (matches) => {
    if (matches.length > 1 && !searchConfirmed.value) {
      showAmbiguityModal.value = true;
    }
  });

  watch(userSalary, (newSalary) => {
    if (newSalary > 0) {
      navigateTo(
        {
          query: { ...route.query, compare: newSalary.toString() }
        },
        { replace: true }
      );
    } else {
      const { compare, ...rest } = route.query;
      navigateTo({ query: rest }, { replace: true });
    }
  });

  // ** SEO **
  const url = useRequestURL();

  useSeoMeta({
    title: () => {
      const locStr = location.value ? `${location.value}, ` : '';
      const key = options.isBenchmark ? 'meta.benchmark.location.title' : 'meta.location.title';
      return t(key, {
        displayTitle: displayTitle.value,
        locStr,
        country: country.value
      });
    },
    description: () => {
      const locStr = location.value || country.value;
      const key = options.isBenchmark
        ? 'meta.benchmark.location.description'
        : 'meta.location.description';
      return t(key, {
        displayTitle: displayTitle.value,
        locStr
      });
    },
    ogTitle: () => {
      const locStr = location.value ? `${location.value}, ` : '';
      const key = options.isBenchmark
        ? 'meta.benchmark.location.ogTitle'
        : 'meta.location.ogTitle';
      return t(key, {
        displayTitle: displayTitle.value,
        locStr,
        country: country.value
      });
    },
    ogDescription: () => {
      const locStr = location.value || country.value;
      const key = options.isBenchmark
        ? 'meta.benchmark.location.ogDescription'
        : 'meta.location.ogDescription';
      return t(key, {
        displayTitle: displayTitle.value,
        locStr
      });
    },
    ogImage: `${url.origin}/${$siteBrand}-og.png`,
    twitterCard: 'summary',
    robots: () => {
      if (
        !marketData.loading.value &&
        !adzuna.loading.value &&
        !hasGovernmentData.value &&
        !adzuna.hasJobsData.value
      ) {
        return 'noindex';
      }
      return 'index, follow';
    }
  });

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: computed(() => {
          const prefix = options.isBenchmark ? 'benchmark' : 'salary';
          const headerKey = options.isBenchmark
            ? 'meta.benchmark.location.header.title'
            : 'meta.location.header.title';

          return JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: t('navbar.home'),
                item: url.origin
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: t(headerKey, { displayTitle: displayTitle.value }),
                item: `${url.origin}${route.path}`
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: displayTitle.value,
                item: `${url.origin}/${prefix}/${route.params.title}/${route.params.country}`
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: country.value,
                item: `${url.origin}/${prefix}/${route.params.title}/${route.params.country}`
              },
              ...(location.value
                ? [
                    {
                      '@type': 'ListItem',
                      position: 5,
                      name: location.value,
                      item: `${url.origin}/${prefix}/${route.params.title}/${route.params.country}/${route.params.location}`
                    }
                  ]
                : [])
            ]
          });
        })
      }
    ]
  });

  return {
    route,
    router,
    isXl,
    adzuna,
    marketData,
    govId,
    jobType,
    contractType,
    showAmbiguityModal,
    searchConfirmed,
    showUserSelection,
    userSelected,
    displayTitle,
    country,
    location,
    userSalary,
    userPeriod,
    searchTitle,
    currencySymbol,
    adzunaCategory,
    hasGovernmentData,
    isUnderpaid,
    diffPercent,
    jobListings,
    isAdminVerified,
    data,
    refresh,
    pending,
    handleAmbiguitySelect
  };
}
