## Document Grounding Protocol (Jasper & Hosted Jasper)

Before forming the design decision tree and computing the first frontier:

1. **Scan Target Specifications**:
    - Locate and ingest relevant definitions in `docs/hosted-jasper/` (`mvp-scope.md`, `mvp-issue-plan.md`, `architecture.md`) or any user-provided path.
    - Ground against the active rules in `.agent/rules/` (`development.md`, `plugins.md`, `code-review.md`, `workflow.md`).

2. **Constraint Verification**:
    - Explicitly verify whether the proposed design crosses the public engine (`sakibtamim/Jasper`) / private control plane (`purrfectsoft/jasper-hosted`) boundary.
    - Probe for multi-tenant safety (`TenantId` isolation), database dialect parity (SQLite + PostgreSQL), and idempotency constraints.

3. **Frontier Formulation**:
    - Frame frontier questions with explicit citations to the grounded documents.
