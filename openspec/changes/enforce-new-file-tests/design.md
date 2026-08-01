## Context

See proposal.md for motivation. Our structure linter currently warns when tests are missing. We need to distinguish between legacy files and newly added files, executing a strict failure for new files.

## Goals / Non-Goals

**Goals:**
- Differentiate between pre-existing files and newly staged/added files.
- Fail the linter if a newly added file violates the test coverage rule.

**Non-Goals:**
- We are not failing on modified legacy files, only newly added files.

## Decisions

**Detecting New Files via Git**
- **Decision**: We will execute `git diff --name-only --diff-filter=A HEAD` and `git diff --name-only --diff-filter=A --cached` via Node's `child_process.execSync` to get the list of newly added files (both committed in the current branch diffing against main, or staged/unstaged).
- **Alternative**: We could maintain a hardcoded whitelist of legacy files, but that is difficult to maintain and clutters configuration.
- **Rationale**: `git diff` dynamically and accurately identifies new files without maintenance overhead.

## Risks / Trade-offs

- **Risk**: Depending on how CI checks out the repository (e.g., shallow clone), `git diff` against a base branch might fail.
- **Mitigation**: We will gracefully fallback to warning if the git command fails (e.g., if git is not available or it's a shallow clone without the necessary history).
