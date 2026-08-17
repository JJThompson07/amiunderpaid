// utils/engineScoring/usa.ts
import type { BenchmarkResult, EngineContext } from './types';
import {
  calculateBenchmarkScore,
  calculateConfidenceScore,
  calculateLivePercentile,
  calculatePercentile,
  calculateRegionalModifier,
  LIVE_CONFIDENCE_THRESHOLDS,
  WEIGHTS
} from './math';

export const calculateUSABenchmarkScore = (ctx: EngineContext): BenchmarkResult => {
  const {
    userSalary,
    macroNationalData,
    macroRegionalData,
    microNationalData,
    microRegionalData,
    regionalMedianAllRoles,
    nationalMedianAllRoles,
    liveBuckets,
    totalLiveJobs,
    meanLiveSalary
  } = ctx;

  // 1. Core Calculations
  const modifier = calculateRegionalModifier(regionalMedianAllRoles, nationalMedianAllRoles);
  const normalizedSalary = userSalary / modifier;

  // MACRO: Use Regional (State) if available, otherwise National normalized
  const macroPercentile = macroRegionalData
    ? calculatePercentile(userSalary, macroRegionalData)
    : calculatePercentile(normalizedSalary, macroNationalData);

  // LIVE: Real-time Adzuna data
  const livePercentile = calculateLivePercentile(
    userSalary,
    liveBuckets,
    totalLiveJobs,
    meanLiveSalary
  );

  // MICRO: Try Regional first, then National, else NULL
  const microPercentile = microRegionalData
    ? calculatePercentile(userSalary, microRegionalData)
    : microNationalData
      ? calculatePercentile(normalizedSalary, microNationalData)
      : null;

  // 2. DYNAMIC WEIGHT SELECTION ⚖️
  const activeWeights =
    totalLiveJobs >= LIVE_CONFIDENCE_THRESHOLDS.HIGH
      ? WEIGHTS.USA.HIGH_CONFIDENCE
      : totalLiveJobs <= LIVE_CONFIDENCE_THRESHOLDS.LOW
        ? WEIGHTS.USA.LOW_CONFIDENCE
        : WEIGHTS.USA.TARGET;

  // 3. FINAL SCORE COMPUTATION
  const finalScore = calculateBenchmarkScore(
    macroPercentile,
    microPercentile,
    livePercentile,
    activeWeights
  );

  const confidenceScore = calculateConfidenceScore(
    totalLiveJobs,
    microRegionalData !== null, // We have micro data and it's regional (not just national)
    microPercentile !== null,
    livePercentile !== null
  );

  return {
    score: finalScore,
    confidenceScore, // 👈 Inject the score out of 10
    breakdown: {
      modifier,
      normalizedSalary,
      macroPercentile,
      microPercentile,
      livePercentile
    }
  };
};
