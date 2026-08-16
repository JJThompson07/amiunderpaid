## Context

The current README and documentation contain internal details that are unnecessary for a public-facing repository. The goal is to clean up these files so that they serve as a professional landing page for the project, focusing on value proposition, setup, and high-level architecture.

## Goals / Non-Goals

**Goals:**
- Present a professional public face for the project.
- Provide clear setup instructions.
- Hide sensitive security and internal orchestration logic from the main README.

**Non-Goals:**
- We are not deleting `AGENTS.md` or `COUNTRY_GUIDELINES.md`, only ensuring they are referenced appropriately or internal details are kept out of `README.md`.
- No code changes.

## Decisions

- **Structure of README**:
  1. Title and Badges
  2. Overview & Value Proposition
  3. Key Features
  4. Tech Stack
  5. Local Development Setup
  6. Testing

- **Information Hiding**:
  - We will remove explicit mentions of fallback provider orchestration (Jooble/Reed) or internal API rate-limit logic from the public README. That logic should stay in `COUNTRY_GUIDELINES.md` and `CODE_STANDARDS.md`.

## Risks / Trade-offs

- **Risk**: Removing too much information might make it harder for new developers to understand the project structure.
  - **Mitigation**: We will leave links in the "Architecture" section pointing to the dedicated `COUNTRY_GUIDELINES.md` and `CODE_STANDARDS.md` files for deeper technical context.
