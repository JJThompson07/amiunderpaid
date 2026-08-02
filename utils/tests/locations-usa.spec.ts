import { describe, expect, it } from 'vitest';
import { RECRUITER_TERRITORIES_USA } from '../locations/usa';

describe('locations/usa', () => {
  it('exports RECRUITER_TERRITORIES_USA', () => {
    expect(RECRUITER_TERRITORIES_USA.length).toBeGreaterThan(0);
  });
});
