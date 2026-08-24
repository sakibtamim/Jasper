## Jasper & Hosted Jasper Architecture Context

When generating specs for Jasper features or `HJ-OSS-*` issues:

1. **Hosted Jasper Definition Pack**:
    - Always verify and align with the canonical specification in `docs/hosted-jasper/` (`mvp-scope.md`, `mvp-issue-plan.md`, `architecture.md`).
    - Preserve the strict public/private boundary between the public engine (`sakibtamim/Jasper`) and private hosted control plane (`purrfectsoft/jasper-hosted`).

2. **Development Standards & Seams**:
    - Align with `.agent/rules/development.md`: Strict TypeScript (no `any`), ESM with explicit `.js` imports, functional React UI components, and Fastify type parameters.
    - For database operations, isolate domain queries behind adapter interfaces (`apps/bot/src/core/db/`) supporting both SQLite and PostgreSQL parity.

3. **Issue Creation Compliance**:
    - Structure final output to match `.agent/rules/workflow.md`: Preamble/Objective, Acceptance Criteria (checkbox list), Implementation Brief, and QA Checklist.
