// Re-export from the shared utility layer so both client and server use the
// same implementation. The canonical source of truth is shared/utils/sanitize.ts.
export { sanitizeAdzunaData } from '../../shared/utils/sanitize';

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
