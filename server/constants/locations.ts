// Verified against live Adzuna API responses (2026-06-28).
// These are the exact area[1] strings returned in job listing location.area arrays.
export const ADZUNA_LOCATION_MAP: Record<string, string> = {
  // UK Regions
  east: 'Eastern England',
  'east-midlands': 'East Midlands',
  london: 'London',
  'north-east': 'North East England',
  'north-west': 'North West England',
  'south-east': 'South East England',
  'south-west': 'South West England',
  'west-midlands': 'West Midlands',
  'yorkshire-and-the-humber': 'Yorkshire And The Humber',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland'
};

// Verified against Reed API behavior (2026-08-15)
export const REED_LOCATION_MAP: Record<string, string> = {
  east: 'East Anglia',
  'east-midlands': 'East Midlands',
  london: 'London',
  'north-east': 'North East',
  'north-west': 'North West',
  'south-east': 'South East',
  'south-west': 'South West',
  'west-midlands': 'West Midlands',
  'yorkshire-and-the-humber': 'Yorkshire',
  wales: 'Wales',
  scotland: 'Scotland',
  'northern-ireland': 'Northern Ireland'
};
