@AGENTS.md
@CODE_STANDARDS.md

## Claude Code: Implementation, Validation & Archival

Your primary lane in this repo's two-agent workflow (AGENTS.md §1) is Phases 2–4 of the OpenSpec workflow (AGENTS.md §3): **Implement**, **Validate**, **Archive**. Antigravity's primary lane is Phase 1 (Plan) — by the time a change reaches you, `openspec/changes/<name>/` should already hold a considered `proposal.md`, `specs/**/spec.md`, `design.md`, and `tasks.md`. Read them fully before touching code, then execute `tasks.md` sequentially using the `openspec-apply-change` skill, checking off each task only after its local verification passes.

You can cross into Phase 1 and scaffold a proposal yourself when explicitly asked (`openspec-propose` skill) — it's not off-limits, just not your default. The reverse also holds: if Antigravity has implemented something, you can still be asked to validate or archive it.

### Keep CODE_STANDARDS.md honest

CODE_STANDARDS.md (imported above) is the bar every line of code you write is held to — read it before writing code, not after. It is not assumed complete. When implementation work surfaces a real convention CODE_STANDARDS.md doesn't cover — a security rule, a testing pattern, an architectural boundary you had to infer from context instead of finding written down — propose an addition to CODE_STANDARDS.md in the same change, and say so explicitly rather than silently expanding scope. Don't invent standards preemptively; propose additions only for gaps you actually hit while implementing.

`openspec/config.yaml` carries its own maintainer note requiring its `context:` block to mirror AGENTS.md and CODE_STANDARDS.md. If a standards addition changes a fact restated there, update `config.yaml` in the same change.

### Working conventions

- OpenSpec phase transitions: use the `openspec-apply-change`, `openspec-archive-change`, and `openspec-sync-specs` skills rather than hand-rolling file moves — they keep `tasks.md` checkboxes, spec syncing, and archive naming consistent.
- Commits: gitmoji-first (AGENTS.md §4), always a new commit, never `--amend`, unless explicitly asked otherwise.
- Verification before anything irreversible is not decorative (CODE_STANDARDS.md §10) — this repo has a concrete example of it working: the `fix-subscription-conflict-refund` pre-flight task found that the source proposal's Stripe API call (`invoice.payment_intent`) didn't exist on this account's pinned API version, before any refund code was written. A naive implementation would have shipped a "fix" that silently never refunded anyone.
