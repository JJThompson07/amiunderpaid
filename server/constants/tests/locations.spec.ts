import { describe, expect, it } from 'vitest';
import { ADZUNA_LOCATION_MAP, REED_LOCATION_MAP } from '../locations';

describe('server/constants/locations', () => {
  it('exports an Adzuna location map keyed by UI region slugs', () => {
    expect(ADZUNA_LOCATION_MAP.london).toBe('London');
    expect(ADZUNA_LOCATION_MAP['north-east']).toBe('North East England');
    expect(Object.keys(ADZUNA_LOCATION_MAP)).toHaveLength(12);
  });

  it('exports a Reed location map keyed by the same UI region slugs', () => {
    expect(REED_LOCATION_MAP.london).toBe('London');
    expect(REED_LOCATION_MAP['yorkshire-and-the-humber']).toBe('Yorkshire');
    expect(Object.keys(REED_LOCATION_MAP)).toEqual(Object.keys(ADZUNA_LOCATION_MAP));
  });
});
