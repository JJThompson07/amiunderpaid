import { defineEventHandler, setHeader, getRequestURL } from 'h3';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const origin = url.origin;

  // Static routes based on the current project structure and navigation
  const routes = [
    '/',
    '/privacy-policy',
    '/how-it-works',
    '/data-sources',
    '/about'
  ];

  // Note: To include dynamic salary pages, you would fetch them from your database here.
  // e.g. const jobs = await fetchAllJobTitles();
  // jobs.forEach(job => routes.push(`/salary/${slugify(job.title)}/${job.country}`));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routes
    .map((route) => {
      return `  <url>
    <loc>${origin}${route}</loc>
  </url>`;
    })
    .join('\n')}
</urlset>`;

  setHeader(event, 'Content-Type', 'application/xml');
  return sitemap;
});