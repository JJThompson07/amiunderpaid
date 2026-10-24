# Analytics Tracking

## Purpose

Track user sessions and search activities for analytical purposes.

## Requirements

### Requirement: Session Tracking on Mount

The system SHALL track a user session precisely once per day when they mount the app.

#### Scenario: Client connects

- **WHEN** the application mounts on the client and is not in development mode
- **THEN** it checks local storage to ensure a session hasn't been logged today, and if not, logs it to `/api/analytics/session`

### Requirement: Process Session Data

The system SHALL aggregate session analytics by country and city in Firestore.

#### Scenario: Aggregating session location

- **WHEN** a session is logged to `/api/analytics/session`
- **THEN** it increments the total session count and the location-specific count for the current day based on headers.

### Requirement: Admin Analytics View

The system SHALL provide an interface for administrators to view session analytics.

#### Scenario: Admin views sessions

- **WHEN** an admin navigates to `/admin/sessions`
- **THEN** they can view a table of session dates, location breakdowns, and total counts.

### Requirement: Server-side search tracking ID generation

The system SHALL mint document IDs on the server when creating new search history records, rather than accepting client-provided IDs.

#### Scenario: Creating a new search record

- **WHEN** a client submits a new search to `/api/user/track-search`
- **THEN** the system ignores any client-provided ID, generates a new unique document ID in Firestore, and returns the generated ID to the client

### Requirement: Validated search record updates

The system SHALL ensure that search record updates explicitly target an existing document without full overwrites.

#### Scenario: Updating an existing search record

- **WHEN** a client submits an update to `/api/user/update-search` with a specific ID
- **THEN** the system updates only the specified fields on the target document without replacing the entire document

### Requirement: Authenticated analytics updates

The system SHALL require a valid HMAC signature to update search history records. The HMAC SHALL be signed and verified with a dedicated `searchTokenSecret`, registered in private `runtimeConfig` with no committed fallback value, distinct from any secret used for another purpose (e.g. the Stripe webhook signing secret). If `searchTokenSecret` is not configured, the endpoints that sign or verify these tokens SHALL fail closed with a 500 rather than defaulting to a literal value. Signature comparison SHALL use a timing-safe comparison.

#### Scenario: Invalid signature on search update

- **WHEN** a client submits a search history update with an invalid or missing token
- **THEN** the system rejects the update with a 403 Forbidden

#### Scenario: Search token secret is not configured

- **WHEN** `searchTokenSecret` is unset in the running environment
- **THEN** `track-search` and `update-search` fail closed with a 500 rather than signing or verifying with a default literal

#### Scenario: Token comparison resists timing analysis

- **WHEN** the system verifies a submitted token against the expected HMAC
- **THEN** it uses a constant-time comparison (`crypto.timingSafeEqual`) rather than a variable-time string comparison

### Requirement: Affiliate Link Click Tracking

The system SHALL track user clicks on affiliate partner links and action buttons on salary results pages. The tracking event SHALL be named `affiliate_click` and include the partner slug, placement identifier, country, and the salary verdict. Affiliate links SHALL open in a new tab with `target="_blank"` and `rel="sponsored"`, and the tracking invocation SHALL NOT block, delay, or prevent navigation.

#### Scenario: User clicks an affiliate CTA in the negotiation grid

- **WHEN** a user clicks an affiliate link or button in the negotiation grid (`placement: 'negotiation-grid'`)
- **THEN** the system fires an `affiliate_click` event containing the partner's stable slug, `'negotiation-grid'`, the current country code, and the derived salary verdict (`'underpaid'`, `'fair'`, `'overpaid'`, or `'unknown'`), without blocking tab opening.

#### Scenario: User clicks the standalone affiliate card

- **WHEN** a user clicks the standalone CV-Library CTA on the salary results page (`placement: 'standalone-xl'`)
- **THEN** the system fires an `affiliate_click` event containing `'cv-library'`, `'standalone-xl'`, `'UK'`, and the derived salary verdict.

### Requirement: Viewport Impression Tracking for Affiliate Cards

The system SHALL track an impression event named `affiliate_impression` when an individual affiliate card becomes visible in the user's viewport. Tracking SHALL be client-only and SSR-safe, evaluated using `IntersectionObserver` per card element. The impression SHALL fire at most once per page view per partner and placement combination, and SHALL NOT fire on component mount before the specific card enters the viewport or re-fire on subsequent scroll oscillations.

#### Scenario: Individual affiliate card scrolls into view

- **WHEN** at least half of an individual affiliate card's CTA link is visible in the viewport
- **THEN** the system emits an `affiliate_impression` event with that partner's slug, placement identifier, country code, and salary verdict.

#### Scenario: Lower cards in single-column layout remain off-screen

- **WHEN** the top of an affiliate section enters the viewport on mobile but lower cards remain scrolled out of view
- **THEN** the system only emits an impression for the card that has entered the viewport, and does not fire impressions for off-screen cards until they independently intersect.

#### Scenario: Duplicate viewport entries on same page view

- **WHEN** an affiliate card that has already emitted an impression scrolls out of the viewport and back into view
- **THEN** the system does not fire a second impression event for that partner and placement during the same page view.

#### Scenario: Server-side rendering and non-browser environments

- **WHEN** the page is rendered on the server or in an environment without `IntersectionObserver`
- **THEN** no error is thrown and no impression events are emitted.

### Requirement: Affiliate Offer Dismissal Tracking

The system SHALL track user dismissals of affiliate offers (such as delayed toast prompts or dismissible banners). The tracking event SHALL be named `affiliate_dismiss` and contain the partner slug, placement identifier, country, and salary verdict. The tracking call SHALL inherit dev-mode gating and consent checks, and SHALL NOT send user salary or PII.

#### Scenario: User dismisses an affiliate offer

- **WHEN** a user dismisses an affiliate prompt or toast (`placement: 'toast'`)
- **THEN** the system emits an `affiliate_dismiss` event containing the partner slug, placement, country, and salary verdict.

#### Scenario: Dismissal tracking under missing consent or dev mode

- **WHEN** an affiliate dismissal occurs while `analytics_consent` is not `'granted'` or `import.meta.dev` is true
- **THEN** the tracking call exits cleanly as a no-op without dispatching telemetry.

### Requirement: Privacy Safeguards and Consent Gating for Affiliate Analytics

Affiliate tracking (`affiliate_click`, `affiliate_impression`, and `affiliate_dismiss`) SHALL inherit the global dev-mode check (`import.meta.dev`) and cookie consent verification (`analytics_consent === 'granted'`) via `trackEvent`. Affiliate event payloads SHALL NEVER contain user salaries, currency symbols, search tokens, job queries, or personally identifiable information (PII).

#### Scenario: User has not granted analytics consent

- **WHEN** an affiliate click, impression, or dismissal occurs while `analytics_consent` is not `'granted'`
- **THEN** no analytics event is sent to Google Analytics / `gtag`.

#### Scenario: Local development environment

- **WHEN** an affiliate click, impression, or dismissal occurs while running in development (`import.meta.dev === true`)
- **THEN** the tracking call exits cleanly as a no-op without sending telemetry.

#### Scenario: Affiliate event payload sanitization

- **WHEN** an `affiliate_click`, `affiliate_impression`, or `affiliate_dismiss` event is dispatched
- **THEN** the event payload strictly contains `partner`, `placement`, `country`, `verdict`, and `brand`, with no salary values or user identifiers included.

### Requirement: Centralized Partner Slugs and Verdict Derivation

The system SHALL use stable partner slugs (`salary-negotiator`, `purple-cv`, `cv-library`) rather than localized display names, supported placements (`negotiation-grid`, `standalone-xl`, `toast`), and SHALL determine the salary verdict using a single-source calculation against the market baseline (`meanSalary || marketAverage`):

- If `userSalary <= 0` or the baseline (`meanSalary || marketAverage`) is `<= 0` or unavailable, verdict is `'unknown'`.
- The diff percent is rounded to a whole percent (capped at 100) exactly as `getRawDiffPercentage` does, so the verdict matches the one shown in the comparison cards.
- If `diffPercent < -2.5%`, verdict is `'underpaid'`.
- If `diffPercent > 2.5%`, verdict is `'overpaid'`.
- If within `[-2.5%, 2.5%]`, verdict is `'fair'`.

#### Scenario: Deriving verdict with missing or non-positive salary data

- **WHEN** the user's salary or the market baseline is less than or equal to 0, or unavailable
- **THEN** the verdict is resolved as `'unknown'`.

#### Scenario: Deriving verdict for salary below market threshold

- **WHEN** the user's salary is more than 2.5% below the market baseline (diff percent < -2.5)
- **THEN** the verdict is resolved as `'underpaid'`.

#### Scenario: Deriving verdict for salary above market threshold

- **WHEN** the user's salary is more than 2.5% above the market baseline (diff percent > 2.5)
- **THEN** the verdict is resolved as `'overpaid'`.

#### Scenario: Deriving verdict for salary within market parity band

- **WHEN** the user's salary is within ±2.5% of the market baseline
- **THEN** the verdict is resolved as `'fair'`.

#### Scenario: Consistent verdict calculation across page placements

- **WHEN** verdict is evaluated for cards in the negotiation grid and the standalone card on the same page view
- **THEN** both placements calculate the verdict using the shared baseline (`meanSalary || marketAverage`), ensuring consistent verdict reporting across all placements.
