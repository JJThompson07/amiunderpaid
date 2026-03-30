// tests/formatter.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { formatOrdinal, formatMcaScoreForUi } from '../formatter';
import type { BenchmarkResult } from '../types';

describe('UI Formatter: formatOrdinal', () => {
  it('Scenario 1: Appends correct standard suffixes', () => {
    expect(formatOrdinal(1)).toBe('1st');
    expect(formatOrdinal(2)).toBe('2nd');
    expect(formatOrdinal(3)).toBe('3rd');
    expect(formatOrdinal(4)).toBe('4th');
  });

  it('Scenario 2: Handles the tricky teen numbers correctly', () => {
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
  });

  it('Scenario 3: Handles high tier numbers correctly', () => {
    expect(formatOrdinal(21)).toBe('21st');
    expect(formatOrdinal(22)).toBe('22nd');
    expect(formatOrdinal(99)).toBe('99th');
  });

  it('Scenario 4: Rounds decimals before appending suffix', () => {
    expect(formatOrdinal(33.3)).toBe('33rd');
    expect(formatOrdinal(98.9)).toBe('99th');
  });
});

describe('UI Formatter: formatMcaScoreForUi', () => {
  // Mock the translation function to just return the key so we can verify the logic chose the right key
  const mockT = vi.fn((key: string) => key);

  const mockResult: BenchmarkResult = {
    score: 85,
    confidenceScore: 9,
    breakdown: {
      modifier: 1.1,
      normalizedSalary: 50000,
      macroPercentile: 80,
      microPercentile: 90,
      livePercentile: 99
    }
  };

  it('Scenario 1: Assigns correct dynamic labels based on score', () => {
    const leader = formatMcaScoreForUi(mockResult, 'Dev', 'London', mockT);
    expect(leader.label).toBe('mca.labels.leader'); // Score 85

    const strong = formatMcaScoreForUi({ ...mockResult, score: 70 }, 'Dev', 'London', mockT);
    expect(strong.label).toBe('mca.labels.strong');

    const review = formatMcaScoreForUi({ ...mockResult, score: 10 }, 'Dev', 'London', mockT);
    expect(review.label).toBe('mca.labels.review');
  });

  it('Scenario 2: Pushes regional and live points when data is present', () => {
    const uiData = formatMcaScoreForUi(mockResult, 'Dev', 'London', mockT);

    // Should have 4 points: Micro, Macro, Regional (since modifier is 1.1), and Live
    expect(uiData.comparisonPoints.length).toBe(4);
    expect(uiData.comparisonPoints).toContain('mca.points.regional.higher');
    expect(uiData.comparisonPoints).toContain('mca.points.live.high');
  });

  it('Scenario 3: Omits regional point if no location or modifier is exactly 1', () => {
    const resultNoMod = { ...mockResult, breakdown: { ...mockResult.breakdown, modifier: 1 } };
    const uiData = formatMcaScoreForUi(resultNoMod, 'Dev', null, mockT);

    // Should only have 3 points: Micro, Macro, Live
    expect(uiData.comparisonPoints.length).toBe(3);
    const hasRegional = uiData.comparisonPoints.some((p) => p.includes('regional'));
    expect(hasRegional).toBe(false);
  });

  it('Scenario 4: Omits live point if live data is null', () => {
    const resultNoLive = {
      ...mockResult,
      breakdown: { ...mockResult.breakdown, livePercentile: null }
    };
    const uiData = formatMcaScoreForUi(resultNoLive, 'Dev', 'London', mockT);

    const hasLive = uiData.comparisonPoints.some((p) => p.includes('live'));
    expect(hasLive).toBe(false);
  });
});
