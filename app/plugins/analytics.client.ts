export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const gtagId = config.public.gtagId;

  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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
});
