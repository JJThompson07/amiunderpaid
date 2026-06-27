## Why

To restrict recruiter registration on the platform. The current self-service signup process is being replaced with an invite-only model where recruiters request access, which admins can then accept or reject. Additionally, accepted recruiters require a secure method to update their initial one-time temporary password from their profile page.

## What Changes

- **Disable Public Recruiter Signup**: Disable the sign-up tab on the recruiter login page.
- **Request Access Flow**: Add a "Request Access" button and a modal form on the recruiter login page that collects name and email, creating a pending recruiter application in Firestore.
- **Admin Review Dashboard**: Update the admin recruiter management page to fetch and display pending access requests alongside active recruiters.
- **Approval Backend**: Add backend endpoints to accept (generate temporary password, create Firebase Auth user, and trigger confirmation email) and reject access requests.
- **Forced Password Update**: Require recruiters logged in with a temporary password to update their credentials on their profile page.
- **Profile Password Change Form**: Add a "Change Password" section in the recruiter profile page using secure re-authentication.
- **Recruiter Logout in Navigation**: Add a "Log Out" link to the recruiter navigation menu, appearing as the last item on mobile.

## Capabilities

### New Capabilities

- `recruiter-access-request`: Handles the public submission form, admin dashboard review/accept/reject workflow, and the acceptance email dispatch with a temporary password.
- `recruiter-profile-password-change`: Handles the secure client-side password modification form on the recruiter profile page.

### Modified Capabilities

None

## Impact

- **Database**: Adds a new state or role verification status (`status: 'requested'`) on the `users` Firestore collection.
- **Authentication**: Disables the default registration flow in the client-side app, moving user account creation to the Firebase Admin API in a secure backend route.
- **Emails**: Queues new template emails in the Firestore `mail` collection to invite newly accepted recruiters.
