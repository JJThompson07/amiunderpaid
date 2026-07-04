# Adzuna Adapter Pattern Scenarios

This document lists the test cases required to verify the adapter pattern functionality.

### 1. Known Region Slug Translation

1. Setup: User searches for a role with location set to "East". The client sends `location=east` to the backend.
2. Action: The backend route `/api/adzuna/jobs` is triggered.
3. Expected Outcome: The outbound request to `api.adzuna.com` has the query parameter `where=East of England`.

### 2. Multi-word Slug Translation

1. Setup: User searches for a role with location set to "Yorkshire and The Humber". The client sends `location=yorkshire-and-the-humber` to the backend.
2. Action: The backend route `/api/adzuna/salary` is triggered.
3. Expected Outcome: The outbound request to `api.adzuna.com` has the query parameter `where=Yorkshire and The Humber`.

### 3. Unknown City Fallback

1. Setup: User searches for a role in a specific city "Manchester". The client sends `location=Manchester` to the backend.
2. Action: The backend route `/api/adzuna/jobs` is triggered.
3. Expected Outcome: Since "manchester" is not in the region map, the outbound request to `api.adzuna.com` has the query parameter `where=Manchester`.

### 4. Spaced/Capitalized Slug Fallback

1. Setup: User searches for "North East". The client sends `location=North East`.
2. Action: The backend route `/api/adzuna/jobs` is triggered.
3. Expected Outcome: The backend converts "North East" to the slug "north-east", finds it in the map, and the outbound request has `where=North East England`.
