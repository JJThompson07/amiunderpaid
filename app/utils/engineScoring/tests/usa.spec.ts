// tests/usa.spec.ts
import { describe, it, expect } from 'vitest';
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
    const resultWithState = calculateUSABenchmarkScore(
      90000,
      mockNationalData,
      mockStateData,
      mockStateData,
      mockStateData,
      null,
      null,
      mockBuckets,
      100
    );

    // 90k is exactly P50 in mockStateData. If it used National, it would be higher.
    expect(resultWithState.breakdown.macroPercentile).toBe(50);
  });

  it('Scenario B: Falls back to normalized Macro National Data when State data is missing', () => {
    // Modifier = 1.25 (Regional 100k / National 80k)
    // Salary 100k normalized = 80k. 80k against National Data = P50.
    const resultWithNational = calculateUSABenchmarkScore(
      100000,
      mockNationalData,
      null,
      null,
      null,
      100000,
      80000,
      mockBuckets,
      100
    );

    expect(resultWithNational.breakdown.modifier).toBe(1.25);
    expect(resultWithNational.breakdown.macroPercentile).toBe(50);
  });

  it('Scenario C: Rebalances weights when Location/Micro data is missing completely', () => {
    const result = calculateUSABenchmarkScore(
      100000,
      mockNationalData,
      null,
      null,
      null,
      null,
      null,
      mockBuckets,
      100
    );
    // Should complete math without throwing errors and return null for microPercentile since no location data is available
    expect(result.breakdown.microPercentile).toBe(null); // UI Fallback is null since no micro data
    expect(result.score).toBeGreaterThan(0);
  });

  it('Scenario D: Handles Zero Live Jobs securely', () => {
    const result = calculateUSABenchmarkScore(
      100000,
      mockNationalData,
      mockStateData,
      mockStateData,
      mockStateData,
      null,
      null,
      [],
      0
    );
    expect(result.breakdown.livePercentile).toBeNull();
  });
});
