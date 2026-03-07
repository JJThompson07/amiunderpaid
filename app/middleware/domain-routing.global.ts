export default defineNuxtRouteMiddleware((to) => {
  const { $siteBrand } = useNuxtApp();

  // 1. Prevent Benchmark My Role from crawling/loading /salary/...
  if ($siteBrand === 'benchmarkmyrole' && to.path.startsWith('/salary')) {
    const newPath = to.path.replace('/salary', '/benchmark');
    return navigateTo(
      { path: newPath, query: to.query },
      { redirectCode: 301 } // 301 tells Google "This permanently moved, drop the duplicate"
    );
  }

  // 2. Prevent Am I Underpaid from crawling/loading /benchmark/...
  if ($siteBrand === 'amiunderpaid' && to.path.startsWith('/benchmark')) {
    const newPath = to.path.replace('/benchmark', '/salary');
    return navigateTo({ path: newPath, query: to.query }, { redirectCode: 301 });
  }
});
