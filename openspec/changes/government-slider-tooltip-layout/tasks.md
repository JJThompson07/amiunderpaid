## 1. Visualizer Layout & Tooltip Implementation

- [ ] 1.1 In `app/components/Section/Government/SalaryVisualizer.vue`, reposition the user salary value badge to render above the range bar (`-top-6`) above the user marker dot, keeping the Low and High boundary labels below the track (`-bottom-6`).
- [ ] 1.2 In `app/components/Section/Government/SalaryVisualizer.vue`, update the Market Average marker to display its localized average salary label (`$t('sections.visualiser.average')`) inside an accessible on-demand tooltip triggered on hover, keyboard focus, and mobile tap / longpress. The trigger element gets `tabindex="0"`, `role="group"`, and an `aria-label`; the tooltip content element itself gets `role="tooltip"` (never both roles on the same, focusable trigger element — `role="tooltip"` is invalid ARIA on a focusable element).

## 2. Unit Testing & Verification

- [ ] 2.1 Update unit tests in `app/components/Section/Government/tests/SalaryVisualizer.spec.ts` to assert that Low and High labels render below the range bar (`-bottom-6`), User Salary label renders above the range bar (`-top-6`), and the Market Average label is contained within the tooltip structure with proper accessibility and visibility states.
- [ ] 2.2 Run full project verification suite `pnpm test:verify` (typecheck, lint, coverage, Playwright e2e, and security rules) and verify zero regressions.
