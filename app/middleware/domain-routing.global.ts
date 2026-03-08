import { defineNuxtRouteMiddleware, useRequestURL, useNuxtApp } from '#imports';

export default defineNuxtRouteMiddleware((to) => {
  const { $siteBrand, $i18n } = useNuxtApp();
  const url = useRequestURL();
  const hostname = url.hostname;

  // 1. Force Locale based on TLD (Top Level Domain)
  // This ensures .com defaults to en-US and .co.uk defaults to en-GB
  const isUKSite = hostname.endsWith('.co.uk') || hostname.includes('ami-uk.localhost');
  const isUSSite = hostname.endsWith('.com') || hostname.includes('ami-us.localhost');

  // 1. Force Locale
  if (isUKSite) {
    if ($i18n.locale.value !== 'en-GB') $i18n.setLocale('en-GB');
  } else if (isUSSite) {
    if ($i18n.locale.value !== 'en-US') $i18n.setLocale('en-US');
  }

  // 2. Prevent Benchmark My Role from crawling/loading /salary/...
  if ($siteBrand === 'benchmarkmyrole' && to.path.startsWith('/salary')) {
    const newPath = to.path.replace('/salary', '/benchmark');
    return navigateTo(
      { path: newPath, query: to.query },
      { redirectCode: 301 } // 301 tells Google "This permanently moved, drop the duplicate"
    );
  }

  // 3. Prevent Am I Underpaid from crawling/loading /benchmark/...
  if ($siteBrand === 'amiunderpaid' && to.path.startsWith('/benchmark')) {
    const newPath = to.path.replace('/benchmark', '/salary');
    return navigateTo({ path: newPath, query: to.query }, { redirectCode: 301 });
  }

  // ✨ 4. Strict Cross-Domain Redirects for Country specific data
  // We only do this for AmIUnderpaid since Benchmark is only on .com
  if ($siteBrand === 'amiunderpaid' && to.params.country) {
    const country = (to.params.country as string).toUpperCase();
    const isLocal = hostname.includes('localhost');

    // If looking for USA on UK site -> Kick to US site
    if (country === 'USA' && isUKSite) {
      const targetDomain = isLocal
        ? 'http://ami-us.localhost:3000'
        : 'https://www.amiunderpaid.com';
      return navigateTo(`${targetDomain}${to.fullPath}`, { external: true, redirectCode: 301 });
    }

    // If looking for UK on US site -> Kick to UK site
    if (country === 'UK' && isUSSite) {
      const targetDomain = isLocal
        ? 'http://ami-uk.localhost:3000'
        : 'https://www.amiunderpaid.co.uk';
      return navigateTo(`${targetDomain}${to.fullPath}`, { external: true, redirectCode: 301 });
    }
  }
});
