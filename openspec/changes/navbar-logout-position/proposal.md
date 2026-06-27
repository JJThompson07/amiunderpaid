## Why

Currently, the recruiter logout button in the navigation bar is styled as a plain button mixed in with other navigation links. We want to align its visual design with the rest of the application by styling it as a standard platform button on the far right of the navigation menu on desktop screens.

## What Changes

- **Logout Button Position**: Relocate the recruiter logout button to the far right-hand side of the navigation bar on desktop screens.
- **Visual Styling with AmIButton**: Replace the raw HTML button with the custom `<AmIButton>` component, passing specific background and animation colors.
- **Translation Updates**: Update the text rendering to utilize the `common.logout` translation key.
- **Click Handler and Routing**: Verify the click handler correctly calls the logout composable and redirects the user back to the login screen.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `recruiter-profile-password-change`: Modifies the styling, positioning, and component architecture requirements of the navigation bar logout button.

## Impact

- **Components**: Modifies `app/components/AmI/NavBar.vue` to adjust layout structure, apply flexbox formatting, and implement `<AmIButton>` for the logout button.
- **Internationalization**: Standardizes logout text to use `common.logout` across the navigation bar.
