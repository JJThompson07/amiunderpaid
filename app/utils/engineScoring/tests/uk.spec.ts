// tests/uk.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateUKBenchmarkScore } from '../uk';

describe('UK Engine: calculateUKBenchmarkScore', () => {
  const mockNationalData = {
    mean: 42000,
    p10: 20000,
    p25: 30000,
    p50: 40000,
    p75: 50000,
    p90: 60000
  };
  const mockRegionalData = {
    mean: 52000,
    p10: 30000,
    p25: 40000,
    p50: 50000,
    p75: 60000,
    p90: 70000
  };
  const mockBuckets = [{ value: 40000, count: 50 }];

  it('Scenario A1: All Data Present (High Confidence > 150 jobs)', () => {
    const result = calculateUKBenchmarkScore(
      50000,
      mockNationalData,
      mockNationalData,
      'All',
      mockRegionalData,
      50000,
      40000,
      mockBuckets,
      200
    );
    // Should use WEIGHTS.UK.HIGH_CONFIDENCE logic
    expect(result.score).toBeGreaterThan(0);
    expect(result.breakdown.livePercentile).toBeDefined();
    expect(result.breakdown.modifier).toBe(1.25); // 50k / 40k
  });

  it('Scenario A2: All Data Present (Low Confidence < 50 jobs)', () => {
    const result = calculateUKBenchmarkScore(
      50000,
      mockNationalData,
      mockNationalData,
      'All',
      mockRegionalData,
      null,
      null,
      mockBuckets,
      10
    );
    // Should use WEIGHTS.UK.LOW_CONFIDENCE logic
    expect(result.score).toBeGreaterThan(0);
  });

  it('Scenario B: Missing Location (microRegionalData is null) -> Rebalances Macro/Live', () => {
    const result = calculateUKBenchmarkScore(
      50000,
      mockNationalData,
      null,
      '',
      null,
      null,
      null,
      mockBuckets,
      100
    );
    // Without Micro data, it rebalances. It should NOT return the generic 50 as actual weight.
    expect(result.breakdown.microPercentile).toBe(null); // UI Fallback is null
    expect(result.score).toBeDefined(); // Math succeeds via rebalancing
  });

  it('Scenario C: Missing Live Data (0 jobs) -> Retreats to Macro/Micro fallbacks', () => {
    const result = calculateUKBenchmarkScore(
      50000,
      mockNationalData,
      mockNationalData,
      'All',
      mockRegionalData,
      null,
      null,
      [],
      0
    );
    // Live Percentile should be null, scoring uses NO_LIVE_DATA weights
    expect(result.breakdown.livePercentile).toBeNull();
    expect(result.score).toBeDefined();
  });

  it('Scenario D: Absolute Fallback (Missing Live AND Missing Micro)', () => {
    const result = calculateUKBenchmarkScore(
      50000,
      mockNationalData,
      null,
      '',
      null,
      null,
      null,
      [],
      0
    );
    // Only has Macro data. Score should equal the Macro Percentile.
    expect(result.score).toBe(result.breakdown.macroPercentile);
  });
});
