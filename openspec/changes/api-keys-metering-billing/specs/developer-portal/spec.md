## ADDED Requirements

### Requirement: Portal pages on the developer host

`www.benchmarkmyrole.com` SHALL serve the developer portal at clean paths: `/` (landing), `/pricing`, `/docs`, `/playground`, `/dashboard`, `/login` and `/signup`. All visible text MUST come from i18n files.

#### Scenario: Old internal path

- **WHEN** a client requests `https://www.benchmarkmyrole.com/developers/docs`
- **THEN** the response is a 301 to `https://www.benchmarkmyrole.com/docs`

### Requirement: Self-serve sign-up and dashboard

A visitor SHALL be able to create an account with email and password, verify their email, and from the dashboard create, name and revoke keys, view current-month usage against their plan, upgrade through Stripe Checkout and manage billing through the Stripe Billing Portal.

#### Scenario: New account

- **WHEN** a visitor signs up and verifies their email
- **THEN** they are on the free plan and can create their first key

#### Scenario: Signed-out dashboard visit

- **WHEN** a signed-out visitor opens `/dashboard`
- **THEN** they are sent to `/login` with a redirect back to `/dashboard`, without the dashboard rendering first

### Requirement: Playground without keys in the browser

The playground SHALL let a signed-in, verified user run v1 requests from a form, executed server-side on their account, and MUST NOT require or expose an API key in the browser. Playground requests SHALL be counted like any other request.

#### Scenario: Playground request

- **WHEN** a verified user runs a benchmark from the playground
- **THEN** the JSON response is displayed, their usage increases by one, and no API key is sent from the browser
