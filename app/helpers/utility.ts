export const getPercentage = (count: number, total: number, whole: boolean = false): number => {
  if (total === 0) return 0;
  const percent = (count / total) * 100;
  return Math.min(whole ? Math.round(percent) : percent, 100);
};

export const getUncappedPercentage = (
  count: number,
  total: number,
  whole: boolean = false
): number => {
  if (total === 0) return 0;
  const percent = (count / total) * 100;
  return whole ? Math.round(percent) : percent;
};

export const getDiff = (value: number, target: number, raw: boolean = false): number => {
  if (!target) return 0;
  return raw ? value - target : Math.abs(value - target);
};

export const getDiffPercentage = (value: number, target: number): number => {
  if (!target) return 0;
  return getPercentage(getDiff(value, target), target, true);
};

export const getRawDiffPercentage = (value: number, target: number): number => {
  if (!target) return 0;
  return getPercentage(getDiff(value, target, true), target, true);
};

export const getRawUncappedDiffPercentage = (value: number, target: number): number => {
  if (!target) return 0;
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
