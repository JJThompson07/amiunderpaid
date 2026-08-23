// server/routes/sitemap.xml.ts
import { defineEventHandler, getRequestURL, setHeader } from 'h3';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { useAdminFirestore } from '../utils/firebase';

// Narrow shape of a `jobs` document as selected below (title/country/location only).
type SitemapJobFields = {
  title: string;
  country?: string;
  location?: string;
};

export default defineEventHandler(async (event): Promise<string> => {
  const url = getRequestURL(event);
  const origin = url.origin;
  const isBenchmark = origin.includes('benchmarkmyrole');
  const routePrefix = isBenchmark ? '/benchmark' : '/salary';
  const db = useAdminFirestore();
  const isAmIUnderpaidUS = origin.includes('amiunderpaid.com');
  const isAmIUnderpaidUK = origin.includes('amiunderpaid.co.uk');

  const slugify = (text: string): string =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[/\\]/g, '-') // Replace slashes with hyphens (e.g., ui/ux -> ui-ux)
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
    '/frequently-asked-questions',
    '/mca-score'
  ];

  // 2. Fetch Dynamic Salary Data
  // We'll fetch titles and countries to build the /salary/[title]/[country] URLs
  let query: Query<SitemapJobFields> = db
    .collection('jobs')
    .select('title', 'country', 'location') as Query<SitemapJobFields>;

  if (!isBenchmark) {
    if (isAmIUnderpaidUS) {
      query = query.where('country', '==', 'USA');
    } else if (isAmIUnderpaidUK) {
      query = query.where('country', '==', 'UK');
    }
  }

  const jobsSnapshot = await query.limit(5000).get();

  const dynamicRoutes = jobsSnapshot.docs.map((doc: QueryDocumentSnapshot<SitemapJobFields>) => {
    const data = doc.data();
    const country = data.country || 'UK'; // Default if missing

    const titleSlug = slugify(data.title);

    // Check if a specific location exists to build deeper URLs
    if (data.location) {
      return `${routePrefix}/${titleSlug}/${country}/${slugify(data.location)}`;
    }
    return `${routePrefix}/${titleSlug}/${country}`;
  });

  const allRoutes = [...staticRoutes, ...dynamicRoutes];

  // 3. Generate XML with lastmod
  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allRoutes
    .map((route) => {
      return `  <url>
    <loc>${origin}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : route === '/frequently-asked-questions' ? '0.8' : '0.7'}</priority>
  </url>`;
    })
    .join('\n')}
</urlset>`;

  setHeader(event, 'Content-Type', 'application/xml');
  return sitemap;
});
