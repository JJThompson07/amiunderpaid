import { describe, expect, it } from 'vitest';
import { JobBand, US_TERRITORY_BAND_MAP } from '../bands/usa';

describe('bands/usa', () => {
  it('exports JobBand', () => {
    expect(JobBand.BAND_1_MEGA_HUB).toBe(1);
    expect(US_TERRITORY_BAND_MAP[205]).toBe(JobBand.BAND_1_MEGA_HUB);
  });
});
