import { describe, expect, it } from 'vitest';

import {
  calculateSalaryVerdict,
  getSalaryVerdict,
  VERDICT_BAND_PERCENT,
  verdictToComparison
} from '../verdict';

describe('getSalaryVerdict', () => {
  it('uses a 2.5% band', () => {
    expect(VERDICT_BAND_PERCENT).toBe(2.5);
  });

  it('returns underpaid below the band', () => {
    expect(getSalaryVerdict(-2.6)).toBe('underpaid');
    expect(getSalaryVerdict(-40)).toBe('underpaid');
  });

  it('returns fair on and within the band edges', () => {
    expect(getSalaryVerdict(-2.5)).toBe('fair');
    expect(getSalaryVerdict(0)).toBe('fair');
    expect(getSalaryVerdict(2.5)).toBe('fair');
  });

  it('returns overpaid above the band', () => {
    expect(getSalaryVerdict(2.6)).toBe('overpaid');
    expect(getSalaryVerdict(100)).toBe('overpaid');
  });
});

describe('calculateSalaryVerdict', () => {
  it('returns unknown when the user salary is missing or non-positive', () => {
    expect(calculateSalaryVerdict(0, 50000)).toBe('unknown');
    expect(calculateSalaryVerdict(-1, 50000)).toBe('unknown');
    expect(calculateSalaryVerdict(Number.NaN, 50000)).toBe('unknown');
  });

  it('returns unknown when the market baseline is missing or non-positive', () => {
    expect(calculateSalaryVerdict(50000, 0)).toBe('unknown');
    expect(calculateSalaryVerdict(50000, -1)).toBe('unknown');
    expect(calculateSalaryVerdict(50000, Number.NaN)).toBe('unknown');
  });

  it('returns underpaid when more than 2.5% below the baseline', () => {
    expect(calculateSalaryVerdict(45000, 50000)).toBe('underpaid');
  });

  it('returns overpaid when more than 2.5% above the baseline', () => {
    expect(calculateSalaryVerdict(55000, 50000)).toBe('overpaid');
  });

  it('returns fair at parity', () => {
    expect(calculateSalaryVerdict(50000, 50000)).toBe('fair');
  });

  it('rounds the diff like the comparison cards do', () => {
    // -2.4% rounds to -2 (fair), -2.6% rounds to -3 (underpaid)
    expect(calculateSalaryVerdict(48800, 50000)).toBe('fair');
    expect(calculateSalaryVerdict(48700, 50000)).toBe('underpaid');
    // +2.5% rounds up to 3 (overpaid), -2.5% rounds to -2 (fair)
    expect(calculateSalaryVerdict(51250, 50000)).toBe('overpaid');
    expect(calculateSalaryVerdict(48750, 50000)).toBe('fair');
  });

  it('caps the diff at 100% without changing the verdict', () => {
    expect(calculateSalaryVerdict(500000, 50000)).toBe('overpaid');
  });
});

describe('verdictToComparison', () => {
  it('maps verdicts to the comparison cards numeric state', () => {
    expect(verdictToComparison('overpaid')).toBe(1);
    expect(verdictToComparison('fair')).toBe(0);
    expect(verdictToComparison('underpaid')).toBe(-1);
  });

  it('treats an unknown verdict as neutral', () => {
    expect(verdictToComparison('unknown')).toBe(0);
  });

  it('matches the cards previous inline ±2.5% thresholds', () => {
    const legacy = (diff: number): number => (diff > 2.5 ? 1 : diff < -2.5 ? -1 : 0);
    for (const diff of [-50, -3, -2.6, -2.5, -1, 0, 1, 2.5, 2.6, 3, 50]) {
      expect(verdictToComparison(getSalaryVerdict(diff))).toBe(legacy(diff));
    }
  });
});
