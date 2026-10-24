## Purpose

Surfaces verdict-relevant affiliate offers to salary benchmarking users via an ordered negotiation grid and a timed, non-intrusive affiliate offer toast prompt.

## ADDED Requirements

### Requirement: Data-driven Affiliate Offer Ordering by Verdict and Country

The system SHALL organize affiliate offers through a centralized registry that filters offers by user country and orders them by relevance to the user's salary verdict (`'underpaid'`, `'fair'`, `'overpaid'`, or `'unknown'`), placing the lead offer first in the negotiation section.

#### Scenario: Underpaid user viewing negotiation grid

- **WHEN** an underpaid user (`verdict === 'underpaid'`) views the negotiation section
- **THEN** Salary Negotiator is presented as the primary lead offer first in the grid.

#### Scenario: Fairly paid UK user viewing negotiation grid

- **WHEN** a fairly paid UK user (`country === 'UK'` and `verdict === 'fair'`) views the negotiation section
- **THEN** PurpleCV is presented as the lead offer first in the grid, followed by Salary Negotiator and CV-Library.

#### Scenario: Overpaid UK user viewing negotiation grid

- **WHEN** an overpaid UK user (`country === 'UK'` and `verdict === 'overpaid'`) views the negotiation section
- **THEN** PurpleCV is presented as the lead offer first in the grid, followed by Salary Negotiator and CV-Library.

#### Scenario: US user viewing negotiation grid

- **WHEN** a US user (`country === 'USA'`) views the negotiation section
- **THEN** PurpleCV and CV-Library are filtered out, and the grid presents only Salary Negotiator alongside the custom email script.

#### Scenario: Standalone desktop card slot removed

- **WHEN** an XL desktop user in the UK views the salary results page
- **THEN** no standalone CV-Library card is rendered above the negotiation grid, and CV-Library only appears within the grid.

### Requirement: Delayed Affiliate Offer Toast Presentation

The system SHALL display an affiliate offer toast prompt on the salary results page tailored to the user's lead offer after a deliberate 7-second delay, provided all benchmark data is loaded and gating criteria are met.

#### Scenario: Timed appearance on completed salary results

- **WHEN** the salary results page has finished loading (`pending`, `adzunaLoading`, `resolving` are false and ambiguity modal is not open), benchmark data exists (`hasGovernmentData || hasJobsData`), and 7 seconds elapse
- **THEN** the system displays the affiliate offer toast featuring the lead partner, headline, message, sponsored badge, and external CTA link.

#### Scenario: Delay cancelled on navigation or unmount

- **WHEN** the user navigates away or unmounts the page before the 7-second delay expires
- **THEN** the pending timer is cancelled and no toast is displayed.

#### Scenario: Delayed until cookie consent interaction

- **WHEN** results load while the cookie consent banner is visible (`analyticsConsent === null`)
- **THEN** the affiliate toast is not displayed until after cookie consent has been resolved.

#### Scenario: System toast open at delay expiration

- **WHEN** the 7-second delay elapses while a global system notification toast is open (`toastState.isOpen === true`)
- **THEN** the affiliate offer toast waits until the system toast closes, and then displays immediately.

#### Scenario: Suppression when salary results have no benchmark data

- **WHEN** a salary search returns no government data and no live job data (`!hasGovernmentData && !hasJobsData`)
- **THEN** the affiliate offer toast is not scheduled or displayed.

### Requirement: Comprehensive Verdict-Specific Toast Messaging

The system SHALL define toast headline and description copy for every supported partner and verdict combination so that every valid (country, verdict) search resolves to complete localization keys in both `en-GB` and `en-US`.

#### Scenario: Underpaid Salary Negotiator toast copy

- **WHEN** Salary Negotiator is shown to an underpaid user (`verdict === 'underpaid'`)
- **THEN** the toast copy focuses on closing the salary gap and securing fair market compensation.

#### Scenario: Fair Salary Negotiator toast copy

- **WHEN** Salary Negotiator is shown as the lead offer to a fairly paid US user (`verdict === 'fair'`)
- **THEN** the toast copy focuses on performance reviews, merit increases, and bonus negotiation.

#### Scenario: Overpaid Salary Negotiator toast copy

- **WHEN** Salary Negotiator is shown as the lead offer to an overpaid US user (`verdict === 'overpaid'`)
- **THEN** the toast copy focuses on executive compensation, equity, and total package negotiation.

#### Scenario: Unknown verdict Salary Negotiator toast copy

- **WHEN** Salary Negotiator is shown to a user whose verdict is unknown (`verdict === 'unknown'`)
- **THEN** the toast copy focuses on discovering market worth and salary negotiation strategies.

#### Scenario: Fair salary PurpleCV toast copy

- **WHEN** PurpleCV is shown to a fairly paid UK user (`verdict === 'fair'`)
- **THEN** the toast copy focuses on professional CV review and interview readiness.

#### Scenario: Overpaid salary PurpleCV toast copy

- **WHEN** PurpleCV is shown to an overpaid UK user (`verdict === 'overpaid'`)
- **THEN** the toast copy focuses on executive positioning, leadership storytelling, and next-level career progression.

### Requirement: Recruiter Coverage Suppression

The system SHALL suppress the affiliate offer toast entirely whenever an active recruiter coverage exists for the searched role and location.

#### Scenario: Recruiter matches user search

- **WHEN** the search results return one or more recruiter cards (`hasRecruiters === true`)
- **THEN** the affiliate offer toast is completely suppressed.

### Requirement: Session Frequency Capping on Display

The system SHALL cap affiliate offer toast frequency to at most once per browser session. The suppression flag SHALL be recorded immediately upon the toast being displayed. In environments where storage is blocked, suppression SHALL persist for the lifetime of the session.

#### Scenario: Toast shown suppresses subsequent searches

- **WHEN** the affiliate offer toast is displayed to the user
- **THEN** the system immediately marks the toast as suppressed for the session, preventing it from showing on any subsequent search even if the user ignores it without clicking close or CTA.

#### Scenario: User dismisses affiliate toast

- **WHEN** the user clicks the close (X) button on the affiliate toast
- **THEN** the toast closes immediately, an `affiliate_dismiss` event is tracked, and the toast remains suppressed for the session.

#### Scenario: User clicks affiliate toast CTA

- **WHEN** the user clicks the action link on the affiliate toast
- **THEN** the partner link opens in a new tab with `rel="sponsored"`, an `affiliate_click` event is tracked, and the toast remains suppressed for the session.

#### Scenario: Storage-blocked fallback session persistence

- **WHEN** `sessionStorage` throws an exception (e.g. strict private browsing)
- **THEN** the system maintains suppression state in a session-lived reactive store so the toast does not re-display during that session.

#### Scenario: Lead card already viewed in grid

- **WHEN** the user scrolls down and views the lead partner card in the negotiation grid before the toast delay finishes
- **THEN** the toast is suppressed to avoid redundant prompting.

### Requirement: Page Scope Restriction

The affiliate offer toast SHALL appear strictly on salary results pages (`/salary/...`) and SHALL NOT be rendered on benchmark results pages (`/benchmark/...`).

#### Scenario: User visits benchmark page

- **WHEN** a user visits `/benchmark/[title]/[country]/[[location]]`
- **THEN** no affiliate offer toast is scheduled or rendered.

### Requirement: Negotiation Email Script Verdict Alignment

The custom negotiation email script SHALL determine template copy using the single-source verdict helper (`verdict === 'underpaid'`).

#### Scenario: Email script inside the parity band

- **WHEN** a user earns within the ±2.5% market parity band (`verdict === 'fair'`)
- **THEN** the email script generates the incentive review template rather than the underpaid review template.

### Requirement: Standardized Comparison Cards Verdict Helper Migration

The government and live market benchmark comparison cards SHALL derive their comparison state from the single-source `getSalaryVerdict` helper.

#### Scenario: Government comparison verdict evaluation

- **WHEN** the government comparison card evaluates salary variance against benchmark
- **THEN** it derives comparison indicator state using `getSalaryVerdict(diffPercent)`.

#### Scenario: Live market comparison verdict evaluation

- **WHEN** the Adzuna live market comparison card evaluates salary variance
- **THEN** it derives comparison indicator state using `getSalaryVerdict(diffPercent)`.
