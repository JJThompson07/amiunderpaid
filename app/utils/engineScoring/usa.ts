export const calculateUSABenchmarkScore = (
  userSalary: number,
  macroNationalData: PercentileData,
  macroRegionalData: PercentileData | null,
  microNationalData: PercentileData | null,
  microRegionalData: PercentileData | null,
  regionalMedianAllRoles: number | null,
  nationalMedianAllRoles: number,
  liveBuckets: HistogramBucket[],
  totalLiveJobs: number
): BenchmarkResult => {
  const modifier = calculateRegionalModifier(regionalMedianAllRoles, nationalMedianAllRoles);
  const normalizedSalary = userSalary / modifier;

  // 🪄 Clean Ternary for Macro
  const macroPercentile = macroRegionalData
    ? calculatePercentile(userSalary, macroRegionalData)
    : calculatePercentile(normalizedSalary, macroNationalData);

  // 🪄 Clean Ternary for Micro
  const hasExactRegionalMatch = !!microRegionalData;
  const microPercentile = microRegionalData
    ? calculatePercentile(userSalary, microRegionalData)
    : microNationalData
      ? calculatePercentile(normalizedSalary, microNationalData)
      : 50; // Ultimate fallback if no micro data exists at all

  const livePercentile = calculateLivePercentile(userSalary, liveBuckets, totalLiveJobs);

  // 🪄 Clean Nested Ternary for Final Score
  const finalScore =
    livePercentile !== null
      ? hasExactRegionalMatch
        ? WEIGHTS.EXACT_MATCH.MACRO * macroPercentile +
          WEIGHTS.EXACT_MATCH.MICRO * microPercentile +
          WEIGHTS.EXACT_MATCH.LIVE * livePercentile
        : WEIGHTS.FALLBACK_MATCH.MACRO * macroPercentile +
          WEIGHTS.FALLBACK_MATCH.MICRO * microPercentile +
          WEIGHTS.FALLBACK_MATCH.LIVE * livePercentile
      : WEIGHTS.NO_LIVE_DATA.MACRO * macroPercentile + WEIGHTS.NO_LIVE_DATA.MICRO * microPercentile;

  return {
    score: Math.round(finalScore),
    breakdown: {
      modifier: Math.round(modifier * 100) / 100,
      normalizedSalary: Math.round(normalizedSalary),
      macroPercentile,
      microPercentile,
      livePercentile
    }
  };
};
