---
trigger: always_on
---

# 🤖 Agent Instructions & Workspace Entry

Welcome! This directory contains the consolidated workspace guidelines for Jasper. Review these instructions to align with project standards.

## 🧭 Navigation Index

- [Project Overview](file:///home/kuasha/Dev/Jasper/.agent/rules/overview.md) - Tech stack, codebase structure, architecture details, and project roadmap.
- [Development Standards](file:///home/kuasha/Dev/Jasper/.agent/rules/development.md) - Guardrails, TypeScript guidelines, code styles, and common workflows.
- [Code Review Guidelines](file:///home/kuasha/Dev/Jasper/.agent/rules/code-review.md) - PR delay rules, review fetching commands, and comment address guidelines.
- [Plugin Development](file:///home/kuasha/Dev/Jasper/.agent/rules/plugins.md) - Manifest format, sandbox boundaries, and security rules for plugin development.
- [Issue Workflow](file:///home/kuasha/Dev/Jasper/.agent/rules/workflow.md) - Onboarding rules, GitHub issue lifecycle, templates, and execution protocols.

## ⚡ Core Agent Directives

1. **Safety First**: Never commit directly to `main` or `master`. Execute `pnpm audit` before updates. Stop execution immediately on command errors.
2. **Context Integrity**: Keep all documentation, rules, and tests updated as code changes.
3. **No Placeholders**: Do not write stub/placeholder logic. Write complete, functional implementations.
