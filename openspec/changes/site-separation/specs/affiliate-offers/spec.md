## MODIFIED Requirements

### Requirement: Page Scope Restriction

The affiliate offer toast SHALL appear strictly on salary results pages (`/salary/...`) and SHALL NOT be rendered on any other page. The former `/benchmark/...` results pages no longer exist: those URLs 301 to `/salary/...`, where the toast follows its normal rules.

#### Scenario: User visits a non-salary page

- **WHEN** a user visits `/jobs/[title]/[country]/[[location]]` or any other page outside `/salary/...`
- **THEN** no affiliate offer toast is scheduled or rendered.

#### Scenario: User visits benchmark page

- **WHEN** a user requests `/benchmark/[title]/[country]/[[location]]`
- **THEN** they are 301-redirected to `/salary/[title]/[country]/[[location]]`, and the toast is scheduled only under the salary page's normal rules
