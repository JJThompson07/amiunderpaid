import { describe, expect, it } from 'vitest';
import { ONS_LOCATIONS, RECRUITER_TERRITORIES_UK } from '../locations/uk';

describe('locations/uk', () => {
  it('exports ONS_LOCATIONS and RECRUITER_TERRITORIES_UK', () => {
    expect(ONS_LOCATIONS.length).toBeGreaterThan(0);
    expect(RECRUITER_TERRITORIES_UK.length).toBeGreaterThan(0);
  });
});
