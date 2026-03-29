import { describe, it, expect } from 'vitest';
import { calculatePercentile, calculateRegionalModifier } from '../math';

const mockGovData = {
  mean: 50000,
  p10: 30000,
  p25: 40000,
  p50: 50000,
  p75: 70000,
  p90: 90000
};

describe('Core Engine: calculatePercentile', () => {
  // Mock government bracket data for testing

  it('calculates standard interpolation correctly', () => {
    // Exactly on a bracket
    expect(calculatePercentile(50000, mockGovData)).toBe(50);

    // Exactly halfway between P50 (50k) and P75 (70k) -> should be 62.5
    expect(calculatePercentile(60000, mockGovData)).toBe(62.5);
  });

  it('handles the high-earner runway (Ceiling Logic)', () => {
    // Exactly on P90
    expect(calculatePercentile(90000, mockGovData)).toBe(90);

    // Our Mastery Multiplier is 1.3.
    // 90k * 1.5 = 135. At 135, the score should hit the max (99).
    expect(calculatePercentile(135000, mockGovData)).toBe(99);

    // Salaries massively over the mastery limit should safely cap at 99
    expect(calculatePercentile(215000, mockGovData)).toBe(99);
  });

  it('handles low earners (Floor Logic)', () => {
    // Below P10, should drop under 10
    expect(calculatePercentile(20000, mockGovData)).toBeLessThan(10);

    // Absolute bottom should cap at 1
    expect(calculatePercentile(1000, mockGovData)).toBe(1);
  });
});

describe('Core Engine: calculateRegionalModifier', () => {
  it('calculates the modifier correctly', () => {
    // If London pays 40k and National is 32k, modifier is 1.25
    expect(calculateRegionalModifier(40000, 32000)).toBe(1.25);
  });

  it('returns 1.0 if data is missing', () => {
    expect(calculateRegionalModifier(null, 32000)).toBe(1.0);
    expect(calculateRegionalModifier(40000, null)).toBe(1.0);
  });
});
