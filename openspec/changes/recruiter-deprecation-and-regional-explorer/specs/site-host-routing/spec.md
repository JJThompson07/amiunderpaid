## ADDED Requirements

### Requirement: Retired recruiter URLs redirect

On every production host, `/recruiter/territories` and its sub-paths SHALL 301 to `https://www.amiunderpaid.co.uk/explorer`, and every other `/recruiter` path SHALL 301 to `https://www.benchmarkmyrole.com/dashboard`. These rules MUST take precedence over all other host rules.

#### Scenario: Old territories bookmark

- **WHEN** a client requests `https://www.benchmarkmyrole.com/recruiter/territories/edit`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/explorer`

#### Scenario: Old leads page

- **WHEN** a client requests `https://www.amiunderpaid.co.uk/recruiter/leads`
- **THEN** the response is a 301 to `https://www.benchmarkmyrole.com/dashboard`

### Requirement: Narrowed benchmarkmyrole allowlist

After the recruiter portal is removed, `www.benchmarkmyrole.com` MUST NOT serve `/recruiter/**` or consumer `/api/**` routes; of the API surface it SHALL serve only `/api/developer/**`, plus `/api/stripe/webhook` and `/auth/**` only where verified to be in use on that host.

#### Scenario: Consumer API on benchmarkmyrole

- **WHEN** a client requests `https://www.benchmarkmyrole.com/api/market-data/jobs?title=x`
- **THEN** the response is a redirect to amiunderpaid, not market data

### Requirement: Explorer is UK-only

`/explorer` SHALL be served on `www.amiunderpaid.co.uk`; on `www.amiunderpaid.com` it SHALL 301 to the `.co.uk` URL, preserving the query string.

#### Scenario: US host

- **WHEN** a client requests `https://www.amiunderpaid.com/explorer?soc=2134`
- **THEN** the response is a 301 to `https://www.amiunderpaid.co.uk/explorer?soc=2134`
