import { computed } from 'vue';
import { useI18n, useRequestURL } from '#imports';

export const useRegion = () => {
  const { locale } = useI18n();
  const url = useRequestURL();

  // ✨ Use the safely resolved locale instead of parsing the raw hostname
  const isUKSite = computed(() => locale.value === 'en-GB');
  const isUSSite = computed(() => locale.value === 'en-US');

  // Active Country
  const currentCountry = computed(() => (isUKSite.value ? 'UK' : 'USA'));

  // Currency Symbol Helper
  const currencySymbol = computed(() => (isUKSite.value ? '£' : '$'));

  // Toggle Link Logic
  const alternateSiteUrl = computed(() => {
    // Return local links if testing locally
    if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
      return isUKSite.value ? 'http://ami-us.localhost:3000' : 'http://ami-uk.localhost:3000';
    }
    // Return production links otherwise
    return isUKSite.value ? 'https://www.amiunderpaid.com' : 'https://www.amiunderpaid.co.uk';
  });

  return {
    isUKSite,
    isUSSite,
    currentCountry,
    currencySymbol,
    alternateSiteUrl
  };
};
