export const getPercentage = (count: number, total: number, whole: boolean = false): number => {
  if (total === 0) {
    return 0;
  }
  const percent = (count / total) * 100;
  return Math.min(whole ? Math.round(percent) : percent, 100);
};

export const getUncappedPercentage = (
  count: number,
  total: number,
  whole: boolean = false
): number => {
  if (total === 0) {
    return 0;
  }
  const percent = (count / total) * 100;
  return whole ? Math.round(percent) : percent;
};

export const getDiff = (value: number, target: number, raw: boolean = false): number => {
  if (!target) {
    return 0;
  }
  return raw ? value - target : Math.abs(value - target);
};

export const getDiffPercentage = (value: number, target: number): number => {
  if (!target) {
    return 0;
  }
  return getPercentage(getDiff(value, target), target, true);
};

export const getRawDiffPercentage = (value: number, target: number): number => {
  if (!target) {
    return 0;
  }
  return getPercentage(getDiff(value, target, true), target, true);
};

export const getRawUncappedDiffPercentage = (value: number, target: number): number => {
  if (!target) {
    return 0;
  }
  return getUncappedPercentage(getDiff(value, target, true), target, true);
};

export const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[/\\]/g, '-') // Replace slashes with hyphens (e.g., ui/ux -> ui-ux)
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple - with single -

export const levenshteinDistance = (a: string, b: string): number => {
  // 1. Guard against oversized inputs
  const strA = a.slice(0, 100);
  const strB = b.slice(0, 100);

  if (strA.length === 0) {return strB.length;}
  if (strB.length === 0) {return strA.length;}

  // 2. Memory-optimized O(N) allocation
  let prevRow: number[] = Array.from({ length: strA.length + 1 }, (_, i) => i);
  let currRow: number[] = new Array(strA.length + 1).fill(0);

  for (let i = 1; i <= strB.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= strA.length; j++) {
      const cost = strB.charAt(i - 1) === strA.charAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1]! + 1, // insertion
        prevRow[j]! + 1, // deletion
        prevRow[j - 1]! + cost // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[strA.length]!;
};
