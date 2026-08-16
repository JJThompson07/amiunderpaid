export const generateCacheKey = (title: string, location: string, country: string) => {
  // Allow alphanumeric, plus +, #, . (for C++, C#, .NET)
  // Replace other characters with -
  const t = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.]+/g, '-');
  const l = location
    ? location
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9+#.]+/g, '-')
    : '';
  return `${country}-${l}-${t}`;
};
