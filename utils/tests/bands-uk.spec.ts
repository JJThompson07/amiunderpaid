import { describe, expect, it } from 'vitest';
import { JobBand, TERRITORY_BAND_MAP } from '../bands/uk';

describe('UK Job Bands', () => {
  it('correctly maps Mega-Hubs', () => {
    expect(TERRITORY_BAND_MAP[7]).toBe(JobBand.BAND_1_MEGA_HUB); // Greater London
    expect(TERRITORY_BAND_MAP[18]).toBe(JobBand.BAND_1_MEGA_HUB); // City of London
  });

  it('correctly maps Major Metros', () => {
    expect(TERRITORY_BAND_MAP[2]).toBe(JobBand.BAND_2_MAJOR_METRO); // Manchester
    expect(TERRITORY_BAND_MAP[19]).toBe(JobBand.BAND_2_MAJOR_METRO); // West Midlands
  });

  it('correctly maps Rural areas', () => {
    expect(TERRITORY_BAND_MAP[108]).toBe(JobBand.BAND_5_RURAL_LOW_VOLUME);
    expect(TERRITORY_BAND_MAP[21]).toBe(JobBand.BAND_5_RURAL_LOW_VOLUME);
  });

  it('does not map unknown territories', () => {
    expect(TERRITORY_BAND_MAP[9999]).toBeUndefined();
  });
});
