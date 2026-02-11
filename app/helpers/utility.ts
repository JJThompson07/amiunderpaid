export const getPercentage = (count: number, total: number, whole: boolean = false): number => {
  if (total === 0) return 0;
  const percent = (count / total) * 100;
  return Math.min(whole ? Math.round(percent) : percent, 100);
};
