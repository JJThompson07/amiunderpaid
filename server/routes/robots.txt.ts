import { defineEventHandler, getRequestURL, setHeader } from 'h3';

export default defineEventHandler((event) => {
  // 1. Extract the current requesting origin (e.g., https://amiunderpaid.com)
  const url = getRequestURL(event);
  const origin = url.origin;

  // 2. Construct the robots.txt content
  // We explicitly block /admin/ to protect your portal
  // and /_nuxt/ to prevent indexing of internal manifest files.
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /_nuxt/',
    '',
    `Sitemap: ${origin}/sitemap.xml`
  ].join('\n');

  // 3. Set standard text/plain header with utf-8 encoding
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');

  return robots;
});
