---
trigger: always_on
---

# Security Standards & Dependency Management

## Dependency Upgrades
- **MUST** check for known vulnerabilities before adding or upgrading dependencies.
- **MUST** ensure vulnerability scans (e.g., `pnpm audit`) report no new vulnerabilities when modifying dependencies.
- **MUST NOT** introduce dependencies with critical or high severity vulnerabilities.
- **MUST** prioritize patching security vulnerabilities over feature work when alerted.

## CVE Response
- If a vulnerability is detected in a core framework (e.g., Next.js, React), upgrade immediately to the patched version.
