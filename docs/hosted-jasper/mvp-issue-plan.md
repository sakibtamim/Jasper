# Hosted Jasper MVP issue plan

Status: **Proposed source of truth; no issues filed**
Scope: OSS core, private distribution, Garage Band, operations, documentation,
and private-preview validation
Requirements: [PRD](prd.md)
Technical design: [MVP design](mvp-design.md)

## How to use this plan

Stable IDs survive issue moves and splits. After the definition PR is approved:

1. create one public Hosted Jasper epic in `sakibtamim/Jasper`;
2. create one linked private delivery epic in the approved
   `purrfectsoft/jasper-hosted` repository;
3. re-scope or close the existing issues in the final section;
4. file the work below in dependency order;
5. add every public issue URL beside its stable ID; keep private child URLs in
   the private epic while reporting their stable ID, status, and safe outcome
   publicly; and
6. update both epics and this plan when scope or sequence changes.

Until then, “proposed” is intentional—not a missing link.

Every filed issue should include:

- stable ID and requirement/design links;
- why the issue exists and which repository owns the result;
- explicit in-scope and out-of-scope behavior;
- testable acceptance outcomes below;
- dependencies and rollout/migration behavior;
- public/self-hosted compatibility impact; and
- security/privacy/observability notes where relevant.

## Repository and tracking model

| Repository                                                                                                              | Visibility           | Work                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `sakibtamim/Jasper`                                                                                                     | Public               | Public epic, core contracts and implementation, built-in plugins, public image, self-host/provider docs |
| `purrfectsoft/jasper-hosted`                                                                                            | Private, proposed    | Private epic, runtime adapter, control plane, web products, provider ops and preview                    |
| `purrfectsoft/jasper-plugin-garage-band`                                                                                | Private source       | Tenant-safe Garage Band implementation and release                                                      |
| [`purrfectsoft/jasper-plugin-garage-band-releases`](https://github.com/purrfectsoft/jasper-plugin-garage-band-releases) | Public artifact only | Immutable compiled releases; no implementation issue unless policy changes                              |

The public epic should disclose architectural outcomes, current phase, public
dependencies, preview evidence, and high-level status of proprietary work. It
must not copy secrets, exploit details under active remediation, customer data,
or private source. Private issue completion is reflected in the public epic by
stable ID and outcome.

None of the three repositories in the live issue/PR audit currently has a Hosted
Jasper milestone or hosted/tenant label. After approval, propose a
`Hosted Jasper MVP` milestone in Jasper, retain the existing `type: ...` and
`priority: P0–P3` taxonomy, and add one `area: hosted` label only if repository
ownership approves it. Create the missing mirrored labels in the private and
Garage Band repositories before filing there, even if private GitHub branch
rules cannot yet be enforced.

## Priority and sequencing

- **P0**: required before more than one guild shares a hosted process, before a
  real customer/staff identity is admitted, or as an immediate safety/release
  repair for a currently active path.
- **P1**: required before external private preview.
- **P2**: required to declare the MVP complete but can follow first controlled
  guilds.

```text
Wave 0 — decisions, inventory, CI, plugin contract spike
  ↓
Wave 1 — guild isolation, worker/AFR, persistence, plugin/runtime contracts
  ↓
Wave 2 — private control plane, identity, runtime adapter, artifacts
  ↓
Wave 3 — onboarding/portals, staging, operations, self-host docs
  ↓
Wave 4 — security/load/failure drills and real-guild private preview
```

At most one issue owns a schema/interface. Consumer issues depend on it rather
than creating parallel versions.

Before implementation starts, these umbrellas must be split into linked,
independently reviewable children while the parent remains the launch gate:

- **HJ-OSS-07:** migration runner/ledger; SQLite/PostgreSQL parity;
  installation-scope/data migration; TLS/restore compatibility.
- **HJ-OSS-10:** manifest/context; routes/auth; lifecycle/collision; v1
  migration.
- **HJ-PRV-02:** schema/migrations; outbox/tasks; audit/RLS/retention.
- **HJ-PRV-03:** Discord OAuth/sessions; tenants/members/invites/ownership.
- **HJ-PRV-05:** catalog/authorization; onboarding state machine;
  observations/quarantine/repair.
- **HJ-OPS-03:** migration orchestration; command/canary; drain/fencing;
  promotion/rollback.
- **HJ-OPS-04:** public core instrumentation; private telemetry pipeline/
  dashboards; alerts/SLOs/runbooks.
- **HJ-OPS-05:** harness foundation; auth/tenant matrix; Discord journey;
  media/supply-chain suites.
- **HJ-OPS-06:** public self-host recovery; private dual-database/object/key
  recovery; external tombstone replay; disaster exercise.
- **HJ-OPS-07:** cohort/readiness; load/soak/failure drills; completion report
  and next-phase decision.

A child may refine acceptance but cannot quietly weaken or duplicate its
parent’s contract.

## Epic and definition governance

### HJ-EPIC — Hosted Jasper MVP

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: epic`
- **Outcome:** Public coordination point for this accepted definition, all
  public child issues, private stable-ID status, launch gates, decision log, and
  preview report.
- **Acceptance:** Links every public issue and this document; reports each
  private stable ID/status/safe outcome and links HJ-PRV-00 for authorized
  collaborators; distinguishes public/private work; shows critical path and
  current gate; records scope changes; closes only when every PRD MVP gate is
  evidenced.
- **Depends on:** Definition PR approval.

### HJ-PRV-00 — Hosted Jasper private delivery epic

- **Repository:** proposed `purrfectsoft/jasper-hosted`
- **Proposed labels:** `priority: P1`, `type: epic`
- **Outcome:** Private coordination point with the real links, owners, sensitive
  operational dependencies, release evidence, and delivery status for every
  proprietary and provider-operations issue.
- **Acceptance:** Links HJ-EPIC and every private child issue; mirrors public-safe
  status/outcome updates by stable ID; records private dependency/owner changes;
  contains no production secret or customer data; closes only with HJ-EPIC’s
  accepted MVP evidence.
- **Depends on:** Definition PR approval and private repository creation.

### HJ-GOV-01 — Inventory and approve provider Discord applications

- **Repository:** private hosted repository, with a safe summary in HJ-EPIC
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Exact controller/worker catalog per environment, ownership,
  install URLs, required/optional classification, permission bitsets, intents,
  verification status/owners, token-rotation path, sandbox guilds, and aligned
  shard plan.
- **Acceptance:** Each application can be authorized and observed in sandbox;
  only the controller publishes commands; no unexplained privileged intent;
  secret references—not values—are recorded; immutable catalog revisions,
  complete application sets and aligned shard topology are recorded; Discord
  scale/verification risks have owners. The final numeric load target is frozen
  from the approved catalog and declared test topology; enough full-cat guilds
  are planned to reach 20 whenever the catalog/cohort permit it.
- **Depends on:** HJ-EPIC.

### HJ-GOV-02 — Approve threat model, data inventory, legal and media launch gate

- **Repository:** private hosted repository; publish a safe architectural
  summary
- **Proposed labels:** `priority: P1`, `type: docs`
- **Outcome:** Reviewed trust boundaries, abuse cases, privacy/retention
  inventory, terms, subprocessors, upstream media/cookie posture, severity
  model, and real-guild launch checklist.
- **Acceptance:** Security, product, and operations owners sign the gate; every
  mitigation maps to an issue/test/runbook; unresolved Sev-0/Sev-1 findings
  block preview.
- **Depends on:** Begin after HJ-GOV-01 and HJ-PRV-01; final approval incorporates
  HJ-PRV-02 and HJ-OPS-02 evidence.

## Public Jasper work

### HJ-OSS-01 — Add clean pull-request CI and production-package verification

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Required build-before-typecheck, tests, lint, plugin validation,
  SQLite/PostgreSQL integration hook, clean packaging smoke, and artifact
  checks run independently of deployment. Untrusted/fork PR checks require no
  private submodule or secret; a separate trusted post-review integration lane
  may consume private artifacts and never uses `pull_request_target` to execute
  contributor code.
- **Acceptance:** A clean checkout passes in the documented Node/pnpm versions;
  stale generated types fail with an actionable job; production output excludes
  test sources; fork CI uses public plugins/fixtures only and cannot read the
  GitHub App or production credentials. Before real-guild preview, the
  repository owner enables required checks/branch review or approves a
  time-bounded waiver with an equivalent manual merge gate.
- **Depends on:** HJ-EPIC.

### HJ-OSS-02 — Introduce runtime profiles and explicit token-safe bot identities

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** `self-hosted`/`hosted` profiles, explicit controller/worker
  catalog/provider, namespaced legacy migration, secret references, and
  token-free public/plugin state.
- **Acceptance:** Unrelated `*_TOKEN` values are ignored; zero/N workers work;
  rotation failure is safe; public/plugin contracts, status, logs and
  serialization contain no token value; trusted-process limitations are
  documented; old self-host config has a documented migration test.
- **Depends on:** HJ-GOV-01, HJ-OSS-01.

### HJ-OSS-03 — Minimize Discord intents and separate controller/worker events

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: enhancement` (security-critical)
- **Outcome:** Each app requests only used intents and handles only appropriate
  events/interactions. Soundboard upload no longer forces hosted
  `MessageContent`, or that path is disabled in hosted mode.
- **Acceptance:** Static/runtime intent inventory matches HJ-GOV-01; workers do
  not process controller interactions; existing self-hosted features have an
  explicit supported replacement or profile behavior.
- **Depends on:** HJ-OSS-02.

### HJ-OSS-04 — Replace global worker busy state with per-guild AFR leases

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Atomic per-guild/cat/channel/generation lease state, eligible-cat
  filtering/retry, retained-connection ownership, and preserved weighted AFR.
- **Acceptance:** Same cat serves two guilds concurrently; never two channels in
  one guild; partial installs and permission failure try safe alternatives;
  every lease/allocation/release includes immutable `installationId`; stale
  release or callback from a purged install is ignored; controller fallback/
  weights pass deterministic and statistical tests; all existing playback
  tests pass.
- **Depends on:** HJ-OSS-02, HJ-OSS-03.

### HJ-OSS-05 — Add provider-neutral guild installation and access policy

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Required guild/installation context at Discord entry, active /
  degraded / suspended / deleting policy, local self-host resolver, hosted
  adapter port, and unregistered/DM rejection.
- **Acceptance:** No command/queue/plugin work begins without resolved scope;
  policy cache and expiry semantics are contract-tested; local mode requires no
  private service; announcements, autocomplete/components, hooks, tasks and all
  outbound Discord side effects share the guard; `/catastrophic-reset` and
  `/music-status` are installation-scoped and authorized, and controller state
  is counted once.
- **Depends on:** HJ-OSS-01.

### HJ-OSS-06 — Build release-time global/guild command publisher

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Typed command manifest/digest with `dry-run`, sandbox `guild`,
  and hosted `global` strategies; no startup or tenant-toggle publication.
- **Acceptance:** Only controller credentials publish; production-disabled test
  plugins are absent; descriptors are pure and publication never executes
  plugin `onLoad`, database/network work, routes, hooks or tasks; the manifest
  declares guild-only Discord contexts and safe default permissions;
  expand-contract command smoke passes; publication is idempotent and records
  release/environment; failure cannot mutate a running release into an unknown
  combination.
- **Depends on:** HJ-OSS-01, HJ-OSS-03, HJ-OSS-10.

### HJ-OSS-07 — Re-scope #122: migrations, PostgreSQL parity and installation-safe data

- **Repository:** `sakibtamim/Jasper`; prefer updating existing
  [#122](https://github.com/sakibtamim/Jasper/issues/122) and filing bounded
  children
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Checksum-tracked locked migrations, PostgreSQL/SQLite parity,
  installation-scoped repository APIs/aggregates, verified TLS configuration,
  and expand-contract/rollback policy.
- **Acceptance:** Migrate from every supported schema in both adapters;
  PostgreSQL thumbnail and shared columns match; no startup DDL in hosted
  runtime; every tenant-owned core/plugin row uses immutable `installationId`
  with guild correlation; reinstall/deletion and cross-installation query tests
  fail closed; component spool and non-resumable active-work markers migrate
  under the same scope; raw search/query mappings are scoped, minimized and
  redacted; restore-compatible migration documentation exists.
- **Depends on:** HJ-OSS-01, HJ-OSS-05.

### HJ-OSS-08 — Add installation-scoped storage providers and safe media ingestion

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature` (security-critical)
- **Outcome:** Separate tenant asset, plugin asset, and shared cache interfaces;
  local and S3-compatible implementations; central SSRF/redirect/time/size/MIME
  policy and quota hooks.
- **Acceptance:** Object/local traversal and cross-guild access tests pass;
  private/link-local/metadata destinations remain blocked across redirects and
  DNS changes; oversized/invalid uploads stream-fail safely; shared cache
  contains no tenant ACL/data. yt-dlp/FFmpeg use controlled egress, robust URL
  parsing, bounded child-process concurrency/lifetime/stdout/stderr, resource
  limits and approved arguments; raw searches and URL-to-result mappings never
  become cross-tenant cache metadata.
- **Depends on:** HJ-OSS-05, HJ-OSS-07.

### HJ-OSS-09 — Make HTTP/API authorization default-deny and close hosted legacy admin

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature` (security-critical)
- **Outcome:** Principal/action/guild middleware, separate operator API, signed
  session behavior, installation-scoped status/stats/logs, and hosted-profile
  disable for DevTools, plugin upload and global dashboard data.
- **Acceptance:** Real Fastify injection tests prove anonymous/customer/staff/
  workload separation and cross-guild denial; no route returns decrypted OAuth
  tokens or media cookies; “any authenticated user” grants no global mutation.
  Hosted startup fails if legacy `/api/auth/*`, DevTools, dashboard, public
  operations, or customer plugin-management routes remain enabled.
- **Depends on:** HJ-OSS-05, HJ-OSS-07.

### HJ-OSS-10 — Version the plugin SDK for typed policy, lifecycle and capabilities

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Stable manifest ID/SDK range/capabilities; schema-typed,
  default-deny routes; guild/principal context; health and guild lifecycle;
  owned disposal handles; safe client/worker facades; scoped stores, assets,
  hooks and scheduled work; narrow installation runtime operations and
  component state/spool contracts; deterministic collisions.
- **Acceptance:** Missing policy/schema fails registration; incompatibility can
  fail readiness; unload disposes hooks/tasks/commands and deactivates every
  route so no stale handler executes; a plugin cannot overwrite/delete a core
  command; “read-only” data cannot toggle plugins; post-ready activation follows
  a documented dispatcher-or-restart policy. Public facades expose no tokens or
  generic raw client/operator authority; the hosted adapter can snapshot,
  drain, leave with revision/fence checks, and persist bounded boot-scoped
  observation cursors without direct control-plane database access. The current
  fenced owner can claim ordered unacknowledged records from prior boots and
  acknowledge their original cursor; replaceable snapshots coalesce, while
  required-record overflow fails readiness/admission instead of silently
  dropping state.
- **Depends on:** HJ-OSS-02, HJ-OSS-05, HJ-OSS-09.

### HJ-OSS-11 — Add runtime identity, sharding, health, degraded and drain contract

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Cell/release/shard/fence identity, aligned multi-client shard
  startup, live/ready/internal health, component contributors, bounded drain,
  structured logs and metrics vocabulary.
- **Acceptance:** All client logins failing cannot report ready; controller loss
  is unready; worker loss is degraded; stale fence stops admission; drain
  reports/finishes/forces predictably; endpoints leak no sensitive topology
  publicly. A stable `(environment, shardId)` CAS lease owns the complete
  aligned app set atomically, stores shard count/catalog revision/epoch/holder/
  boot/expiry, renews on a 10-second target under a 30-second TTL, rejects
  partial starts and stale `(cell,fence,boot,sequence)` observations, and passes
  network-partition, delayed-renewal and topology-cutover tests. Docs/tests make
  ephemeral queue behavior explicit: finite queues drain gracefully, while
  minimal non-resumable active-work markers let crash/fence loss emit a
  best-effort scoped interruption without reconstructing or claiming resume.
- **Depends on:** HJ-OSS-02, HJ-OSS-04, HJ-OSS-05, HJ-OSS-10.

### HJ-OSS-12 — Produce deterministic complete plugin artifacts and trust policy

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Recursive/bundled backend, frontend/assets, hashes, SDK metadata,
  SBOM/provenance/signature hooks, allowlist/integrity enforcement, install and
  boot smoke.
- **Acceptance:** A multi-module fixture packages and boots from ZIP/artifact;
  dependency and hidden files are deterministic; tamper/incompatible version
  fails; hosted profile cannot install arbitrary browser uploads. The exact
  initial production inventory—core commands, required hosted adapter, and
  conditionally enabled Garage Band/Soundboard—excludes Sound Effect and all
  test/demo plugins from image and command manifest, tests both JSX runtimes,
  and is signed into release metadata.
- **Depends on:** HJ-OSS-01, HJ-OSS-10.

### HJ-OSS-13 — Expose stable plugin audio enqueue service

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: feature`
- **Outcome:** Public installation-scoped enqueue/play service supporting Garage
  Band without relative imports into `core/music-player`.
- **Acceptance:** Contract covers requester, ordering, errors, lease/policy and
  gain needs; reference plugin tests use only public types; internal refactor
  does not break contract test.
- **Depends on:** HJ-OSS-04, HJ-OSS-05, HJ-OSS-10.

### HJ-OSS-17 — Add provider-neutral capability decision port and all-free resolver

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Small execution-time capability decision interface with an
  unconditional local/self-hosted resolver and explicit separation from
  operational quotas.
- **Acceptance:** Core knows no plan, price, payment provider, trial or
  subscription type; default/self-hosted operation grants every existing
  capability; decision input is guild/installation plus stable capability ID;
  denial is testable but unused by MVP commerce.
- **Depends on:** HJ-OSS-05, HJ-OSS-10.

### HJ-SB-01 — Make Soundboard guild-safe and hosted-intent-safe

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: enhancement` (security-critical)
- **Outcome:** Installation-scoped sounds/plays/assets, authenticated mutations,
  real owner attribution, safe upload, and no unjustified hosted
  MessageContent dependency.
- **Acceptance:** Two-guild negative tests; placeholder `dashboard-user`
  removed; customer route policy enforced; attachment upload or documented
  profile fallback works.
- **Depends on:** HJ-OSS-03, HJ-OSS-08, HJ-OSS-09, HJ-OSS-10.

### HJ-OSS-14 — Publish Jasper base image and one-container SQLite quick path

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Non-root immutable OCI base with pinned verified media tools and
  a zero-private-dependency one-container path using SQLite and local volumes.
- **Acceptance:** A clean host boots controller plus optional workers with an
  explicit migrate/migrate-and-start path, health, command publication, pinned
  tools, non-root/read-only defaults, persistent local volumes and
  upgrade/rollback smoke; no private checkout, artifact or mutable runtime
  download is required. The image excludes private Garage Band source or
  consumes only a verified public compiled artifact; private integration is
  assembled in the private distribution lane.
- **Depends on:** HJ-OSS-07, HJ-OSS-08, HJ-OSS-11, HJ-OSS-12.

### HJ-OSS-19 — Publish production-like self-host Compose and recovery path

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: infra`
- **Outcome:** Tested Jasper/PostgreSQL/S3-compatible-storage Compose profile
  with isolated migrations, health, backup/restore, upgrade and rollback.
- **Acceptance:** A clean host completes controller/optional-worker boot,
  PostgreSQL/object persistence, independently locked migration, backup/restore,
  upgrade and previous-compatible-release rollback drills. SQLite quick start
  remains simpler and supported; no private service or artifact is required.
- **Depends on:** HJ-OSS-07, HJ-OSS-08, HJ-OSS-14.

### HJ-OSS-20 — Enforce installation and provider operational safety policy

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: feature` (reliability-critical)
- **Outcome:** Provider-neutral safety-policy interface and local defaults for
  per-installation command, queue, playback, extraction, download and upload
  limits plus cell/global provider budgets.
- **Acceptance:** One installation cannot exhaust queue slots, child processes,
  object bandwidth or cat/cell capacity for others; overload fails safely with
  a bounded retry reason; limits have telemetry and deterministic concurrency/
  noisy-neighbor tests; no policy names a plan, price or entitlement.
- **Depends on:** HJ-OSS-04, HJ-OSS-08, HJ-OSS-09.

### HJ-OSS-15 — Correct onboarding docs and publish independent-provider contract

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: docs`
- **Outcome:** Fix verified README/AUTH/DEPLOY/ENV/plugin contradictions; document
  runtime profiles, explicit cats, shard alignment, scopes, migrations, storage,
  command release, health/drain, secrets, image, Compose and provider operation.
- **Acceptance:** Every command/path/version is smoke-tested; PM2 process/port
  claims match code; docs state controller AFR behavior and plugin trust;
  another operator can deploy without private Hosted Jasper.
- **Depends on:** HJ-OSS-02, HJ-OSS-03, HJ-OSS-04, HJ-OSS-05, HJ-OSS-06, HJ-OSS-07,
  HJ-OSS-08, HJ-OSS-09, HJ-OSS-10, HJ-OSS-11, HJ-OSS-12, HJ-OSS-14,
  HJ-OSS-17, HJ-OSS-19, HJ-OSS-20 as their sections stabilize.

### HJ-OSS-16 — Freeze or minimally stabilize the unsafe legacy `deploy` lane

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Wave-0 decision prevents the active unprotected in-place lane
  from remaining an unattended path while hosted foundations are built.
- **Acceptance:** Either freeze bot deployments until replacement, or—before
  the next use—add an owner-approved manual gate, concurrency, clean quality
  checks, production plugin discovery, recoverable release/rollback, command
  ordering and post-start readiness/smoke; document the actual one-host/
  one-guild scope and current rollback procedure.
- **Depends on (freeze branch):** HJ-EPIC only; freeze before another
  deployment.
- **Depends on (stabilization branch):** HJ-OSS-01; reuse HJ-OSS-06/HJ-OSS-11
  as they land rather than creating incompatible command/health contracts.

### HJ-OSS-18 — Retire or migrate the legacy lane after the public image is proven

- **Repository:** `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: infra`
- **Outcome:** Final, documented choice to move the existing staging guild to
  the immutable public container path or retain PM2 as an explicitly supported
  manual lane.
- **Acceptance if retained:** It consumes the common image/artifact, command,
  migration, health and rollback contracts with named ownership.
  **Acceptance if retired:** State/data migration, archival and runbook removal
  follow a successful Compose replacement drill.
- **Depends on:** HJ-OSS-06, HJ-OSS-11, HJ-OSS-16, HJ-OSS-19.

## Garage Band work

### HJ-GB-01 — Make playlists tenant-safe, authorized and concurrency-safe

- **Repository:** `purrfectsoft/jasper-plugin-garage-band`
- **Proposed labels:** `priority: P1`, `type: feature`
- **Outcome:** Guild/installation scope, enforced owner/member/admin policy,
  normalized or optimistic-concurrency-safe persistence, and authenticated
  command/API behavior.
- **Acceptance:** No global `playlists` array or name uniqueness; no synthetic
  `api` owner; lost-update and two-guild negative tests pass; migration from
  existing self-host data is documented and non-destructive.
- **Depends on:** HJ-OSS-07, HJ-OSS-09, HJ-OSS-10.

### HJ-GB-02 — Move Garage Band media and playback to public safe services

- **Repository:** `purrfectsoft/jasper-plugin-garage-band`
- **Proposed labels:** `priority: P1`, `type: feature` (security-critical)
- **Outcome:** Public enqueue API, scoped object storage, streaming safe fetch,
  type/size/quota policy, and authenticated upload/thumbnail/direct URL flow.
- **Acceptance:** No relative core import or unbounded remote `arrayBuffer`;
  SSRF/oversize/cross-guild tests pass; direct-link persistence behavior matches
  documentation.
- **Depends on:** HJ-OSS-08, HJ-OSS-13, HJ-GB-01.

### HJ-GB-03 — Immediately repair Garage Band release authentication and versioning

- **Repository:** `purrfectsoft/jasper-plugin-garage-band`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Restore the already-broken private-to-public release path without
  waiting for the tenant-safe feature release: short-lived authentication,
  manifest/runtime version parity, immutable current-format artifact and install
  smoke.
- **Acceptance:** No manual unexplained publication; a release fails before
  publishing on auth/version mismatch; the next maintenance artifact
  installs/boots and maps to an exact reviewed source commit; prior
  `Bad credentials` regression has a test/monitor.
- **Depends on:** HJ-EPIC; can begin immediately.

### HJ-GB-04 — Promote the tenant-safe Garage Band preview artifact

- **Repository:** `purrfectsoft/jasper-plugin-garage-band`
- **Proposed labels:** `priority: P1`, `type: infra`
- **Outcome:** Apply the complete recursive package, hashes, SBOM/provenance,
  compatibility and source/artifact/Jasper-release parity contract to the
  guild-safe Garage Band version.
- **Acceptance:** HJ-GB-01/02 behavior ships in an exact reviewed artifact;
  install/boot/cross-guild/concurrency smoke passes; private source, public
  artifact and hosted/public Jasper release metadata agree.
- **Depends on:** HJ-OSS-12, HJ-GB-01, HJ-GB-02, HJ-GB-03.

## Private Hosted Jasper product

### HJ-PRV-01 — Establish private repository governance and adapter spike

- **Repository:** proposed `purrfectsoft/jasper-hosted`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Repository governance, ownership/review policy, secret-free
  developer bootstrap, minimal stack-neutral Jasper plugin entry/manifest,
  contract-fixture CI, compatibility/version policy, and a time-boxed
  adapter-contract feasibility spike. Product application scaffolding waits for
  HJ-PRV-13.
- **Acceptance:** Against public contract fixtures, the spike packages/boots,
  sends a heartbeat/observation, receives desired state, permits/denies a guild,
  deactivates cleanly, and records every required core gap; it explicitly tests
  classic and automatic JSX-runtime compatibility for #38. The private plugin
  uses no internal core import or public-repository pointer; the GitHub Free
  branch-protection gap has an explicit mitigation; no production secret or
  pre-ADR framework commitment is needed.
- **Depends on:** HJ-EPIC, HJ-PRV-00.

### HJ-PRV-13 — Approve the hosted provider-stack and portability ADR

- **Repository:** proposed `purrfectsoft/jasper-hosted`; publish a safe decision
  summary
- **Proposed labels:** `priority: P0`, `type: docs`
- **Outcome:** Construction-ready ADR selects the web/API/workspace stack,
  database access/migration/RLS approach, orchestrator and declarative IaC,
  customer/staff/workload identity, KMS/secrets, object storage, telemetry,
  deployment regions and local test substitutes.
- **Acceptance:** Each choice records security boundaries, portability,
  operational ownership, cost/capacity assumptions, lock-in and exit path;
  development has secret-free local substitutes; production has short-lived
  identity and private endpoints; the ADR identifies which contracts remain
  provider-neutral and which implementation is proprietary.
- **Depends on:** HJ-GOV-01, HJ-PRV-01.

### HJ-PRV-14 — Scaffold the approved private application workspace

- **Repository:** proposed `purrfectsoft/jasper-hosted`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Implement the accepted HJ-PRV-13 workspace baseline for the
  control-plane API/worker, customer portal, staff console, marketing app and
  shared packages without coupling their deploy lifecycle to the runtime plugin.
- **Acceptance:** Every deployable builds independently in secret-free CI;
  shared contracts are versioned; local substitutes start through one
  documented developer path; production adapters remain behind the ADR’s
  interfaces; no browser app imports runtime/server secrets or internal Jasper
  code.
- **Depends on:** HJ-PRV-13.

### HJ-PRV-02 — Implement control-plane schema, migrations, outbox and audit

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Records from design section 10, transactional lifecycle,
  idempotency, optimistic versions, outbox/inbox/task leases, row-scope defense,
  append-only audit, and retention jobs.
- **Acceptance:** One nonterminal/recoverable installation per guild across
  provisioning/active/degraded/suspended/deleting plus the 30-day tombstone;
  immutable installation IDs scope all owned records; duplicate events/tasks do
  not duplicate effects; stale versions/fences fail; cross-tenant repository
  and RLS tests pass; the private migration ledger/lock and rollback/backup
  compatibility are documented independently from Jasper’s data-plane schema.
- **Depends on:** HJ-PRV-14.

### HJ-PRV-03 — Build customer Discord identity, tenant and membership service

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Secure Discord OAuth/session/revocation, manageable-guild lookup,
  tenant owner/admin/viewer policy, invites, ownership transfer and account
  access.
- **Acceptance:** `identify guilds` scopes are exact; state/CSRF/session rotation
  tests pass; browser guild IDs grant no authority; invitation replay/expiry and
  cross-tenant denial pass; duplicate guild selection routes to an authorized
  existing tenant or audited recovery without takeover; secrets remain
  encrypted/redacted.
- **Depends on:** HJ-PRV-02.

### HJ-PRV-04 — Build staff OIDC, RBAC and privileged-action service

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: feature` (security-critical)
- **Outcome:** Separate MFA-backed staff issuer/session and support/product/
  DevOps/security roles with audited safe operations.
- **Acceptance:** Customer tokens cannot reach staff routes; absent/incorrect
  claims fail closed; every mutation requires role/reason and appends audit;
  secrets/decrypted OAuth/cookies are never returned; break-glass is time-bound.
- **Depends on:** HJ-PRV-02.

### HJ-PRV-05 — Implement application catalog and resumable onboarding engine

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Server-generated per-cat authorization, durable state machine,
  observation matching, optional workers, repair/resume, duplicate-guild
  handling and activation.
- **Acceptance:** Controller plus all workers, controller-only, cancelled,
  duplicate, delayed, removal/repair and browser-resume scenarios pass; redirect
  alone never proves install; every run/action pins immutable catalog revision,
  app ID, scopes and permissions; rotation either preserves that revision or
  explicitly migrates/invalidates the step. Normal promotion drains old-revision
  runs and leave tasks before runtime cutover; historical app IDs remain usable
  for matching/audit and bounded cleanup, and emergency retirement is an
  explicit action-required flow. All transitions are idempotent and audited.
- **Depends on:** HJ-GOV-01, HJ-PRV-02, HJ-PRV-03, HJ-PRV-06.

### HJ-PRV-06 — Implement the hosted runtime adapter plugin

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Workload identity, cell registration/heartbeat, app/guild/health
  observations, desired config and task polling, policy cache, fence enforcement
  and config acknowledgement through public Jasper interfaces.
- **Acceptance:** The plugin PoC exit criteria all pass; 15-minute
  last-known-good expiry fails closed; observation batching/dedup works; stale
  cell/task/config cannot mutate state; records and acknowledgements use
  `(cell,fence,boot,sequence)` and persist a bounded restart-safe spool; clean
  unload and artifact boot pass.
- **Depends on:** HJ-PRV-01, HJ-PRV-02, HJ-OSS-05, HJ-OSS-10, HJ-OSS-11,
  HJ-OSS-12.

### HJ-PRV-07 — Implement revisioned tenant configuration and free resolver

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: feature`
- **Outcome:** Validated versioned settings, desired-state convergence and
  provider-neutral entitlement decision whose MVP implementation grants the
  complete product to every admitted tenant.
- **Acceptance:** Stale writes reject, last accepted revision is visible, bad
  config preserves last-known-good, operational quotas are separately labeled,
  and no price/plan/payment/paid feature branch exists.
- **Depends on:** HJ-PRV-02, HJ-PRV-06, HJ-OSS-17, HJ-OSS-20.

### HJ-PRV-08 — Build customer portal critical paths

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P1`, `type: feature`
- **Outcome:** Sign-in, guild chooser, live/resumable installer, per-cat capacity
  and repair, configuration, members, usage/status, removal and deletion UX.
- **Acceptance:** All PRD customer journeys pass on mobile/desktop and keyboard/
  screen-reader review; polling/reconnect never loses progress; errors are
  correctly classified/redacted; the signed-release plugin/command inventory
  and self-hosted-only surfaces are displayed accurately; cross-tenant browser/
  API tests pass.
- **Depends on:** HJ-PRV-03, HJ-PRV-05, HJ-PRV-07, HJ-PRV-11.

### HJ-PRV-09 — Build transparent marketing and preview acquisition funnel

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P1`, `type: feature`
- **Outcome:** Public product/OSS boundary, multi-cat consent explanation,
  permissions/privacy/terms/support, approved cohort CTA and minimized funnel
  events.
- **Acceptance:** No promise of literal zero-click authorization, public GA or
  paid plan; waitlist/unapproved state works; analytics contain no Discord
  message/search/media content; the exact enabled plugin/command inventory and
  self-hosted-only web surfaces match the signed release; critical
  accessibility review passes.
- **Depends on:** HJ-PRV-03, HJ-PRV-12, HJ-GOV-02.

### HJ-PRV-10 — Build staff tenant and fleet console

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P1`, `type: feature`
- **Outcome:** Role-scoped onboarding/tenant/config/cell/shard/release/health
  views and named idempotent recovery operations.
- **Acceptance:** Read-only support cannot mutate; operators cannot deploy/
  restore/manage roles; all fields/actions are redacted and audited; exact
  guild search is controlled; stale fence/revision is visible.
- **Depends on:** HJ-PRV-04, HJ-PRV-05, HJ-PRV-06, HJ-OPS-04.

### HJ-PRV-11 — Implement removal, deletion, retention and account privacy jobs

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P1`, `type: feature` (security-critical)
- **Outcome:** Reauthenticated removal, immediate admission denial, per-guild
  drain/leave, 30-day recovery window, purge/tombstones, account/session/OAuth
  cleanup, holds and customer-visible state.
- **Acceptance:** Deletion never affects another tenant or shared-safe cache;
  restored backup cannot reactivate a purged tenant; every stage is retryable,
  idempotent and audited; the immutable installation ID and external tombstone
  prevent same-guild reinstall from seeing old records; published retention
  matches jobs/object lifecycle.
- **Depends on:** HJ-PRV-02, HJ-PRV-03, HJ-PRV-06.

### HJ-PRV-12 — Add privacy-preserving product and usage measurement

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P1`, `type: feature`
- **Outcome:** Funnel, readiness, command/playback outcome, aggregate AFR/
  capacity, retention and support events with documented minimization.
- **Acceptance:** Event schema/dedup/retention exists; no message content, OAuth
  token, cookie, raw search term or unneeded media URL; metrics reconcile within
  accepted tolerance; service-controlled time, total wall-clock time and
  per-Discord-consent dwell/abandonment are distinguishable; deletion policy is
  applied.
- **Depends on:** HJ-PRV-02, HJ-PRV-05, HJ-PRV-06, HJ-GOV-02.

## Hosted infrastructure and quality

### HJ-OPS-01 — Build immutable hosted distribution and supply-chain pipeline

- **Repository:** private hosted repository, consuming public base
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Exact public-base/private-plugin image, pinned verified media
  tools, non-root runtime, environment-independent signed release-manifest
  promotion, signed per-environment deployment envelopes, SBOM/provenance/scans
  and attestations.
- **Acceptance:** No environment rebuild or runtime package/binary download;
  tamper/incompatible plugin fails; exact core/private commits are traceable;
  sandbox image smoke includes controller, plugin, DB and health. Deployment
  verifies a signed manifest binding core/private/plugin digests, both schema
  compatibility ranges/migration digests, config/catalog schema compatibility,
  command manifest, infrastructure contract, attestations/waivers and prior
  compatible manifest. A signed environment envelope separately binds exact
  config/catalog/infra revisions, migration results, command target/digest,
  approval/canary evidence and prior envelope.
- **Depends on:** HJ-OSS-06, HJ-OSS-12, HJ-OSS-14, HJ-PRV-01, HJ-PRV-06.

### HJ-OPS-02 — Provision isolated sandbox, staging and preview environments

- **Repository:** private hosted repository
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Named environments with separate Discord apps/guilds, network,
  PostgreSQL, object store, secret/KMS, workload identity, DNS/TLS, capacity and
  access policy, expressed as declarative infrastructure.
- **Acceptance:** No production credential in lower environments; DB/object/
  runtime endpoints are private; IaC plans are reproducible and drift-detected;
  deployment uses short-lived identity plus protected-environment approval and
  concurrency; resource limits and capacity/admission thresholds are explicit;
  secret rotation and least-privilege access test pass. Final readiness also
  requires HJ-OPS-01 artifacts, but foundation work starts independently.
- **Depends on (foundation):** HJ-GOV-01, HJ-PRV-01, HJ-PRV-13.
- **Depends on (final readiness):** HJ-OPS-01.

### HJ-OPS-03 — Implement migration, command, drain, promotion and rollback controller

- **Repository:** private hosted repository umbrella; linked public command/
  drain contract children in `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Orchestrated independently locked data/control migration sets,
  atomic aligned shard-set ownership, bounded drain, target canary, compatible
  command publication, identical release-manifest promotion, signed environment
  envelopes, and previous-compatible-release rollback.
- **Acceptance:** Bad migration/readiness/command smoke stops promotion;
  deploy-time release-manifest and environment-envelope signature/attestation
  verification is mandatory; rollback ≤10 minutes and retains both schema
  domains’ compatibility; duplicate or partial deployments cannot own an
  aligned app set; catalog cutover blocks on old-revision runs/cleanup or an
  explicit emergency migration; automated registry/digest checks and
  controlled target-environment Discord canary evidence are distinct;
  active/idle voice drill behavior matches runbook.
- **Depends on:** HJ-OSS-06, HJ-OSS-07, HJ-OSS-11, HJ-PRV-02, HJ-PRV-07,
  HJ-OPS-01, HJ-OPS-02.

### HJ-OPS-04 — Operate structured telemetry, SLOs, alerts and runbooks

- **Repository:** private hosted repository umbrella; linked public core
  instrumentation child in `sakibtamim/Jasper`
- **Proposed labels:** `priority: P0`, `type: infra`
- **Outcome:** Metrics/logs/traces, dashboards, preview objectives, alert
  routing and every runbook named in design section 13.
- **Acceptance:** Synthetic failures page the correct owner; traces cross
  control/data planes by safe request ID; high-cardinality tenant IDs are not
  metric labels; support sees redacted linked evidence; alert/runbook drill is
  recorded. Dashboards calculate the PRD’s exact control-canary and assigned-
  shard-minute denominators, fleet/cell/tenant impact, Discord-incident
  classification and capped excluded maintenance.
- **Depends on:** HJ-OSS-11, HJ-PRV-06, HJ-OPS-02.

### HJ-OPS-05 — Build tenant/security and Discord journey test harness

- **Repository:** private hosted repository umbrella; reusable public contract
  fixture children in `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: infra`; mark the harness-foundation
  child `priority: P0`
- **Outcome:** Real Fastify auth matrix, two-tenant DB/object/API/plugin tests,
  Discord sandbox onboarding/repair fixtures, SSRF/upload tests, secret scans and
  artifact/image smoke.
- **Acceptance:** The complete design section 18 matrix runs in CI or a named
  controlled environment; destructive Discord tests cannot target preview apps/
  guilds; a seeded cross-tenant bug proves the gate fails; fencing covers
  delayed renewal, network partition, replacement epochs and boot-scoped
  observations. The harness skeleton starts after the foundation dependencies;
  final matrices wait for the explicitly listed feature dependencies.
- **Depends on (foundation):** HJ-OSS-01, HJ-PRV-01, HJ-OPS-02.
- **Depends on (final matrices):** HJ-OSS-05, HJ-OSS-07, HJ-OSS-08,
  HJ-OSS-09, HJ-OSS-10, HJ-OSS-11, HJ-OSS-12, HJ-OSS-17, HJ-OSS-20,
  HJ-PRV-02, HJ-PRV-03, HJ-PRV-04, HJ-PRV-05, HJ-PRV-06, HJ-PRV-07,
  HJ-PRV-08, HJ-PRV-11, HJ-OPS-01, HJ-OPS-03, HJ-OPS-04, HJ-OPS-06.

### HJ-OPS-06 — Implement backup, restore, deletion-tombstone and disaster drill

- **Repository:** private hosted repository umbrella; linked public self-host
  recovery children in `sakibtamim/Jasper`
- **Proposed labels:** `priority: P1`, `type: infra`
- **Outcome:** Encrypted backups/PITR for both PostgreSQL domains, tenant-object
  policy, config/catalog and key recovery, proposed RPO/RTO, restore isolation,
  scheduled exercises, and tombstone replay from a separate failure domain.
- **Acceptance:** Fresh-environment restore of Jasper data, control-plane data,
  tenant objects, config/catalog and required KMS/key material succeeds inside
  RTO with measured RPO; an independently retained immutable deletion ledger is
  replayed so a deleted installation cannot reactivate; object/database
  consistency is checked; credentials and reports are access-controlled;
  public self-host procedure is documented.
- **Depends on:** HJ-OSS-07, HJ-OSS-08, HJ-PRV-02, HJ-PRV-11, HJ-OPS-02.

### HJ-OPS-07 — Run private-preview load, soak and failure program

- **Repository:** private hosted repository; summary in public epic
- **Proposed labels:** `priority: P2`, `type: epic`
- **Outcome:** Staged employee/external cohort with consent, capacity model,
  failure drills, feedback and MVP evidence.
- **Acceptance:** 10 guilds, at least 3 full-cat guilds and 1,000 starts/14 days
  are recorded. The controlled load reaches the HJ-GOV-01 numeric target,
  frozen as `min(20, planned cat slots)` in a declared topology across at least
  5 guilds; enough full-cat guilds target 20 whenever catalog/cohort capacity
  permits, and missing/unready cats fail rather than shrink it. Onboarding/
  performance, restore/rollback and structured owner feedback pass, with no
  confirmed tenant disclosure or unresolved Sev-0/Sev-1 defect. HJ-GB-01/02/04
  and HJ-SB-01 become additional gates only when those plugins are enabled;
  otherwise the release inventory states they are disabled.
- **Depends on:** HJ-GOV-01, HJ-GOV-02, HJ-OSS-01, HJ-OSS-02, HJ-OSS-03,
  HJ-OSS-04, HJ-OSS-05, HJ-OSS-06, HJ-OSS-07, HJ-OSS-08, HJ-OSS-09,
  HJ-OSS-10, HJ-OSS-11, HJ-OSS-12, HJ-OSS-14, HJ-OSS-15, HJ-OSS-16,
  HJ-OSS-17, HJ-OSS-18, HJ-OSS-19, HJ-OSS-20, HJ-PRV-01, HJ-PRV-02, HJ-PRV-03,
  HJ-PRV-04, HJ-PRV-05, HJ-PRV-06, HJ-PRV-07, HJ-PRV-08, HJ-PRV-09,
  HJ-PRV-10, HJ-PRV-11, HJ-PRV-12, HJ-PRV-13, HJ-PRV-14, HJ-OPS-01,
  HJ-OPS-02, HJ-OPS-03, HJ-OPS-04, HJ-OPS-05, HJ-OPS-06.

## Critical path

```text
HJ-EPIC
├─ HJ-GOV-01
│  └─ HJ-OSS-02 ─ HJ-OSS-03 ─ HJ-OSS-04
├─ HJ-OSS-01
│  └─ HJ-OSS-05 ─┬─ HJ-OSS-07 ─ HJ-OSS-08 ─ HJ-OSS-20
│                 ├─ HJ-OSS-09 ─ HJ-OSS-10 ─ HJ-OSS-12
│                 └─ HJ-OSS-11
├─ HJ-PRV-00 ─ HJ-PRV-01 ─ HJ-PRV-13 ─ HJ-PRV-14 ─ HJ-PRV-02
│                                                     ├─ HJ-PRV-03
│                                                     ├─ HJ-PRV-04
│                                                     └─ HJ-PRV-06
├─ HJ-PRV-03 + HJ-PRV-06 ─ HJ-PRV-05 ─ HJ-PRV-08
├─ public base + private plugin ─ HJ-OPS-01
├─ HJ-GOV-01 + HJ-PRV-13 ─ HJ-OPS-02
├─ HJ-OPS-01 + HJ-OPS-02 ─ HJ-OPS-03
└─ safety/product/operations gates ─ HJ-OPS-07
```

Garage Band is on the preview path only if it is enabled for preview. If the
tenant-safe migration threatens core onboarding, ship preview with it disabled
and state that limitation; do not weaken the isolation gate.

## Existing open-issue disposition

No issue is changed during this definition phase.

| Existing issue                                                                                     | Action after approval                                                                     | Hosted relationship           |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| [#122 PostgreSQL production migration and backup](https://github.com/sakibtamim/Jasper/issues/122) | Re-scope as HJ-OSS-07 umbrella; split provider backup into HJ-OPS-06                      | Include and prioritize        |
| [#101 Garage Band Phase 3 epic](https://github.com/sakibtamim/Jasper/issues/101)                   | Mark completed child #100; split/defer #98/#99; do not use as hosted epic                 | Discuss and narrow            |
| [#99 collaborative playlists](https://github.com/sakibtamim/Jasper/issues/99)                      | Defer until tenant-authenticated horizontally scalable realtime contract                  | Later feature                 |
| [#98 Stripe/premium tiers](https://github.com/sakibtamim/Jasper/issues/98)                         | Defer/supersede in proprietary commercial phase; remove proposed core Stripe coupling     | Conflicts with MVP            |
| [#48 agentic infrastructure](https://github.com/sakibtamim/Jasper/issues/48)                       | Verify merged PRs #49/#116 satisfy it, then close or identify one residual issue          | Housekeeping                  |
| [#38 automatic JSX runtime](https://github.com/sakibtamim/Jasper/issues/38)                        | Time-box in HJ-PRV-01/HJ-OSS-12 compatibility spike; implement only on reproduced blocker | Relevant, not default blocker |
| [#36 realtime soundboard mixing](https://github.com/sakibtamim/Jasper/issues/36)                   | Defer until isolation, quotas and measured capacity                                       | Out of MVP                    |

At the 2026-07-24 pre-definition-PR audit baseline there were no open PRs in
Jasper or the two Garage Band repositories and no other open issue matching
hosted, tenant, multi-tenant, or orchestration.

## Requirement-to-issue traceability

| Requirement group                                   | Primary proposed issues                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| Repository/provider foundation                      | HJ-PRV-00, HJ-PRV-01, HJ-PRV-13, HJ-PRV-14                              |
| FR-MKT / acquisition                                | HJ-PRV-09, HJ-PRV-12, HJ-GOV-02                                         |
| FR-ID / customer and staff identity                 | HJ-PRV-03, HJ-PRV-04, HJ-OPS-05                                         |
| FR-ACC-01 / free preview cohort                     | HJ-PRV-07, HJ-PRV-09, HJ-GOV-02                                         |
| FR-TEN / tenant and membership                      | HJ-PRV-02, HJ-PRV-03, HJ-OPS-05                                         |
| FR-ONB / guided installation                        | HJ-GOV-01, HJ-PRV-05, HJ-PRV-06, HJ-PRV-08                              |
| FR-RUN / Jasper runtime                             | HJ-OSS-02 through HJ-OSS-11, HJ-OSS-20, HJ-SB-01                        |
| FR-CFG / desired configuration                      | HJ-OSS-05, HJ-PRV-06, HJ-PRV-07                                         |
| FR-PORT / customer portal                           | HJ-PRV-08                                                               |
| FR-OPS / staff and support                          | HJ-PRV-04, HJ-PRV-10, HJ-OPS-04                                         |
| FR-PLG / plugin contract                            | HJ-OSS-10 through HJ-OSS-13, HJ-PRV-06                                  |
| FR-OSS / open hosting                               | HJ-OSS-14, HJ-OSS-15, HJ-OSS-16, HJ-OSS-18, HJ-OSS-19                   |
| FR-DAT / lifecycle and privacy, including FR-DAT-09 | HJ-OSS-07, HJ-OSS-08, HJ-PRV-02, HJ-PRV-11, HJ-PRV-12, HJ-OPS-06        |
| Garage Band preview                                 | HJ-GB-01 through HJ-GB-04                                               |
| Operational safety/fairness                         | HJ-OSS-20, HJ-OPS-04, HJ-OPS-05, HJ-OPS-07                              |
| NFR security and supply chain                       | HJ-GOV-02, HJ-OSS-01, HJ-OSS-08 through HJ-OSS-12, HJ-OPS-01, HJ-OPS-05 |
| NFR reliability and recovery                        | HJ-OSS-11, HJ-OPS-02 through HJ-OPS-04, HJ-OPS-06                       |
| NFR-OBS-01/02 / telemetry and alerting              | HJ-OSS-11, HJ-PRV-06, HJ-OPS-04, HJ-OPS-05                              |
| NFR performance and preview proof                   | HJ-OPS-04, HJ-OPS-05, HJ-OPS-07                                         |
| NFR-ACC-01 / NFR-COM-01                             | HJ-PRV-08, HJ-PRV-09, HJ-OSS-15, HJ-OPS-01                              |

## Definition of issue-plan completion

This plan is complete only when:

- every stable ID has a real link or an explicit approved cancellation;
- dependency changes are reflected here and in HJ-EPIC;
- each acceptance outcome has attached test, document, deployment, or preview
  evidence;
- public and private epics agree on phase/gate status;
- deferred commerce remains outside MVP implementation; and
- closing HJ-EPIC points to the private-preview report and next-phase decision.
