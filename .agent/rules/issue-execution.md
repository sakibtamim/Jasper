---
trigger: always_on
---

# 🎯 Issue Execution Protocol

When assigned to work on a GitHub Issue, you MUST follow this strict protocol.

## 1. Discovery Phase

**Immediately** fetch the full issue context and history:

```bash
gh issue view <ISSUE_ID> --comments
```

- **Critical**: If the issue cannot be found or accessed, STOP and report to the Operator.

## 2. Type-Specific Analysis

Once fetched, determine the strategy based on the `type:*` label:

### 🌱 Stub (`type: stub`)

- **Goal**: Graduate to a full Issue (Feature/Epic).
- **Actions**:
    - Verify if the "Context" is still current with the codebase.
    - Draft a plan to fill the missing "Acceptance Criteria" and "Tech Brief".
    - DO NOT implement code until the metadata is graduated.

### 🚀 Feature / Enhancement / Bug

- **Goal**: Implementation & PR.
- **Actions**:
    - Verify all "Acceptance Criteria" are clear.
    - Focus strictly on the defined scope.
    - Create a focused PR with granular, traceable commits.

### 👑 Epic (`type: epic`)

- **Goal**: Management & Coordination.
- **Actions**:
    - Check child issue status and ordering.
    - Identify risks, blockers, or divergence from the plan.
    - Update the "Execution Status" table.

## 3. Engagement Rules

- **Feedback Loops**: IF context is missing, ambiguous, or risky, initiate a feedback loop (notify user) **IMMEDIATELY**. Do not make wild assumptions.
- **Blockers**: IF a dependency is missing or an architectural decision is needed, report it with clear **Next Steps**.
- **Output**: The ideal outcome is a **Pull Request** or a **Status Update**—never a silent failure.
