// tests/usa.spec.ts
import { describe, expect, it } from 'vitest';
import { calculateUSABenchmarkScore } from '../usa';

describe('USA Engine: calculateUSABenchmarkScore', () => {
  const mockNationalData = {
    mean: 85000,
    p10: 40000,
    p25: 60000,
    p50: 80000,
    p75: 100000,
    p90: 120000
  };
  const mockStateData = {
    mean: 95000,
    p10: 50000,
    p25: 70000,
    p50: 90000,
    p75: 110000,
    p90: 130000
  };
  const mockBuckets = [{ value: 80000, count: 100 }];

  it('Scenario A: Uses Macro Regional Data (State Level) when provided', () => {
    const resultWithState = calculateUSABenchmarkScore({
      userSalary: 90000,
      macroNationalData: mockNationalData,
      macroRegionalData: mockStateData,
      microNationalData: mockStateData,
      microRegionalData: mockStateData,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: mockBuckets,
      totalLiveJobs: 100,
      meanLiveSalary: 80000
    });

    // 90k is exactly P50 in mockStateData. If it used National, it would be higher.
    expect(resultWithState.breakdown.macroPercentile).toBe(50);
  });

  it('Scenario B: Falls back to normalized Macro National Data when State data is missing', () => {
    // Modifier = 1.25 (Regional 100k / National 80k)
    // Salary 100k normalized = 80k. 80k against National Data = P50.
    const resultWithNational = calculateUSABenchmarkScore({
      userSalary: 100000,
      macroNationalData: mockNationalData,
      macroRegionalData: null,
      microNationalData: null,
      microRegionalData: null,
      regionalMedianAllRoles: 100000,
      nationalMedianAllRoles: 80000,
      liveBuckets: mockBuckets,
      totalLiveJobs: 100,
      meanLiveSalary: 80000
    });

    expect(resultWithNational.breakdown.modifier).toBe(1.25);
    expect(resultWithNational.breakdown.macroPercentile).toBe(50);
  });

  it('Scenario C: Rebalances weights when Location/Micro data is missing completely', () => {
    const result = calculateUSABenchmarkScore({
      userSalary: 100000,
      macroNationalData: mockNationalData,
      macroRegionalData: null,
      microNationalData: null,
      microRegionalData: null,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: mockBuckets,
      totalLiveJobs: 100,
      meanLiveSalary: 80000
    });
    // Should complete math without throwing errors and return null for microPercentile since no location data is available
    expect(result.breakdown.microPercentile).toBe(null); // UI Fallback is null since no micro data
    expect(result.score).toBe(89);
  });

  it('Scenario D: Handles Zero Live Jobs securely', () => {
    const result = calculateUSABenchmarkScore({
      userSalary: 100000,
      macroNationalData: mockNationalData,
      macroRegionalData: mockStateData,
      microNationalData: mockStateData,
      microRegionalData: mockStateData,
      regionalMedianAllRoles: null,
      nationalMedianAllRoles: null,
      liveBuckets: [],
      totalLiveJobs: 0,
      meanLiveSalary: 0
    });
    expect(result.breakdown.livePercentile).toBeNull();
  });
});
