## REMOVED Requirements

### Requirement: Adzuna API Location Adapter

**Reason:** Adzuna and its geodata/location taxonomy discovery endpoint (`/api/admin/adzuna-locations`) are removed from the platform.

**Migration:** UK location translation uses `REED_LOCATION_MAP` for Reed and `resolveUkLocation` (`shared/utils/ukGeo.ts`) for ONS regional data.
