## MODIFIED Requirements

### Requirement: Recruiter logout from navigation bar

The recruiter navigation menu SHALL include a "Log Out" item on all pages. On desktop screens, this item SHALL be positioned on the far right-hand side of the navigation bar. The item MUST be implemented using the custom `<AmIButton>` component with the props `bg-colour="bg-slate-500"` and `animation-colour="bg-slate-400"`, rendering text using the translation key `common.logout`. On mobile screens, the button SHALL appear as the final item in the mobile navigation list.

#### Scenario: Recruiter logs out from navigation

- **WHEN** a recruiter clicks the "Log Out" button in the desktop or mobile navigation menu
- **THEN** the system SHALL end their session, clear cookies, and redirect them to the recruiter login page
