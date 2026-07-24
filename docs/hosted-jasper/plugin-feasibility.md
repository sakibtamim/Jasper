# Hosted Jasper private-plugin feasibility and boundary

Decision status: **Proposed / review required**
Decision: **Use a plugin-led distribution; reject a plugin-only SaaS
architecture**
Proposed private repository: `purrfectsoft/jasper-hosted`
Repository creation status: **Intentionally not created before definition
approval**

## Decision in one sentence

The proprietary Hosted Jasper product should live in one private, out-of-tree
repository whose data-plane adapter is a trusted Jasper plugin, while its
marketing, portal, control plane, staff console, workers, migrations, and
operations are independent deployables in that same repository.

This takes full advantage of the workflow in [PLUGINS.md](../../PLUGINS.md) and
[PLUGINS_DEV.md](../../PLUGINS_DEV.md) without pretending that a plugin loaded
after bot startup can acquire a customer, provision its own runtime, isolate a
public control plane, or safely own fleet lifecycle.

## Why the plugin path is valuable

Jasper already supports:

- private source as a Git submodule during integrated development;
- recursive GitHub App checkout in the deployment workflow;
- manifest compatibility data;
- backend, command, scheduled-task, hook, HTTP-route, and dashboard extension
  points;
- plugin-scoped logger, key/value data, and files;
- a public compiled-artifact release pattern demonstrated by Garage Band; and
- enable/disable and install/remove lifecycle tracking.

A hosted runtime adapter needs exactly the in-process observations and policy
calls that these contracts can evolve to expose. Keeping that adapter out of
tree prevents provider account logic from infecting core and lets another
operator implement the same public provider contract.

## Why the entire service cannot be one plugin

1. A plugin exists only after a Jasper runtime has already been built and
   started; acquisition and pre-provisioning happen earlier.
2. Marketing and portal availability should not depend on Discord gateway,
   yt-dlp, audio, or one bot process.
3. Current plugins are trusted arbitrary Node code, not isolation boundaries.
4. Current plugin HTTP routes share one Fastify process and lack tenant-aware
   default authorization.
5. Runtime restarts and drains should not log customers out or interrupt staff
   incident control.
6. Control-plane storage, migrations, staff identity, audit, and future billing
   have different security and release cadences from playback.
7. Browser bundles are delivered to users and cannot contain secret or
   authoritative enforcement logic.
8. A plugin cannot safely orchestrate the fleet process that owns it.

## Feasibility scorecard

Scores describe the current implementation before the proposed bounded,
provider-neutral core foundation.

| Capability                 | Current fit          | Finding                                                                                       | Required action                                                 |
| -------------------------- | -------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Out-of-tree private source | Strong               | Garage Band submodule proves daily development and host integration                           | Reuse with exact commit pinning                                 |
| Runtime observations/hooks | Partial              | Hooks and tasks exist, but guild lifecycle, health, drain, and unsubscribe are missing        | Add typed lifecycle and health contracts                        |
| Runtime policy             | Weak                 | Plugin can reach internals but has no stable installation/access-policy interface             | Add provider-neutral guild policy port                          |
| HTTP integration           | Weak                 | Custom route matcher has no schema, principal, tenant context, or normal Fastify policy chain | Add typed default-deny route contract                           |
| Data scope                 | Unsafe               | Plugin KV is `(plugin,key)` and filesystem is `pluginId` only                                 | Require immutable installation namespace and migration path     |
| Secret safety              | Unsafe               | Plugin context exposes raw worker state/tokens; plugins can read process env                  | Remove tokens from contracts; allow only trusted hosted plugins |
| Code isolation             | Not provided         | Node plugin code has process/filesystem/network authority                                     | Document trusted-code boundary; defer sandbox                   |
| Compatibility enforcement  | Weak                 | Version mismatch warns and continues                                                          | Fail closed for hosted-required plugins                         |
| Unload correctness         | Weak                 | Hooks are not removed; command collisions can overwrite/delete core commands                  | Add ownership tokens and collision failure                      |
| Backend packaging          | Weak                 | Export copies selected files rather than a complete backend bundle/tree                       | Deterministic recursive bundle and boot smoke test              |
| Frontend packaging         | Good with limits     | IIFE extension loading works; client code is observable                                       | Use only for presentation, never secrets/enforcement            |
| Release provenance         | Currently unhealthy  | Garage Band v1.0.5/v1.0.6 automation failed `Bad credentials`; public artifact lags source    | Repair short-lived auth, versioning, SBOM/signing and parity    |
| Startup reconciliation     | Risky                | Filesystem absence can delete database plugin metadata                                        | Make desired state explicit in hosted profile                   |
| Multi-tenant runtime       | Not provided         | Context, storage, routes, stats, and destructive operations are global                        | Lean core guild/installation foundation                         |
| Independent deployables    | Outside plugin model | Required for web/control plane/staff/ops                                                      | House in same private repo, deploy separately                   |

### Overall assessment

- **Feasible now for a proof-of-concept heartbeat adapter:** yes.
- **Feasible for a real-guild preview without core work:** no.
- **Feasible after the proposed OSS seams:** yes.
- **Feasible as a single plugin ZIP containing the SaaS:** no and undesirable.

## Alternatives evaluated

### A. Private fork of Jasper

Rejected. It makes multi-tenant fixes, AFR corrections, health, packaging, and
orchestration unavailable to self-hosters; invites drift; and duplicates the
plugin workflow already built for this purpose.

### B. No plugin; proprietary patches or direct internal imports

Rejected. It creates an undocumented ABI, as Garage Band’s current direct
music-player import already demonstrates. Core refactors would silently break
the distribution.

### C. Put the complete control plane inside the bot’s Fastify server

Rejected. It couples authentication, onboarding, staff operations, and future
commerce to gateway/audio process health, keeps a large public attack surface in
the data plane, and prevents independent scaling and safe drains.

### D. One bot process per customer using the same provider tokens

Rejected. Discord gateway ownership is by application shard, not arbitrary
guild process. Discord can permit overlapping sessions, but uncoordinated
processes duplicate events and side effects, consume identify/session budget,
and have no Jasper lease or placement model.

### E. Private control plane plus private runtime plugin

Accepted. It minimizes the proprietary touchpoint, preserves one open runtime,
supports an independently available portal/control plane, and gives other hosts
the same public adapter contract.

## Public/private decision table

The test is: “Would any competent operator need this to run Jasper safely and
correctly?” If yes, it belongs in open Jasper.

| Capability                        | Public OSS                                     | Private distribution                                 |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Installation/guild context type   | Contract and local resolver                    | Hosted tenant/access resolver                        |
| Worker application catalog        | Types, validation, env/file provider           | Orchestrator materialization and owned app inventory |
| Per-guild leases and AFR          | Complete implementation                        | Tenant-selected enabled-cat policy                   |
| Command publication               | Global/guild release tool                      | Environment release invocation and app credentials   |
| Route authorization               | Principal/policy/schema framework              | Hosted workload and customer policy adapters         |
| Plugin data/storage scope         | Guild-aware interfaces/local filesystem        | Object-store implementation and hosted retention     |
| Database migrations               | Runner, schema history, shared core migrations | Control-plane schema and provider execution          |
| Health/readiness/drain            | Runtime contract and endpoints                 | Fleet aggregation, alerting, deployment control      |
| Runtime identity and observations | Provider-neutral events/port                   | Authenticated control-plane client plugin            |
| Packaging and compatibility       | Bundle, hashes, verification, SDK range        | Private image assembly and allowlist                 |
| Single-instance operation         | Image, Compose, backup/restore, docs           | Managed service deployment                           |
| Acquisition/auth/members          | No                                             | Yes                                                  |
| Guided cat installer              | Install contract/docs only                     | Yes                                                  |
| Customer/staff dashboards         | Generic self-host UI can remain open           | Hosted account and fleet surfaces                    |
| Cohorts, plans, billing           | Entitlement interface only                     | Yes, with no billing in MVP                          |
| Provider analytics/support        | Open event vocabulary where useful             | Yes                                                  |

## Bounded provider-neutral core change budget

This is a substantial foundation across identity/bootstrap, AFR, commands,
persistence, storage/media, authorization, plugin lifecycle, health, packaging,
and deployment—not a small plugin add-on. It remains bounded by cohesive
provider-neutral seams, local implementations, and a prohibition on private
core patches:

1. `RuntimeProfile` and explicit `WorkerIdentityCatalog`; deprecate wildcard
   `_TOKEN` discovery without breaking a documented legacy migration.
2. `GuildInstallationContext` and `GuildAccessPolicy` resolved at every Discord
   and HTTP entry point.
3. Per-guild `WorkerLease` state with atomic in-process allocation, eligibility
   checks, retry, and correctly keyed release.
4. A command publisher with `guild` and `global` strategies, invoked as a
   release job.
5. Installation-scoped database queries, plugin store, filesystem/object
   storage, and built-in plugin records.
6. Ordered database migrations and PostgreSQL/SQLite shared-behavior tests.
7. Typed plugin routes with explicit policy, schemas, context, and lifecycle
   ownership.
8. Guild join/remove/config hooks; health contributors; runtime identity;
   readiness, degraded, drain, and shard metadata.
9. Safe media retrieval and upload policy shared by core and plugins.
10. A complete plugin backend bundle, strict compatibility, integrity and
    provenance metadata, and install/boot verification.
11. A stable audio enqueue service for plugins so Garage Band does not import
    core internals.
12. Hosted-profile closure of legacy dashboard, DevTools, plugin upload, and
    public operational endpoints.

These changes improve ordinary multi-guild self-hosting and plugin quality even
if the proprietary product never launches.

## Proposed private repository

```text
purrfectsoft/jasper-hosted/
├── jasper-plugin.json
├── index.ts                         # narrow Jasper plugin entry
├── runtime/
│   ├── control-plane-client/
│   ├── access-policy/
│   ├── desired-state/
│   ├── observations/
│   └── health/
├── apps/
│   ├── control-plane-api/
│   ├── control-plane-worker/
│   ├── customer-portal/
│   ├── staff-console/
│   └── marketing/
├── packages/
│   ├── contracts/
│   ├── auth/
│   ├── database/
│   ├── entitlement/
│   ├── observability/
│   └── ui/
├── migrations/
├── ops/
│   ├── image/
│   ├── environments/
│   ├── runbooks/
│   └── load/
└── docs/
```

The root manifest and entry make the repository usable through Jasper’s
out-of-tree plugin development flow. The `apps` are not served through the
plugin and are built/deployed independently. Shared private contracts are
versioned packages within the private workspace.

## Runtime plugin responsibilities

The hosted plugin is intentionally narrow:

- identify the runtime release, cell, shard, controller, and worker
  applications;
- authenticate to the control plane with workload identity;
- publish guild join/remove, app membership, permission, readiness, capacity,
  health, config-applied, usage, and drain observations;
- long-poll or fetch desired configuration and idempotent operational tasks;
- cache last-known-good installation policy for bounded control-plane outages;
- implement the hosted `GuildAccessPolicy` and explicit enabled-worker policy;
- contribute readiness/degraded state without owning the HTTP server;
- reject stale/fenced commands and revisions; and
- redact and batch telemetry.

It does not:

- store customer passwords or own browser sessions;
- render the public marketing site;
- expose a public admin API from the bot process;
- provision the process/container that owns it;
- contain bot tokens;
- perform payment decisions;
- become a generic arbitrary-code marketplace; or
- bypass the public plugin API with relative core imports.

## Control-plane interaction contract

For the MVP, runtime traffic is outbound over TLS:

```text
runtime plugin
  POST observations (idempotent batches)
  POST heartbeat / config acknowledgement
  GET  desired state and safe task lease (long poll or bounded poll)
        │
        ▼
private control-plane API
```

Workload identity is cell-specific and rotatable. Requests carry release, cell,
shard, monotonic sequence/idempotency key, timestamp, and trace ID. Desired
state is immutable by revision and signed or authenticated in transit. Tasks
are leased and fenced so a replaced cell cannot execute stale work.

This avoids a public data-plane management listener and prevents direct
control-plane-database coupling. PostgreSQL outbox/inbox tables provide durable
delivery for the preview; a separate broker is added only when measured load or
fan-out requires it.

## Plugin trust and enforcement

Fastify encapsulation and a scoped `PluginContext` are developer ergonomics, not
security containment. A trusted Node plugin can still access `process.env`,
network, and filesystem unless it runs in a separate sandbox.

Hosted policy therefore is:

- only operator-reviewed plugin IDs and exact digests are present in the image;
- compatibility and integrity mismatch fail readiness;
- runtime plugin installation endpoints are disabled;
- raw bot tokens are removed from the public plugin context and facades, while
  acknowledging that every allowlisted in-process plugin shares the runtime
  process/file secret boundary and could deliberately bypass that API;
- customer-visible browser bundles contain no secret or authoritative
  entitlement logic; and
- an untrusted marketplace is deferred until process/container/WASM isolation,
  capability grants, resource limits, egress, signing, and revocation are
  designed.

## Development and release workflow

### Integrated development

1. Work in the private repository and test its plugin entry against the declared
   Jasper SDK range.
2. In a local/private integration workspace, link it to an exact public Jasper
   checkout using the documented out-of-tree workflow. Do not commit a private
   hosted-plugin pointer or submodule to public Jasper.
3. Run core, plugin, contract, isolation, packaging, and full Compose tests.
4. Merge reusable public contracts first with compatibility fixtures and no
   private dependency.
5. Let private CI pin the accepted public commit, build the private artifact,
   and assemble the overlay image only when compatibility is green.

The existing Garage Band private-source/public-artifact pointer workflow is a
separate legacy/premium-plugin release pattern; it is not used to make the
public Jasper build depend on Hosted Jasper source.

### Build and promotion

1. Build the public Jasper base image from an exact public commit.
2. Produce a deterministic private plugin artifact from an exact private commit.
3. Verify manifest ID/version/SDK, recursive backend bundle, frontend, assets,
   hashes, lockfile, license inventory, SBOM, provenance, and signature.
4. Boot the plugin in the public base image and run a sandbox isolation/onboarding
   smoke test.
5. Assemble a private hosted image referencing both exact digests.
6. Bind environment-independent images, plugins, schema compatibility, command
   manifest and infrastructure contract into one signed release manifest.
   Promote that identical manifest from sandbox to staging to preview, while a
   signed per-environment deployment envelope records exact config/catalog/
   infrastructure revisions, migration results, command target, approvals and
   canary evidence; do not rebuild artifacts per environment.
7. Publish release metadata that identifies the public commit and private
   distribution version without exposing private source.

### Public plugin artifacts

The Hosted Jasper plugin itself need not be distributed publicly. Generic core
capabilities and the independent-host contract are public. Where a private
plugin such as Garage Band has a public compiled release, its short-lived
GitHub App release path, version bump, provenance, install smoke, and source /
artifact / host-pointer parity must be repaired before it is a release
dependency.

## Governance and repository constraints

Live GitHub verification found:

- `purrfectsoft` membership can create a private repository and no existing
  hosted-Jasper repository collides with the proposed name;
- the organization is currently on GitHub Free, where branch
  protection/rulesets are unavailable for a private repository;
- the current contributor has admin on the Garage Band repositories but only
  write access to `sakibtamim/Jasper`; and
- cross-repository GitHub App, environment, secret, or rules changes may require
  Jasper owner/admin help.

Before private-repository implementation, choose one governance mitigation:
upgrade the organization plan, enforce review/status/promotion through an
external merge policy and restricted maintainers, or accept and document the
temporary preview risk. The MVP must not silently claim protected branches when
GitHub cannot enforce them.

## Proof-of-concept exit criteria

The plugin strategy is validated when a private adapter, using no internal core
imports:

1. boots against the public base and fails closed on incompatible SDK;
2. authenticates as one runtime cell;
3. reports aligned controller/worker/guild readiness;
4. receives a revisioned guild policy and acknowledges application;
5. blocks an unregistered guild and permits a registered sandbox guild;
6. survives control-plane unavailability using bounded last-known-good policy;
7. disposes every owned hook/task and deactivates every route so no stale
   handler executes in test;
8. packages and boots from the exact artifact used in image assembly; and
9. leaks no worker token or cross-guild state through its public context or
   routes.

Criterion 9 tests the vNext contract/facades, not process isolation. The adapter
remains reviewed, trusted Node code with effective access to process secrets and
global runtime state if it deliberately bypasses those contracts.

If this spike exposes a missing generic capability, add the smallest public
contract. If it requires private core patches, revisit the design before
building the portal.

## Consequences

### Benefits

- The distinctive runtime remains one open product.
- Hosted business logic is coherently private without a fork.
- Independent hosts receive real operational improvements and documentation.
- Control-plane availability and releases are decoupled from audio processes.
- Future billing can evolve privately behind a stable entitlement port.

### Costs

- The private repository is a monorepo/distribution, not a simple plugin ZIP.
- Core needs foundational installation/guild isolation before UI work can reach
  real users.
- Cross-repository contract tests and release coordination become mandatory.
- Current plugins need migration and compatibility behavior.
- Strong private-repository governance may have a direct GitHub plan cost.

Those costs are substantially lower than a private fork or a bot-process
monolith and are aligned with work Jasper needs for safe multi-guild operation
regardless.
