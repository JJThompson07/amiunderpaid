import { describe, expect, it } from 'vitest';
import { getPercentage, getUncappedPercentage, getDiff, getDiffPercentage, getRawDiffPercentage, getRawUncappedDiffPercentage, slugify } from '../utility';

describe('utility', () => {
  it('getPercentage', () => {
    expect(getPercentage(50, 100)).toBe(50);
    expect(getPercentage(50, 100, true)).toBe(50);
    expect(getPercentage(50, 0)).toBe(0);
    expect(getPercentage(200, 100)).toBe(100);
  });
  it('getUncappedPercentage', () => {
    expect(getUncappedPercentage(150, 100)).toBe(150);
    expect(getUncappedPercentage(150, 100, true)).toBe(150);
    expect(getUncappedPercentage(150, 0)).toBe(0);
  });
  it('getDiff', () => {
    expect(getDiff(10, 5)).toBe(5);
    expect(getDiff(5, 10)).toBe(5);
    expect(getDiff(5, 10, true)).toBe(-5);
    expect(getDiff(5, 0)).toBe(0);
  });
  it('getDiffPercentage', () => {
    expect(getDiffPercentage(150, 100)).toBe(50);
    expect(getDiffPercentage(150, 0)).toBe(0);
  });
  it('getRawDiffPercentage', () => {
    expect(getRawDiffPercentage(50, 100)).toBe(-50);
    expect(getRawDiffPercentage(150, 0)).toBe(0);
  });
  it('getRawUncappedDiffPercentage', () => {
    expect(getRawUncappedDiffPercentage(50, 100)).toBe(-50);
    expect(getRawUncappedDiffPercentage(150, 0)).toBe(0);
  });
  it('slugify', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('ui/ux')).toBe('ui-ux');
    expect(slugify('test\\path')).toBe('test-path');
  });
});
