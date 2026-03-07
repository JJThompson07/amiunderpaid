export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const gtagId = config.public.gtagId;
  const { gtag } = useGtag();

  const isLocalhost =
    window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';

  if (!isLocalhost) {
    gtag('set', {
      site_domain: window.location.hostname,
      site_market: window.location.hostname.includes('.com') ? 'US' : 'UK'
    });
  }

  // Check initial route on load
  if (isLocalhost || router.currentRoute.value.path.startsWith('/admin')) {
    (window as any)[`ga-disable-${gtagId}`] = true;
  }

  router.beforeEach((to) => {
    if (isLocalhost || to.path.startsWith('/admin')) {
      (window as any)[`ga-disable-${gtagId}`] = true;
    } else {
      (window as any)[`ga-disable-${gtagId}`] = false;
    }
  });

  router.afterEach((to) => {
    if (!isLocalhost && !to.path.startsWith('/admin')) {
      gtag('event', 'page_nav', {
        page: to.fullPath,
        page_title: document.title // Includes the (UK)/(USA) distinction if you added it
      });
    }
  });
});
