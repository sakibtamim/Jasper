## Jasper Issue Standards Alignment

When converting specifications into GitHub issues:

1. **Issue Title Format**:
    - Use human-readable descriptions (e.g., "Implement Dynamic API Port Allocation").
    - **Do NOT** prefix issue titles with conventional commit tags (e.g., no `feat:`, `fix:`).

2. **Required Issue Structure** (per `.agent/rules/workflow.md`):
    - **Objective / Preamble**: High-level problem and motivation.
    - **Acceptance Criteria**: Checkbox list (`- [ ] ...`) of concrete requirements.
    - **Implementation Brief**: Technical architecture and affected packages/modules.
    - **QA Checklist**: Step-by-step verification commands or test cases.

3. **Labels**:
    - Apply exactly one `type:*` label (`type: feature`, `type: enhancement`, `type: bug`, `type: infra`, `type: docs`).
    - Add a `priority:*` label (`priority: P0`, `priority: P1`, `priority: P2`, `priority: P3`).
