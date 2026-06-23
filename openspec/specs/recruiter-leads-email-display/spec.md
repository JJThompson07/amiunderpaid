# recruiter-leads-email-display Specification

## Purpose
TBD - created by archiving change add-lead-email-copy. Update Purpose after archive.
## Requirements
### Requirement: Recruiter leads table email column
The leads table on the recruiter dashboard SHALL include a column for candidate email addresses.

#### Scenario: Rendering the email column in the leads table
- **WHEN** the recruiter dashboard leads table is rendered
- **THEN** it SHALL display the "Email Address" header column.

### Requirement: Lead email copy to clipboard
The recruiter dashboard leads table SHALL provide an interactive copy button next to the email address that copies the candidate's email address to the clipboard.

#### Scenario: Copying email successfully
- **WHEN** the recruiter clicks the copy button next to the candidate's email address
- **THEN** the system SHALL write the email string to the clipboard using `navigator.clipboard.writeText` and trigger a success toast feedback notification.

