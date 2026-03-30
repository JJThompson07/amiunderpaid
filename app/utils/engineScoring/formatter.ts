// app/utils/engineScoring/formatter.ts
import type { BenchmarkResult } from './types'; // Adjust this path if types.ts is somewhere else

export interface McaUiData {
  score: number;
  label: string;
  confidenceScore: number;
  percentileRank: number;
  comparisonPoints: string[];
}

// Helper: Converts a percentile into a JSON key ('high', 'mid', or 'low')
const getTier = (val: number, highBound: number, midBound: number): 'high' | 'mid' | 'low' => {
  if (val >= highBound) return 'high';
  if (val >= midBound) return 'mid';
  return 'low';
};

export const formatMcaScoreForUi = (
  result: BenchmarkResult,
  jobTitle: string,
  location: string | null,
  t: (key: string, params?: Record<string, any>) => string
): McaUiData => {
  const { score, breakdown } = result;
  const points: string[] = [];

  // Variables available for Vue I18n
  const templateVars = {
    jobTitle,
    location: location || '',
    micro: breakdown.microPercentile !== null ? formatOrdinal(breakdown.microPercentile) : '',
    macro: formatOrdinal(breakdown.macroPercentile),
    live: breakdown.livePercentile !== null ? formatOrdinal(breakdown.livePercentile) : '',
    diff: Math.abs(Math.round((1 - breakdown.modifier) * 100))
  };

  // 1. DYNAMIC LABEL
  const labelKey =
    score >= 80
      ? 'mca.labels.leader'
      : score >= 60
        ? 'mca.labels.strong'
        : score >= 40
          ? 'mca.labels.competitive'
          : score >= 25
            ? 'mca.labels.below'
            : 'mca.labels.review';
  const label = t(labelKey);

  // 2. BUILD THE BULLET POINTS

  // 👈 Only push the Micro (Government) point if we actually have the data!
  if (breakdown.microPercentile !== null) {
    points.push(t(`mca.points.micro.${getTier(breakdown.microPercentile, 75, 45)}`, templateVars));
  }

  points.push(t(`mca.points.macro.${getTier(breakdown.macroPercentile, 75, 40)}`, templateVars));

  // Regional
  if (location && breakdown.modifier !== 1) {
    const regKey = breakdown.modifier > 1 ? 'higher' : 'lower';
    points.push(t(`mca.points.regional.${regKey}`, templateVars));
  }

  // Live Market
  if (breakdown.livePercentile !== null) {
    points.push(t(`mca.points.live.${getTier(breakdown.livePercentile, 60, 40)}`, templateVars));
  }

  // 3. DETERMINE THE PRIMARY RANK (For the bottom analysis box)
  // If we don't have Government data, use the Live Market rank!
  const primaryRank =
    breakdown.microPercentile !== null ? breakdown.microPercentile : breakdown.livePercentile;

  return {
    score,
    label,
    confidenceScore: result.confidenceScore,
    percentileRank: primaryRank || breakdown.macroPercentile,
    comparisonPoints: points
  };
};

export const formatOrdinal = (num: number, locale = 'en-GB'): string => {
  const rounded = Math.round(num);
  const pr = new Intl.PluralRules(locale, { type: 'ordinal' });

  // The browser natively knows which rule applies to the number!
  const rule = pr.select(rounded);

  const suffixes: Record<string, string> = {
    one: 'st',
    two: 'nd',
    few: 'rd',
    other: 'th'
  };

  return `${rounded}${suffixes[rule] || 'th'}`;
};
