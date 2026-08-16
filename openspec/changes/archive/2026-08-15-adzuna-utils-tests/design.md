# Design: Adzuna Utils Unit Tests

## 1. Context
`server/utils/adzuna.ts` exposes two functions:
1. `sanitizeAdzunaData(data: any): any`
   - Recursively iterates through arrays and objects.
   - Strips out any keys starting and ending with `__`, which are reserved for Firestore.
2. `generateCacheKey(title: string, location: string, country: string): string`
   - Cleans the string inputs and constructs a consistent key used for Firestore caching.

## 2. Approach

### Testing `sanitizeAdzunaData`
We will use Vitest to mock and run assertions against various data shapes:
- **Base Cases**: Strings, numbers, null, undefined.
- **Flat Objects**: Objects with valid keys and invalid keys (`__proto__`, `__id__`).
- **Nested Objects**: Objects inside objects with invalid keys at depth.
- **Arrays**: Arrays containing strings and objects with invalid keys.

### Testing `generateCacheKey`
We will run assertions to ensure:
- It accurately joins `country-location-title`.
- It converts characters to lowercase.
- It correctly preserves `+`, `#`, and `.` for programming languages (e.g., "C++", "C#", ".NET").
- It strips and replaces other non-alphanumeric characters with `-`.
- It correctly handles missing or empty locations.
