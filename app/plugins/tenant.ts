export default defineNuxtPlugin(() => {
  // useState locks the brand in memory for the entire session.
  // It only runs this calculation once per user, preventing payload crashes!
  const siteBrand = useState('siteBrand', () => {
    const url = useRequestURL();
    const brandParam = url.searchParams.get('brand');

    // 1. Local dev override
    if (import.meta.dev && brandParam) {
      return brandParam;
    }

    // 2. Production hostname detection
    if (url.hostname.includes('benchmarkmyrole')) {
      return 'benchmarkmyrole';
    }

    // 3. Default fallback
    return 'amiunderpaid';
  });

  return {
    provide: {
      siteBrand: siteBrand.value
    }
  };
});
