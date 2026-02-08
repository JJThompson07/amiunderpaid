export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const router = useRouter();
  const gtagId = config.public.gtagId;

  // Check initial route on load
  if (router.currentRoute.value.path.startsWith('/admin')) {
    (window as any)[`ga-disable-${gtagId}`] = true;
  }

  router.beforeEach((to) => {
    if (to.path.startsWith('/admin')) {
      (window as any)[`ga-disable-${gtagId}`] = true;
    } else {
      (window as any)[`ga-disable-${gtagId}`] = false;
    }
  });
});
