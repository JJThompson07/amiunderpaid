export default defineEventHandler((event) => {
  // 1. Get the parameters from the URL
  const query = getQuery(event);

  // Safe extraction with defaults
  const title = query.title ? String(query.title) : 'Professional';
  const country = query.country ? String(query.country) : 'UK';

  // Use specific location if provided, otherwise fallback to the country
  // We check for empty string as well to ensure fallback works
  const location =
    query.location && String(query.location).trim() !== '' ? String(query.location) : country;

  // 2. Perform the logic (Mimicking database/API logic)
  let base = 55000;

  // Basic Country Adjustments (Case insensitive check)
  if (country.toUpperCase() === 'USA') {
    base = 80000; // Higher base for US market
  }

  // Seniority Adjustments
  const titleLower = title.toLowerCase();
  if (titleLower.includes('senior')) base *= 1.5;
  if (titleLower.includes('junior')) base *= 0.65;
  if (titleLower.includes('lead') || titleLower.includes('manager')) base *= 1.3;

  // City-specific Weightings
  const locLower = location.toLowerCase();
  if (locLower.includes('london')) base *= 1.2;
  if (locLower.includes('new york') || locLower.includes('san francisco')) base *= 1.4;

  // 3. Return the data object
  return {
    average: Math.round(base),
    high: Math.round(base * 1.3),
    low: Math.round(base * 0.7),
    lastYear: Math.round(base * 0.94), // 6% less than current
  };
});
