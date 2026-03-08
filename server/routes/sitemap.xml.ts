// server/routes/sitemap.xml.ts
import { defineEventHandler, setHeader, getRequestURL } from 'h3';
import { useAdminFirestore } from '../utils/firebase';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const origin = url.origin;
  const isBenchmark = origin.includes('benchmarkmyrole');
  const routePrefix = isBenchmark ? '/benchmark' : '/salary';
  const db = useAdminFirestore();
  const isUSDomain = origin.endsWith('.com');

  const slugify = (text: string) =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-'); // Replace multiple - with single -

  // 1. Define Static Routes
  const staticRoutes = [
    '/',
    '/privacy-policy',
    '/how-it-works',
    '/data-sources',
    '/about',
    '/frequently-asked-questions'
  ];

  // 2. Fetch Dynamic Salary Data
  // We'll fetch titles and countries to build the /salary/[title]/[country] URLs
  const jobsSnapshot = await db
    .collection('jobs')
    .select('title', 'country', 'location')
    .limit(5000) // Adjust limit based on your dataset size
    .get();

  const dynamicRoutes = jobsSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      const country = data.country || 'UK';

      // ✨ NEW: Filter out jobs that don't belong to this domain
      if (isUSDomain && country !== 'USA') return null;
      if (!isUSDomain && country !== 'UK') return null;

      const titleSlug = slugify(data.title);
      if (data.location) {
        return `${routePrefix}/${titleSlug}/${country}/${slugify(data.location)}`;
      }
      return `${routePrefix}/${titleSlug}/${country}`;
    })
    .filter(Boolean);

  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  // 3. Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allRoutes
    .map((route) => {
      return `  <url>
    <loc>${origin}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : route === '/frequently-asked-questions' ? '0.8' : '0.7'}</priority>
  </url>`;
    })
    .join('\n')}
</urlset>`;

  setHeader(event, 'Content-Type', 'application/xml');
  return sitemap;
});
