// Extracts the last path segment of a URL as a display-friendly file name,
// decoding percent-encoded segments (e.g. Firebase Storage's `%2F`-encoded
// object paths). Returns '' for anything that isn't a parseable URL.
export const getFileNameFromUrl = (url: string): string => {
  if (!url) {
    return '';
  }
  try {
    const decodedPath = decodeURIComponent(new URL(url).pathname);
    const segments = decodedPath.split('/').filter(Boolean);
    return segments.at(-1) ?? '';
  } catch {
    return '';
  }
};
