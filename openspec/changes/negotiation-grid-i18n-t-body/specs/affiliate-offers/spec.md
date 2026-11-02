## ADDED Requirements

### Requirement: Secure Template-Based Affiliate Card Body Rendering

The system SHALL render all negotiation grid card descriptions using Vue I18n template interpolation (`<i18n-t>`) and named slots, binding styled partner names into slots rather than injecting raw HTML via `v-html`. Locales or cards without a `{name}` interpolation token SHALL render without error or unintended DOM nodes.

#### Scenario: Affiliate card body with partner name interpolation

- **WHEN** a card definition contains a `{name}` interpolation token in its localization string
- **THEN** the system renders the translation string with the partner's name wrapped in a styled `<strong>` tag via the `#name` slot, without using `v-html`.

#### Scenario: Card body or locale variant without partner name placeholder

- **WHEN** a card definition (such as the custom negotiation email script card) or locale variant (such as en-US PurpleCV or CV-Library) does not contain a `{name}` placeholder
- **THEN** the system renders the plain translation string without error or extra markup, safely ignoring the unused slot.

#### Scenario: Application-wide absence of raw HTML card body bindings

- **WHEN** the negotiation section renders in any supported locale or country
- **THEN** zero `v-html` directives and zero raw HTML string concatenations are evaluated for card bodies.
