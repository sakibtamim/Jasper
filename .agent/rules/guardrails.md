---
trigger: always_on
---

# 🛡️ Guardrails & Footgun Prevention

**Warning**: Failure to follow these rules will result in rejected operations.

## 1. Branching Strategy (CRITICAL)

- **NEVER** commit directly to `main`.
- **ALWAYS** create a new branch for every task:
  - `feat/...` for features.
  - `fix/...` for bugs.
  - `chore/...` for maintenance.
- If you find yourself on `main`, STOP and `git checkout -b <new-branch>` immediately.

## 2. Environment Integrity

- **Clean Slate**: Before starting, ensure working tree is clean (`git status`).
- **Sync**: Ensure logic is based on latest `main`.
- **Bail Early**: If the environment is dirty or out of sync, stop and notify the Operator.

## 3. Error Handling (ZERO TOLERANCE)

- **Fail Early**: If a command fails (exit code != 0), **STOP IMMEDIATELY**.
- **Report**: Notify the Operator or file a bug. Do not proceed with "happy path" assumptions.
- **No Sweeping Under the Rug**:
  - **NEVER** ignore lint, build, or test failures to "just get it done".
  - **NEVER** suppress errors without explicit instruction.
  - **NEVER** proceed without addressing the root cause or reporting the issue.

## 4. Commit Hygiene

- **Focused Commits**: Prefer small, atomic commits over massive dumps.
- **Traceability**: Link commits to issues where possible.
- **Message**: Use Conventional Commits (e.g., `feat: add login`).

## 5. Monorepo Safety

- **Boundaries**: Respect `apps/` vs `packages/` separation.
- **Deps**: Do not edit `pnpm-lock.yaml` manually.

## 6. Output Safety

- **Self-Correction**: Check `git status` before verifying. If you see `dist/`, `.next/`, or `tmp/` files, DO NOT add them.
- **Ignorance**: If temporary files appear, propose adding them to `.gitignore`.
