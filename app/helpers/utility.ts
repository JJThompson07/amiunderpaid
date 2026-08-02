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
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};
