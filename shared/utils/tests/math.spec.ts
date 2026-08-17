// tests/math.spec.ts
import { describe, expect, it } from 'vitest';
import {
  buildHistogramBuckets,
  calculateConfidenceScore,
  calculateLivePercentile,
  calculatePercentile,
  calculateRegionalModifier
} from '../math';

describe('Math Engine: calculatePercentile', () => {
  const mockGovData = {
    mean: 50000,
    p10: 30000,
    p25: 40000,
    p50: 50000,
    p75: 70000,
    p90: 90000
  };

  it('Scenario 1: Calculates standard linear interpolation between brackets', () => {
    // 60k is exactly halfway between P50 (50k) and P75 (70k). Score should be 62.5
    expect(calculatePercentile(60000, mockGovData)).toBe(62.5);
  });

  it('Scenario 2: Returns the exact bracket if the salary is a perfect match (prevents NaN)', () => {
    expect(calculatePercentile(50000, mockGovData)).toBe(50);
    expect(calculatePercentile(70000, mockGovData)).toBe(75);
  });

  it('Scenario 3: Extrapolates High Earners correctly (Ceiling Logic)', () => {
    // 90k * 1.5 (Ceiling Multiplier) = 135k.
    // Anything above 135k should cap at 99.
    expect(calculatePercentile(135000, mockGovData)).toBe(99);
    expect(calculatePercentile(250000, mockGovData)).toBe(99); // Hard cap
  });

  it('Scenario 4: Extrapolates Low Earners correctly (Floor Logic)', () => {
    // 30k * 0.5 (Floor Multiplier) = 15k.
    expect(calculatePercentile(15000, mockGovData)).toBe(1); // Hard cap at 1
    expect(calculatePercentile(22500, mockGovData)).toBe(5.5); // Halfway between 1 and 10
  });

  it('Scenario 5: Returns 50 as a fallback if data has less than 2 valid points', () => {
    const badData = { p10: 30000, p25: null, p50: undefined, p75: null, p90: null } as any;
    expect(calculatePercentile(60000, badData)).toBe(50);
  });
});

describe('Math Engine: calculateRegionalModifier', () => {
  it('Scenario 1: Calculates modifier when both regional and national medians exist', () => {
    expect(calculateRegionalModifier(40000, 32000)).toBe(1.25); // Regional is 25% higher
    expect(calculateRegionalModifier(24000, 30000)).toBe(0.8); // Regional is 20% lower
  });

  it('Scenario 2: Returns 1.0 if any data is missing', () => {
    expect(calculateRegionalModifier(null, 32000)).toBe(1.0);
    expect(calculateRegionalModifier(40000, null)).toBe(1.0);
    expect(calculateRegionalModifier(null, null)).toBe(1.0);
  });
});

describe('Math Engine: calculateLivePercentile', () => {
  const mockBuckets = [
    { value: 20000, count: 10 },
    { value: 40000, count: 40 }, // 40k to 60k bucket
    { value: 60000, count: 30 }, // 60k to 80k bucket
    { value: 80000, count: 20 } // Terminal bucket (80k+)
  ]; // Total jobs = 100

  it('Scenario 1: Interpolates smoothly INSIDE a standard bucket', () => {
    // 50,000 is exactly halfway through the 40k bucket (which goes to 60k and has 40 jobs).
    // It should add all 10 jobs from the 20k bucket, and HALF (20) of the jobs from the 40k bucket.
    // Total jobs below = 30. Percentile = 30.
    expect(calculateLivePercentile(50000, mockBuckets, 100, 64000)).toBe(30);
  });

  it('Scenario 2: Extrapolates smoothly INSIDE the terminal bucket (+)', () => {
    // Terminal bucket is 80k. Multiplier is 1.5. So ceiling is 120k.
    // 100,000 is exactly halfway between 80k and 120k.
    // Jobs below 80k = 80. The 80k+ bucket has 20 jobs. We add half of them (10).
    // Total jobs below = 90. Percentile = 90.
    expect(calculateLivePercentile(100000, mockBuckets, 100, 64000)).toBe(90);
  });

  it('Scenario 3: Caps safely for massive outliers above the terminal ceiling', () => {
    // Ceiling is 120k. At 150k, it should include all 100 jobs and hit the 99 cap.
    expect(calculateLivePercentile(150000, mockBuckets, 100, 64000)).toBe(99);
  });

  it('Scenario 4: Handles salaries below the absolute lowest bucket', () => {
    expect(calculateLivePercentile(10000, mockBuckets, 100, 64000)).toBe(1); // Min cap
  });

  it('Scenario 5: Returns null if no live jobs or buckets exist', () => {
    expect(calculateLivePercentile(50000, [], 0, 0)).toBe(null);
  });
});

describe('Math Engine: calculateConfidenceScore', () => {
  it('Scenario 1: Baseline Macro (Score 2)', () => {
    expect(calculateConfidenceScore(0, false, false, false)).toBe(2);
  });

  it('Scenario 2: Adds Micro Regional (+4)', () => {
    expect(calculateConfidenceScore(0, true, false, false)).toBe(6);
  });

  it('Scenario 3: Adds Micro National (+1)', () => {
    expect(calculateConfidenceScore(0, false, true, false)).toBe(3);
  });

  it('Scenario 4: Adds Live Percentile based on jobs (Linear up to 4 points at 150 jobs)', () => {
    expect(calculateConfidenceScore(75, false, false, true)).toBe(4); // 2 + (75/150)*4
    expect(calculateConfidenceScore(150, false, false, true)).toBe(6); // 2 + (150/150)*4
    expect(calculateConfidenceScore(300, false, false, true)).toBe(6); // Caps at 4 points (2 + 4)
  });

  it('Scenario 5: Perfect Score (10)', () => {
    // 2 (base) + 4 (Regional) + 4 (Live > 150)
    expect(calculateConfidenceScore(200, true, true, true)).toBe(10);
  });
});

describe('Math Engine: buildHistogramBuckets', () => {
  it('Scenario 1: Builds standard buckets with nice intervals', () => {
    const salaries = [30000, 32000, 45000, 50000, 75000];
    const buckets = buildHistogramBuckets(salaries, 5);
    // Min 30000, max 75000. Diff = 45000. 45000/5 = 9000 -> nice interval = 10000.
    // Bucket min = 30000.
    // Buckets should be 30k, 40k, 50k, 60k, 70k.
    expect(buckets[30000]).toBe(2); // 30k, 32k
    expect(buckets[40000]).toBe(1); // 45k
    expect(buckets[50000]).toBe(1); // 50k
    expect(buckets[70000]).toBe(1); // 75k
  });

  it('Scenario 2: Handles edge case min === max', () => {
    const salaries = [50000, 50000, 50000];
    const buckets = buildHistogramBuckets(salaries, 5);
    expect(Object.keys(buckets).length).toBe(1);
    expect(buckets[50000]).toBe(3);
  });

  it('Scenario 3: Ignores negative salaries and zeroes', () => {
    const salaries = [-10000, 0, 40000, 40000];
    const buckets = buildHistogramBuckets(salaries, 5);
    expect(buckets[40000]).toBe(2);
    expect(buckets[-10000]).toBeUndefined();
    expect(buckets[0]).toBeUndefined();
  });
});
