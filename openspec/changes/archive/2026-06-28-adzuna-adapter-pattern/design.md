# Adzuna Adapter Pattern Design

## Architecture

We will implement a simple Adapter pattern on the server side to decouple our internal application state (URL-friendly slugs) from an external dependency's requirements (Adzuna's official location strings).

### 1. The Mapping Dictionary

We will create `server/constants/locations.ts` exporting a `Record<string, string>` named `ADZUNA_LOCATION_MAP`.

Example mappings:

- `'east'`: `'East of England'`
- `'east-midlands'`: `'East Midlands'`
- `'london'`: `'London'`
- `'north-east'`: `'North East England'`
- `'north-west'`: `'North West England'`
- `'south-east'`: `'South East England'`
- `'south-west'`: `'South West England'`
- `'west-midlands'`: `'West Midlands'`
- `'yorkshire-and-the-humber'`: `'Yorkshire and The Humber'`
- `'wales'`: `'Wales'`
- `'scotland'`: `'Scotland'`
- `'northern-ireland'`: `'Northern Ireland'`

### 2. The API Interceptors

In both `server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`, we currently extract `locationStr`. We will add an interception layer:

```typescript
import { ADZUNA_LOCATION_MAP } from '../../constants/locations';

// Existing code extracts cleanLocation...
let cleanLocation = locationStr.split(',')[0]!.trim();

// NEW: Adapter mapping
const slug = cleanLocation.toLowerCase().replace(/\s+/g, '-');
if (ADZUNA_LOCATION_MAP[slug]) {
  cleanLocation = ADZUNA_LOCATION_MAP[slug];
}

params.where = cleanLocation;
```

This ensures our internal UI and URLs remain decoupled from Adzuna's naming quirks.
