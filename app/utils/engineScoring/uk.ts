export const calculateUKBenchmarkScore = (
  userSalary: number,
  macroGovData: PercentileData,
  microGovData: PercentileData,
  regionalMedian: number | null,
  macroNationalMedian: number,
  liveBuckets: HistogramBucket[],
  totalLiveJobs: number
): BenchmarkResult => {
  const modifier = calculateRegionalModifier(regionalMedian, macroNationalMedian);
  const normalizedSalary = userSalary / modifier;

  const macroPercentile = calculatePercentile(normalizedSalary, macroGovData);
  const microPercentile = calculatePercentile(normalizedSalary, microGovData);
  const livePercentile = calculateLivePercentile(userSalary, liveBuckets, totalLiveJobs);

  // 🪄 Clean Ternary for the final score
  const finalScore =
    livePercentile !== null
      ? WEIGHTS.STANDARD.MACRO * macroPercentile +
        WEIGHTS.STANDARD.MICRO * microPercentile +
        WEIGHTS.STANDARD.LIVE * livePercentile
      : WEIGHTS.FALLBACK.MACRO * macroPercentile + WEIGHTS.FALLBACK.MICRO * microPercentile;

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
