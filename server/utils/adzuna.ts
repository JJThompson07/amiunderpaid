// server/utils/adzuna.ts

// Helper to recursively clean data before saving to Firestore
export const sanitizeAdzunaData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(sanitizeAdzunaData);
  }
  if (data !== null && typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      // Remove keys that start and end with '__' (reserved by Firestore)
      if (!key.startsWith('__') || !key.endsWith('__')) {
        acc[key] = sanitizeAdzunaData(data[key]);
      }
      return acc;
    }, {} as any);
  }
  return data;
};

export const generateCacheKey = (title: string, location: string, country: string) => {
  // Allow alphanumeric, plus +, #, . (for C++, C#, .NET)
  // Replace other characters with -
  const t = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.]+/g, '-');
  const l = location
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.]+/g, '-');
  return `${country}-${l}-${t}`;
};
