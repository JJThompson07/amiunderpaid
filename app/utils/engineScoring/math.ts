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

export const WEIGHTS = {
  // ==========================================
  // 🇬🇧 UK ENGINE WEIGHTS
  // ==========================================
  STANDARD: {
    MICRO: 0.6, // 60%
    MACRO: 0.2, // 20%
    LIVE: 0.2 // 20%
  },
  FALLBACK: {
    MICRO: 0.75, // 75%
    MACRO: 0.25 // 25%
  },

  // ==========================================
  // 🇺🇸 USA ENGINE WEIGHTS
  // ==========================================
  EXACT_MATCH: {
    MICRO: 0.6, // 60% (We have local state data for their exact job)
    MACRO: 0.2, // 20%
    LIVE: 0.2 // 20%
  },
  FALLBACK_MATCH: {
    MICRO: 0.5, // 50% (We only have national data for their exact job)
    MACRO: 0.3, // 30% (Rely a bit more on national averages)
    LIVE: 0.2 // 20%
  },
  NO_LIVE_DATA: {
    MICRO: 0.75, // 75%
    MACRO: 0.25 // 25%
  }
};

// If a user earns less than the 10th percentile, we assume the
// absolute floor (1st percentile) is roughly 50% of the P10 value.
const EXTRAPOLATION_FLOOR_MULTIPLIER = 0.5;

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

  if (points.length < 2) return BRACKETS.P50; // Need at least two points to interpolate

  // 🎯 TS Fix: We use the non-null assertion (!) because the line above
  // mathematically guarantees that index 0 and index length-1 exist.
  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;

  const isBelowFloor = salary < firstPoint.v;
  const isAboveCeiling = salary > lastPoint.v;

  // 🪄 Declarative bounds finding using our guaranteed variables
  const lower = isBelowFloor
    ? { p: SCORE_LIMITS.MIN, v: firstPoint.v * EXTRAPOLATION_FLOOR_MULTIPLIER }
    : isAboveCeiling
      ? points[points.length - 2]!
      : points
          .slice()
          .reverse()
          .find((pt) => salary >= pt.v) || firstPoint;

  const upper = isBelowFloor
    ? firstPoint
    : isAboveCeiling
      ? lastPoint
      : points.find((pt) => salary <= pt.v) || lastPoint;

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

  const jobsBelow = buckets.reduce(
    (acc, bucket) => (Number(bucket.value) < salary ? acc + bucket.count : acc),
    0
  );

  const percentile = (jobsBelow / totalJobs) * 100;
  return Math.min(Math.max(Math.round(percentile * 10) / 10, SCORE_LIMITS.MIN), SCORE_LIMITS.MAX);
};
