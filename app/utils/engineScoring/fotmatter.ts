// app/utils/engineScoring/formatter.ts
import type { BenchmarkResult } from './types'; // Adjust this path if types.ts is somewhere else

export interface McaUiData {
  score: number;
  label: string;
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

  // Variables available for Vue I18n to inject into your {tags}
  const templateVars = {
    jobTitle,
    location: location || '',
    micro: breakdown.microPercentile,
    macro: breakdown.macroPercentile,
    live: breakdown.livePercentile || 0,
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
  points.push(t(`mca.points.micro.${getTier(breakdown.microPercentile, 75, 45)}`, templateVars));
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

  return {
    score,
    label,
    percentileRank: breakdown.microPercentile,
    comparisonPoints: points
  };
};
