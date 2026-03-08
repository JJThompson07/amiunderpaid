import { defineEventHandler, getRequestURL, sendRedirect } from 'h3';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const host = url.hostname;

  // If the browser is requesting the raw favicon from the Benchmark domain, redirect to its specific icon
  if (host.includes('benchmarkmyrole')) {
    return sendRedirect(event, '/benchmarkmyrole-favicon.ico', 301);
  }

  // Otherwise, default to the Am I Underpaid icon
  return sendRedirect(event, '/amiunderpaid-favicon.ico', 301);
});
