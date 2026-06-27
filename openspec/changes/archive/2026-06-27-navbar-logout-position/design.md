## Context

Currently, the recruiter navigation menu renders the logout item inline as a plain button alongside other links (e.g., dashboard, profile). We want to relocate this logout button to the far right-hand side of the desktop navigation bar and style it using the custom `<AmIButton>` component to match the platform's recruiter dashboard design standards.

## Goals / Non-Goals

**Goals:**

- Move the recruiter logout button to the far right on desktop screens.
- Replace the raw `<button>` element with `<AmIButton>` utilizing specific background and animation styling props.
- Standardize the button label to use `common.logout` translation key.

**Non-Goals:**

- Customizing logout styles for non-recruiter pages (this design is specific to recruiter navigation).

## Decisions

### Decision 1: Flexbox Layout Alignment

- **Choice:** Use Tailwind's `md:ml-auto` class on the logout button wrapper/element inside `app/components/AmI/NavBar.vue`.
- **Rationale:** The navigation container uses `flex items-center`. Applying a left margin auto (`ml-auto` or `md:ml-auto` for desktop only) pushes that element to the far right edge of the available space, which is clean and doesn't require splitting the main `activeLinks` list loop.
- **Alternative considered:** Wrapping the links in two separate flex groups. Rejected because it introduces unnecessary nested markup complexity and breaks mobile layout consistency.

### Decision 2: Button Component Implementation

- **Choice:** Replace the raw HTML button with `<AmIButton>` utilizing properties:
  - `:bg-colour="'bg-slate-500'"`
  - `:animation-colour="'bg-slate-400'"`
- **Rationale:** This directly reuses the application's design system tokens, maintaining visual consistency and supporting default button states (hover, active, disabled) automatically.

### Decision 3: Translation Key

- **Choice:** Use `$t('common.logout')` for the button text.
- **Rationale:** Standardizes visual text and aligns with i18n best practices instead of hardcoded strings.
