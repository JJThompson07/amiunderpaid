## ADDED Requirements

### Requirement: UK economics block at the role's typical pay

For UK requests with a resolved location, the engine SHALL return an `economics` block containing CPIH, area rent, area house price, the role's year-on-year median pay change, and take-home pay, rent share of take-home and house-price-to-earnings computed at the role's median pay for the area (regional figure where available, otherwise national). The block MUST depend only on the role, location and data, never on the requesting user's salary.

#### Scenario: Same path, different salaries

- **WHEN** the engine is called twice for the same role and location with different `salary` values
- **THEN** the `economics` blocks are identical
