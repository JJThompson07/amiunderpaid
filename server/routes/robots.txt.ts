import { defineEventHandler, getRequestURL, setHeader } from 'h3';

export default defineEventHandler((event) => {
  const url = getRequestURL(event);

  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /_nuxt/

Sitemap: ${url.origin}/sitemap.xml`;

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return robots;
});
