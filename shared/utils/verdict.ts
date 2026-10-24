// ==========================================
// ⚖️ SALARY VERDICT
// ==========================================

export type SalaryVerdict = 'underpaid' | 'fair' | 'overpaid' | 'unknown';

// A salary within ±2.5% of the market baseline is treated as fairly paid
export const VERDICT_BAND_PERCENT = 2.5;

export const getSalaryVerdict = (diffPercent: number): SalaryVerdict => {
  if (diffPercent < -VERDICT_BAND_PERCENT) {
    return 'underpaid';
  }
  if (diffPercent > VERDICT_BAND_PERCENT) {
    return 'overpaid';
  }
  return 'fair';
};

export const calculateSalaryVerdict = (
  currentSalary: number,
  marketAverage: number
): SalaryVerdict => {
  if (!(currentSalary > 0) || !(marketAverage > 0)) {
    return 'unknown';
  }

  // mirrors getRawDiffPercentage (app/helpers/utility.ts): rounded to a whole percent and
  // capped at 100, so the verdict matches the one shown in the comparison cards
  const diffPercent = Math.min(
    Math.round(((currentSalary - marketAverage) / marketAverage) * 100),
    100
  );

  return getSalaryVerdict(diffPercent);
};
