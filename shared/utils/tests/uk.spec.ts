// tests/uk.spec.ts
import { describe, expect, it } from 'vitest';
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
    const result = calculateUKBenchmarkScore({
      userSalary: 50000,
      macroNationalData: mockNationalData,
      microNationalData: mockNationalData,
      microNationalOfficialTitle: 'All',
      microRegionalData: mockRegionalData,
      regionalMedianAllRoles: 50000,
      nationalMedianAllRoles: 40000,
      liveBuckets: mockBuckets,
      totalLiveJobs: 200,
      meanLiveSalary: 40000
    });
    // Should use WEIGHTS.UK.HIGH_CONFIDENCE logic
    expect(result.score).toBe(77);
    expect(result.breakdown.livePercentile).toBeDefined();
    expect(result.breakdown.modifier).toBe(1.25); // 50k / 40k
  });

  it('Scenario A2: All Data Present (Low Confidence < 50 jobs)', () => {
    const result = calculateUKBenchmarkScore({
      userSalary: 50000,
      macroNationalData: mockNationalData,
      microNationalData: mockNationalData,
      microNationalOfficialTitle: 'All',
      microRegionalData: mockRegionalData,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: mockBuckets,
      totalLiveJobs: 10,
      meanLiveSalary: 40000
    });
    // Should use WEIGHTS.UK.LOW_CONFIDENCE logic
    expect(result.score).toBe(66);
  });

  it('Scenario B: Missing Location (microRegionalData is null) -> Rebalances Macro/Live', () => {
    const result = calculateUKBenchmarkScore({
      userSalary: 50000,
      macroNationalData: mockNationalData,
      microNationalData: null,
      microNationalOfficialTitle: '',
      microRegionalData: null,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: mockBuckets,
      totalLiveJobs: 100,
      meanLiveSalary: 40000
    });
    // Without Micro data, it rebalances. It should NOT return the generic 50 as actual weight.
    expect(result.breakdown.microPercentile).toBe(null); // UI Fallback is null
    expect(result.score).toBe(88); // Math succeeds via rebalancing
  });

  it('Scenario C: Missing Live Data (0 jobs) -> Retreats to Macro/Micro fallbacks', () => {
    const result = calculateUKBenchmarkScore({
      userSalary: 50000,
      macroNationalData: mockNationalData,
      microNationalData: mockNationalData,
      microNationalOfficialTitle: 'All',
      microRegionalData: mockRegionalData,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: [],
      totalLiveJobs: 0,
      meanLiveSalary: 0
    });
    // Live Percentile should be null, scoring uses NO_LIVE_DATA weights
    expect(result.breakdown.livePercentile).toBeNull();
    expect(result.score).toBe(56);
  });

  it('Scenario D: Absolute Fallback (Missing Live AND Missing Micro)', () => {
    const result = calculateUKBenchmarkScore({
      userSalary: 50000,
      macroNationalData: mockNationalData,
      microNationalData: null,
      microNationalOfficialTitle: '',
      microRegionalData: null,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: [],
      totalLiveJobs: 0,
      meanLiveSalary: 0
    });
    // Only has Macro data. Score should equal the Macro Percentile.
    expect(result.score).toBe(result.breakdown.macroPercentile);
  });
});
