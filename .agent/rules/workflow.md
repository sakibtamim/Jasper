---
trigger: always_on
---

# 🎯 GitHub Issues & Workspace Workflow

## 🤖 1. Onboarding Protocol

Welcome! To start work in this workspace:

- Familiarize yourself with the project structure and tech stack in `overview.md`.
- Read and follow the branching, coding, and safety guidelines in `development.md`.
- Explicitly locate target files using directory search tools before editing.

---

## 🚀 2. Issue Execution Protocol

### A. Discovery Phase

Immediately fetch the full context and conversation history of your assigned issue:

```bash
gh issue view <ISSUE_ID> --comments
```

_Note: If the issue cannot be found, stop and notify the Operator._

### B. Execution Strategy by Type

- 🌱 **Stub (`type: stub`)**: Draft a plan to fill in the missing "Acceptance Criteria" and "Tech Brief". **DO NOT** write code until the stub is graduated to a feature/bug.
- 🚀 **Feature / Enhancement / Bug**: Focus strictly on the defined scope. Create a branch and a focused PR with atomic commits.
- 👑 **Epic (`type: epic`)**: Coordinates child issues. Track ordering, identify blockers, and keep the execution status table updated.

### C. Engagement Rules

- **Feedback Loops**: If context is missing, ambiguous, or contains high risk, notify the Operator immediately.
- **Blockers**: Report missing dependencies or architectural questions with proposed next steps.

---

## 📋 3. Issue Creation Standards

When creating new issues, use the following standards:

### A. Structured Format

Every work issue (Feature, Enhancement, Infra) must contain:

1. **Objective / Preamble**: High-level goal.
2. **Acceptance Criteria**: Checkbox list of requirements.
3. **Implementation Brief**: Technical design or proposed steps.
4. **QA Checklist**: Manual verification steps.

### B. Title & Labels

- **Titles**: Use human-readable descriptions. **Do NOT use conventional commit prefixes** (e.g., `feat:`, `fix:`) in issue titles. (e.g., Use "Implement User Login" instead of "feat: add login").
- **Labels**: Apply exactly one `type:*` label (`feature`, `enhancement`, `bug`, `infra`, `docs`, `epic`, `stub`). Adding a `priority:*` label (`P0` to `P3`) is recommended.

Use the GitHub CLI (`gh issue create`) for compliant creation.
