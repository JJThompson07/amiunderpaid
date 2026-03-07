export default defineNuxtPlugin(() => {
  // useState locks the brand in memory for the entire session.
  // It only runs this calculation once per user, preventing payload crashes!
  const siteBrand = useState('siteBrand', () => {
    const url = useRequestURL();
    const brandParam = url.searchParams.get('brand');

    // 1. Query parameter override (Useful for quick testing)
    if (import.meta.dev && brandParam) {
      return brandParam;
    }

    // 2. Hostname detection (Works for BOTH Production and Local Hosts)
    // Check for production domain OR local dev domain
    if (url.hostname.includes('benchmarkmyrole') || url.hostname.includes('bmr.localhost')) {
      return 'benchmarkmyrole';
    }

    // 3. Default fallback (amiunderpaid.com, amiunderpaid.co.uk, ami.localhost, etc.)
    return 'amiunderpaid';
  });

  return {
    provide: {
      siteBrand: siteBrand.value
    }
  };
});
