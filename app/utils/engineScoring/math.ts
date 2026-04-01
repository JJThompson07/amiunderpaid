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

  if (points.length < 2) return BRACKETS.P50;

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
  totalJobs: number
): number | null => {
  if (!buckets?.length || !totalJobs) return null;

  // 1. Ensure buckets are sorted by value ascending
  const sortedBuckets = [...buckets].sort((a, b) => Number(a.value) - Number(b.value));

  let jobsBelow = 0;

  for (let i = 0; i < sortedBuckets.length; i++) {
    const currentBucket = sortedBuckets[i];

    // 👈 TypeScript Fix: Proves to the compiler that currentBucket exists
    if (!currentBucket) continue;

    const lowerBound = Number(currentBucket.value);

    // 👈 TypeScript Fix: Safely grab the next bucket
    const nextBucket = sortedBuckets[i + 1];
    const upperBound = nextBucket
      ? Number(nextBucket.value)
      : lowerBound * EXTRAPOLATION_CEILING_MULTIPLIER;

    if (salary >= upperBound) {
      // Salary clears this bucket entirely
      jobsBelow += currentBucket.count;
    } else if (salary >= lowerBound && salary < upperBound) {
      // Salary falls INSIDE this bucket
      if (lowerBound === upperBound) {
        jobsBelow += currentBucket.count;
      } else {
        const proportion = (salary - lowerBound) / (upperBound - lowerBound);
        jobsBelow += currentBucket.count * proportion;
      }
      break;
    } else {
      // Salary is below this bucket
      break;
    }
  }

  // 3. Calculate final percentile based on the interpolated jobs below
  const percentile = (jobsBelow / totalJobs) * 100;
  return Math.min(Math.max(Math.round(percentile * 10) / 10, SCORE_LIMITS.MIN), SCORE_LIMITS.MAX);
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
