import crypto from 'node:crypto';

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
    
  const rawKey = `${country}-${l}-${t}`;
  
  if (rawKey.length > 200) {
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 16);
    return `${rawKey.substring(0, 180)}-${hash}`;
  }
  
  return rawKey;
};
