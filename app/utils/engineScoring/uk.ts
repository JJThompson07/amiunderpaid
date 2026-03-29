export const calculateUKBenchmarkScore = (
  userSalary: number,
  macroNationalData: PercentileData,
  microNationalData: PercentileData | null,
  microRegionalData: PercentileData | null,
  regionalMedianAllRoles: number | null,
  nationalMedianAllRoles: number | null,
  liveBuckets: HistogramBucket[],
  totalLiveJobs: number
): BenchmarkResult => {
  // 1. Core Calculations
  const modifier = calculateRegionalModifier(regionalMedianAllRoles, nationalMedianAllRoles);
  const normalizedSalary = userSalary / modifier;

  // MACRO: Always national
  const macroPercentile = calculatePercentile(userSalary, macroNationalData);

  // LIVE: Real-time Adzuna data
  const livePercentile = calculateLivePercentile(userSalary, liveBuckets, totalLiveJobs);

  // MICRO: Try Regional first, then National, else NULL
  const microPercentile = microRegionalData
    ? calculatePercentile(userSalary, microRegionalData)
    : microNationalData
      ? calculatePercentile(normalizedSalary, microNationalData)
      : null;

  // 2. DYNAMIC WEIGHT SELECTION ⚖️
  const activeWeights =
    totalLiveJobs >= LIVE_CONFIDENCE_THRESHOLDS.HIGH
      ? WEIGHTS.UK.HIGH_CONFIDENCE
      : totalLiveJobs <= LIVE_CONFIDENCE_THRESHOLDS.LOW
        ? WEIGHTS.UK.LOW_CONFIDENCE
        : WEIGHTS.UK.TARGET;

  // 3. FINAL SCORE COMPUTATION
  let finalScore: number;

  if (livePercentile !== null) {
    if (microPercentile !== null) {
      // ✅ Scenario A: We have all data (Perfect match)
      finalScore =
        macroPercentile * activeWeights.MACRO +
        microPercentile * activeWeights.MICRO +
        livePercentile * activeWeights.LIVE;
    } else {
      // ⚠️ Scenario B: No Location (Micro is null)
      // We proportionally rebalance the remaining Macro and Live weights to equal 100%
      const remainingWeight = activeWeights.MACRO + activeWeights.LIVE;
      const rebalancedMacroWeight = activeWeights.MACRO / remainingWeight;
      const rebalancedLiveWeight = activeWeights.LIVE / remainingWeight;

      finalScore = macroPercentile * rebalancedMacroWeight + livePercentile * rebalancedLiveWeight;
    }
  } else {
    // 🚨 Scenario C: Adzuna API failed or returned 0 jobs (Live is null)
    finalScore =
      microPercentile !== null
        ? macroPercentile * WEIGHTS.NO_LIVE_DATA.MACRO +
          microPercentile * WEIGHTS.NO_LIVE_DATA.MICRO
        : macroPercentile;
  }

  return {
    score: Math.min(99, Math.max(1, Math.round(finalScore))),
    breakdown: {
      modifier,
      normalizedSalary,
      macroPercentile,
      microPercentile: microPercentile || 50, // This 50 is just a fallback for the UI to display, it doesn't hurt the math anymore!
      livePercentile
    }
  };
};
