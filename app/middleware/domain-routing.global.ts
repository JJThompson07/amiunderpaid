export default defineNuxtRouteMiddleware((to) => {
  const { $siteBrand } = useNuxtApp();

  if ($siteBrand === 'amiunderpaid' && to.path.startsWith('/benchmark')) {
    return navigateTo(to.path.replace('/benchmark', '/salary'), { redirectCode: 301 });
  }

  if ($siteBrand === 'benchmarkmyrole' && to.path.startsWith('/salary')) {
    return navigateTo(to.path.replace('/salary', '/benchmark'), { redirectCode: 301 });
  }
});
