export const getPercentage = (count: number, total: number, whole: boolean = false): number => {
  if (total === 0) return 0;
  const percent = (count / total) * 100;
  return Math.min(whole ? Math.round(percent) : percent, 100);
};

export const getDiff = (value: number, target: number, raw: boolean = false): number => {
  if (!target) return 0;
  return raw ? value - target : Math.abs(value - target);
};

export const getDiffPercentage = (value: number, target: number): number => {
  if (!target) return 0;
  return getPercentage(getDiff(value, target), target, true);
};
