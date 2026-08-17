import type { HistogramBucket, PercentileData } from './types';

// ==========================================
// 🧮 SHARED MATH CONSTANTS
// ==========================================

export const SCORE_LIMITS = {
  MIN: 1,
  MAX: 99
};

export const BRACKETS = {
  P10: 10,
  P25: 25,
  P50: 50,
  P75: 75,
  P90: 90
};

export const LIVE_CONFIDENCE_THRESHOLDS = {
  LOW: 50,
  HIGH: 150
};

export const WEIGHTS = {
  // 🇬🇧 UK WEIGHT SETS
  UK: {
    HIGH_CONFIDENCE: { MICRO: 0.35, MACRO: 0.2, LIVE: 0.45 }, // > 150 jobs
    TARGET: { MICRO: 0.35, MACRO: 0.3, LIVE: 0.35 }, // 50-150 jobs
    LOW_CONFIDENCE: { MICRO: 0.5, MACRO: 0.35, LIVE: 0.15 } // < 50 jobs
  },
  // 🇺🇸 USA WEIGHT SETS
  USA: {
    HIGH_CONFIDENCE: { MICRO: 0.3, MACRO: 0.2, LIVE: 0.5 }, // > 150 jobs
    TARGET: { MICRO: 0.5, MACRO: 0.2, LIVE: 0.3 }, // 50-150 jobs
    LOW_CONFIDENCE: { MICRO: 0.7, MACRO: 0.2, LIVE: 0.1 } // < 50 jobs
  },
  // FALLBACKS (When Live data is completely null)
  NO_LIVE_DATA: {
    MICRO: 0.75,
    MACRO: 0.25
  }
};

// If a user earns less than the 10th percentile, we assume the
// absolute floor (1st percentile) is roughly 50% of the P10 value.
const EXTRAPOLATION_FLOOR_MULTIPLIER = 0.5;

// P99 is roughly 150% of the P100/P90 value, so we use this multiplier for any salary above the 90th percentile.
const EXTRAPOLATION_CEILING_MULTIPLIER = 1.5;

// ==========================================
// 🧮 SHARED CORE FUNCTIONS
// ==========================================

/**
 * CORE ENGINE 1: Linear Interpolation
 * Calculates exactly where a salary sits between two percentile brackets.
 */
export const calculatePercentile = (salary: number, data: PercentileData): number => {
  const points = [
    { p: BRACKETS.P10, v: data.p10 },
    { p: BRACKETS.P25, v: data.p25 },
    { p: BRACKETS.P50, v: data.p50 },
    { p: BRACKETS.P75, v: data.p75 },
    { p: BRACKETS.P90, v: data.p90 }
  ].filter((pt) => pt.v !== undefined && pt.v !== null) as { p: number; v: number }[];

  if (points.length < 2) {
    return BRACKETS.P50;
  }

  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;

  const isBelowFloor = salary < firstPoint.v;
  const isAboveCeiling = salary > lastPoint.v;

  // 🪄 THE FIX: Dynamic Bounds for High Earners
  const lower = isBelowFloor
    ? { p: SCORE_LIMITS.MIN, v: firstPoint.v * EXTRAPOLATION_FLOOR_MULTIPLIER }
    : isAboveCeiling
      ? lastPoint // If above P90, our "lower" bound starts at P90
      : points
          .slice()
          .reverse()
          .find((pt) => salary >= pt.v) || firstPoint;

  const upper = isBelowFloor
    ? firstPoint
    : isAboveCeiling
      ? { p: SCORE_LIMITS.MAX, v: lastPoint.v * EXTRAPOLATION_CEILING_MULTIPLIER } // 👈 Extrapolate to 99
      : points.find((pt) => salary <= pt.v) || lastPoint;

  if (lower.v === upper.v) {
    return lower.p;
  }

  // Linear interpolation formula
  const percentile = lower.p + (upper.p - lower.p) * ((salary - lower.v) / (upper.v - lower.v));

  return Math.min(Math.max(Math.round(percentile * 10) / 10, SCORE_LIMITS.MIN), SCORE_LIMITS.MAX);
};

/**
 * CORE ENGINE 2: Regional Modifier
 * Normalizes a regional salary against the national average.
 */
export const calculateRegionalModifier = (
  regionalMedian?: number | null,
  nationalMedian?: number | null
): number => {
  // 🪄 One-line ternary
  return regionalMedian && nationalMedian ? regionalMedian / nationalMedian : 1.0;
};

/**
 * CORE ENGINE 3: Live Market Percentile
 * Calculates percentile based on live Adzuna histogram buckets.
 */
export const calculateLivePercentile = (
  salary: number,
  buckets: HistogramBucket[],
  totalJobs: number, // Still required for the signature, but we'll override it internally
  meanSalary: number
): number | null => {
  if (!buckets?.length || !meanSalary) {
    return null;
  }

  // 1. Sort buckets ascending
  const sortedBuckets = [...buckets].sort((a, b) => Number(a.value) - Number(b.value));
  const topBucket = sortedBuckets[sortedBuckets.length - 1];
  if (!topBucket) {
    return null;
  }

  const topBucketMin = Number(topBucket.value);
  const topBucketCount = topBucket.count;

  // 2. CRITICAL FIX: Calculate the true number of jobs that actually have salary data
  const validSalaryJobs = sortedBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (validSalaryJobs === 0) {
    return null;
  }

  let jobsBelow = 0;

  // --- SCENARIO A: Salary is below the open-ended bucket ---
  if (salary <= topBucketMin) {
    for (let i = 0; i < sortedBuckets.length; i++) {
      const currentBucket = sortedBuckets[i];
      if (!currentBucket) {
        continue;
      }

      const lowerBound = Number(currentBucket.value);
      const nextBucket = sortedBuckets[i + 1];
      const upperBound = nextBucket
        ? Number(nextBucket.value)
        : lowerBound * EXTRAPOLATION_CEILING_MULTIPLIER;

      if (salary >= upperBound) {
        jobsBelow += currentBucket.count;
      } else if (salary >= lowerBound && salary < upperBound) {
        if (lowerBound === upperBound) {
          jobsBelow += currentBucket.count;
        } else {
          const proportion = (salary - lowerBound) / (upperBound - lowerBound);
          jobsBelow += currentBucket.count * proportion;
        }
        break;
      } else {
        break;
      }
    }

    // Use validSalaryJobs instead of totalJobs
    const percentile = (jobsBelow / validSalaryJobs) * 100;
    return Math.min(Math.max(Math.round(percentile * 10) / 10, SCORE_LIMITS.MIN), SCORE_LIMITS.MAX);
  }

  // --- SCENARIO B: Salary is IN the open-ended bucket ---
  const lowerJobsCount = validSalaryJobs - topBucketCount;

  // Calculate the "Salary Mass" of the known lower buckets using midpoints
  let lowerSalaryMass = 0;
  for (let i = 0; i < sortedBuckets.length - 1; i++) {
    const current = sortedBuckets[i];
    const next = sortedBuckets[i + 1];
    if (!current || !next) {
      continue;
    }

    const min = Number(current.value);
    const max = Number(next.value);
    const midpoint = (min + max) / 2;
    lowerSalaryMass += midpoint * current.count;
  }

  // Calculate total mass based on overall mean, but scaled ONLY to jobs with salaries
  const totalSalaryMass = meanSalary * validSalaryJobs;
  const topBucketMass = Math.max(totalSalaryMass - lowerSalaryMass, 0);

  // Find the true average of the top earners
  let topBucketMean = topBucketMin * EXTRAPOLATION_CEILING_MULTIPLIER;
  if (topBucketCount > 0) {
    topBucketMean = Math.max(topBucketMass / topBucketCount, topBucketMin * 1.1);
  }

  // Synthetic Maximum
  const syntheticMax = topBucketMean + (topBucketMean - topBucketMin);
  const cappedSalary = Math.min(salary, syntheticMax);
  let positionInTopBucket = 0;

  if (syntheticMax > topBucketMin) {
    positionInTopBucket = (cappedSalary - topBucketMin) / (syntheticMax - topBucketMin);
  }

  jobsBelow = lowerJobsCount + topBucketCount * positionInTopBucket;

  // Use validSalaryJobs instead of totalJobs
  const finalPercentile = (jobsBelow / validSalaryJobs) * 100;

  return Math.min(
    Math.max(Math.round(finalPercentile * 10) / 10, SCORE_LIMITS.MIN),
    SCORE_LIMITS.MAX
  );
};

export const calculateConfidenceScore = (
  totalLiveJobs: number,
  hasMicroRegional: boolean,
  hasMicroNational: boolean,
  hasLivePercentile: boolean
): number => {
  let score = 2; // Baseline Macro

  // Tiered Micro Points
  if (hasMicroRegional) {
    score += 4; // Perfect local match
  } else if (hasMicroNational) {
    score += 1; // National match (Still better than nothing!)
  }

  if (hasLivePercentile && totalLiveJobs > 0) {
    const liveScore = Math.min(4, (totalLiveJobs / LIVE_CONFIDENCE_THRESHOLDS.HIGH) * 4);
    score += liveScore;
  }

  return Math.round(score * 10) / 10;
};

/**
 * CORE ENGINE 5: Universal Benchmark Scoring
 * Consolidates the common logic between UK and USA for calculating the final score.
 */
export const calculateBenchmarkScore = (
  macroPercentile: number,
  microPercentile: number | null,
  livePercentile: number | null,
  activeWeights: { MACRO: number; MICRO: number; LIVE: number }
): number => {
  let finalScore: number;

  if (livePercentile !== null) {
    if (microPercentile !== null) {
      // ✅ Scenario A: We have all data
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

  return Math.min(99, Math.max(1, Math.round(finalScore)));
};

/**
 * CORE ENGINE 4: Dynamic Histogram Builder
 * Takes an array of raw salary numbers and returns a balanced, max-7-bucket histogram
 * with clean, human-readable bucket boundaries.
 */
export const buildHistogramBuckets = (
  salaries: number[],
  maxBuckets: number = 7
): Record<number, number> => {
  const validSalaries = salaries.filter((s) => s > 0);
  if (!validSalaries.length) {return {};}

  const min = Math.min(...validSalaries);
  const max = Math.max(...validSalaries);

  if (min === max) {
    return { [min]: validSalaries.length };
  }

  // 1. Calculate raw interval
  const rawInterval = (max - min) / maxBuckets;

  // 2. Find a "nice" interval (e.g. 1000, 2000, 5000, 10000, 20000)
  // Ensure we don't do log10 of 0 or negative
  const safeInterval = Math.max(rawInterval, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(safeInterval)));
  const normalized = safeInterval / magnitude; // between 1 and 10

  let niceMultiplier;
  if (normalized <= 1) {niceMultiplier = 1;}
  else if (normalized <= 2) {niceMultiplier = 2;}
  else if (normalized <= 5) {niceMultiplier = 5;}
  else {niceMultiplier = 10;}

  const interval = niceMultiplier * magnitude;

  // 3. Snap min down to nearest interval
  const bucketMin = Math.floor(min / interval) * interval;

  // 4. Build histogram
  const histogram: Record<number, number> = {};

  for (const salary of validSalaries) {
    const bucketIndex = Math.floor((salary - bucketMin) / interval);
    // Cap at maxBuckets - 1 so we don't accidentally create an 8th bucket if max == exact bound
    const safeIndex = Math.min(bucketIndex, maxBuckets - 1);
    const bucketKey = bucketMin + safeIndex * interval;
    histogram[bucketKey] = (histogram[bucketKey] || 0) + 1;
  }

  return histogram;
};
