# Hosted Jasper product requirements document

Document state: **Accepted**
Version: **1.0**
Last updated: **2026-07-25**
Decision owner: Jasper product ownership
Technical owners: Jasper maintainers and Hosted Jasper maintainers
Source definition: [Hosted Jasper pack](README.md)

## 1. Purpose

This is the live source of product truth for Hosted Jasper. It defines the
customer, staff, operational, OSS, privacy, and quality requirements for the
limited free-preview MVP and indexes later work without committing the MVP to
commerce.

Changes to an accepted requirement must update its ID, rationale, acceptance
criteria, related design section, and affected issues. GitHub links sit beside
stable requirement and planning IDs rather than replacing them.

## 2. Executive requirement

Hosted Jasper must make the current controller/worker music product available to
an approved Discord guild without asking its members to provision applications,
copy tokens, operate Node, install media tools, run a database, manage storage,
or deploy updates.

It must do so by operating the same open Jasper data plane, keeping self-hosting
fully supported, and placing proprietary acquisition, accounts, membership,
staff operations, and future commerce in a separate private distribution.

## 3. Product principles

| ID   | Principle                         | Product consequence                                                                                                                                   |
| ---- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Open data plane                   | Commands, queues, playback, AFR, generic hosting and plugin contracts remain OSS                                                                      |
| P-02 | Consent over magic                | Required Discord approvals are explained, sequenced, observed, and resumable                                                                          |
| P-03 | Tenant safety before growth       | No shared-guild preview begins until isolation tests and default-deny policy pass                                                                     |
| P-04 | Controller is useful alone        | Missing workers mean transparent degraded capacity, not failed installation                                                                           |
| P-05 | No customer secrets               | Provider credentials never enter a browser, Discord command, support ticket, or customer log                                                          |
| P-06 | Operations are product            | Readiness, rollback, deletion, restore, support, and incident communication are MVP features                                                          |
| P-07 | No premature monetization         | All preview tenants receive the same product features; commerce is deferred                                                                           |
| P-08 | Provider neutrality               | Core changes are usable by an independent Jasper host and have local implementations                                                                  |
| P-09 | Least authority where enforceable | Customer, staff and workload identities are scoped; in-process Node plugins are explicitly trusted as full-process code until a future sandbox exists |
| P-10 | Honest boundaries                 | Hosted surfaces identify what is OSS, what is proprietary, and what Discord or media providers control                                                |

## 4. Personas and permissions

### 4.1 Customer roles

| Role           | Entry condition                                              | Allowed outcomes                                                                                                        |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Tenant owner   | First approved installer, with manageable-guild verification | Install/remove Jasper, transfer ownership, manage members and configuration, view tenant usage/status, request deletion |
| Tenant admin   | Invited by owner or admin under tenant policy                | Repair cat installations, manage configuration and members, view tenant usage/status                                    |
| Tenant viewer  | Invited by owner/admin                                       | Read tenant status, cat capacity, configuration, and usage                                                              |
| Discord member | Member of the installed guild                                | Use Jasper Discord commands according to guild command/channel permissions; no portal access by default                 |

The portal role is not inferred forever from a Discord server role. Installation
requires live `MANAGE_GUILD`; later portal access is an explicit, auditable
membership. An owner/admin can remove it. High-risk actions re-check session
freshness and, where applicable, current Discord authority.

### 4.2 Staff roles

| Role                   | Allowed outcomes                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Support read-only      | View redacted tenant/onboarding/runtime state and audit history                                       |
| Support operator       | Retry idempotent onboarding steps, resend observations, initiate safe diagnostics, never read secrets |
| DevOps engineer        | Manage releases, cells, drains, rollback, secret references, backup/restore operations                |
| Product operator       | Manage preview cohorts and view aggregated funnel/service metrics                                     |
| Security administrator | Manage staff roles, security policy, incident holds, and audited break-glass grants                   |

Staff authenticate through organization-managed OIDC with MFA. Customer Discord
OAuth sessions do not grant staff authority. Support impersonation is not in the
MVP; if introduced later it must be time-bound, visibly indicated, approved, and
audited.

## 5. Primary journeys

### 5.1 Acquisition to first playback

1. A visitor reads a concise explanation of Jasper, multi-cat playback, OSS
   provenance, preview status, permissions, privacy, and service limitations.
2. They request or redeem private-preview access and sign in with Discord.
3. The portal lists only guilds for which Discord reports sufficient management
   authority.
4. They choose one guild. The service creates or resumes one onboarding run.
5. The portal opens the controller application’s Discord authorization.
6. Jasper observes the controller joining and reports permissions/readiness.
7. The portal repeats that flow for each worker application, with a clear
   “continue with Jasper only” option.
8. The owner confirms safe defaults and activates the tenant.
9. The portal shows a ready state, capacity, and a first-command guide.
10. The first successful `/play` records the activation milestone without
    storing Discord message content.

### 5.2 Resume or repair

Returning to the same guild resumes the first incomplete idempotent step.
Already installed cats are never re-authorized unnecessarily. Missing
permissions, a removed cat, exhausted Discord session-start capacity, or a
degraded runtime produces a precise repair action and preserves completed work.

### 5.3 Member delegation

An owner invites an existing Hosted Jasper user to a scoped tenant role. The
invite is single-use and expiring. The recipient signs in with Discord, accepts,
and appears in the audit log. Removing a member invalidates that tenant access
without affecting their other tenants.

### 5.4 Removal and deletion

An owner requests removal, reauthenticates, sees the consequences, and confirms.
The control plane immediately marks the tenant deleting, stops admission-grant
renewal, and asks all provider cats to leave. It confirms runtime denial only
after acknowledgement or expiry of the last ≤60-second grant, then continues
the documented deletion workflow. A staff security hold can pause data erasure
but cannot silently reactivate service.

### 5.5 Staff recovery

A support operator searches by tenant ID or exact guild ID, sees redacted state,
and retries a safe step with an idempotency key. A DevOps engineer sees cell and
shard health, drains a release, promotes or rolls back an immutable digest, and
leaves an audit trail.

## 6. MVP functional requirements

Priority meanings: **Must** blocks the private preview; **Should** is expected
unless evidence justifies an explicit waiver; **Could** is opportunistic.

### 6.1 Marketing, access, and identity

| ID        | Priority | Requirement and acceptance                                                                                                                                                                                                                                                               |
| --------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-MKT-01 | Must     | A proprietary marketing site explains the controller/worker model, multi-cat consent, preview status, OSS/private boundary, exact enabled plugin/command inventory and self-hosted-only surfaces, required Discord permissions, support route, terms, and privacy notice before sign-in. |
| FR-MKT-02 | Must     | The primary call to action starts Discord OAuth or presents the approved-cohort path; unapproved users receive a truthful waitlist/invite state rather than a broken installer.                                                                                                          |
| FR-ID-01  | Must     | Customer auth uses Discord OAuth with `identify` and `guilds`, validates state and the confidential-client code exchange, rotates sessions, encrypts retained tokens, refreshes safely, and supports logout/revocation. PKCE is not assumed unless Discord documents support.            |
| FR-ID-02  | Must     | Guild selection includes only guilds the user can manage. The server revalidates authority for onboarding and destructive actions; browser claims are never trusted alone.                                                                                                               |
| FR-ID-03  | Must     | Customer sessions and staff sessions have distinct issuers, cookies, audiences, and authorization middleware.                                                                                                                                                                            |
| FR-ID-04  | Must     | Staff login uses configured OIDC, requires MFA at the identity provider, maps explicit roles, and fails closed when group/role claims are absent.                                                                                                                                        |
| FR-ACC-01 | Must     | Preview access is an auditable capacity cohort applying to the whole service, not a feature entitlement or paid plan. Every accepted tenant receives the same MVP feature set.                                                                                                           |

### 6.2 Tenant and membership

| ID        | Priority | Requirement and acceptance                                                                                                                                                                                                                                                              |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-TEN-01 | Must     | One hosted tenant maps to exactly one Discord guild in the MVP. `installationId` is immutable/globally unique; the guild association is immutable for that installation and unique among nonterminal/recoverable installations. Both are carried through every customer data operation. |
| FR-TEN-02 | Must     | The first verified installer becomes owner. Duplicate/replayed onboarding resolves to the existing tenant or reviewed recovery; it never creates a second provisioning/active/degraded/suspended/deleting tenant, and the 30-day recovery tombstone blocks re-onboarding.               |
| FR-TEN-03 | Must     | Owners and admins can invite, list, change, and remove customer members within role limits. Invitations are expiring, single-use, tenant-scoped, and audited.                                                                                                                           |
| FR-TEN-04 | Must     | Every API handler, query, object key, job, event, log access, and dashboard view derives tenant scope from an authenticated authorization decision, never a client-provided tenant ID alone.                                                                                            |
| FR-TEN-05 | Should   | Ownership transfer requires reauthentication and acceptance by the new owner, preserves at least one owner, and records both actors.                                                                                                                                                    |

### 6.3 Guided Discord installation

| ID        | Priority | Requirement and acceptance                                                                                                                                                                                                                                                                                                                             |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-ONB-01 | Must     | One resumable onboarding run records durable step state, attempts, observations, errors, actor, and timestamps. Retrying any step is idempotent.                                                                                                                                                                                                       |
| FR-ONB-02 | Must     | Each controller/worker authorization URL is generated from a server-side immutable application-catalog revision with the intended application ID, scopes, permissions, guild hint, and disabled guild selection where safe. The run/action pins that revision; rotation drains, explicitly migrates, or invalidates it rather than silently remapping. |
| FR-ONB-03 | Must     | The portal never claims installation from a browser redirect alone. The hosted runtime observes guild membership/readiness and the control plane matches that observation to the onboarding run.                                                                                                                                                       |
| FR-ONB-04 | Must     | The controller is required. Each worker is independently observed and may be installed later. The tenant may activate in explicit `degraded` state with controller-only capacity.                                                                                                                                                                      |
| FR-ONB-05 | Must     | Verification reports application identity, guild presence, required channel/guild permissions, gateway readiness, and current capacity without returning tokens.                                                                                                                                                                                       |
| FR-ONB-06 | Must     | The flow resumes after browser close, Discord cancellation, duplicate callbacks, runtime restart, or delayed gateway observation. A safe retry never removes a successfully installed cat.                                                                                                                                                             |
| FR-ONB-07 | Must     | Removing a provider bot or required permission after activation changes status within the observation target, reduces available capacity, and offers a repair link.                                                                                                                                                                                    |
| FR-ONB-08 | Should   | Median service-controlled elapsed time from guild selection to `ready` is no more than 5 minutes in the preview cohort, excluding Discord consent time. Complete user wall-clock, dwell and abandonment are also reported for each application consent and for the whole run.                                                                          |
| FR-ONB-09 | Must     | Guild selection creates a unique `provisioning` reservation, not active service. Runs expire after 7 days of inactivity: empty reservations release; observed cats stay denied and leave unless a verified manager recovers the run.                                                                                                                   |
| FR-ONB-10 | Must     | A provider cat invited without a matching run is quarantined, cannot execute commands, and leaves after 15 minutes unless a fresh `MANAGE_GUILD` user claims it through normal onboarding.                                                                                                                                                             |

### 6.4 Jasper runtime behavior

| ID        | Priority | Requirement and acceptance                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-RUN-01 | Must     | Worker configuration uses an explicit application catalog/secret reference. No unrelated `_TOKEN` environment variable can become a Discord login. Tokens are absent from plugin-facing state and logs.                                                                                                                                                                                                                             |
| FR-RUN-02 | Must     | A cat has at most one active/retained voice lease per guild and may hold leases in different guilds concurrently. Allocation and release are keyed by immutable installation ID, guild, cat, channel, and generation so stale work from a purged install cannot affect a reinstall.                                                                                                                                                 |
| FR-RUN-03 | Must     | AFR preserves channel reuse, configured Jasper weighting, random eligible-worker choice, and controller fallback within each guild. It filters membership, readiness, visibility, `Connect`, and `Speak`, and retries another eligible cat after a selection failure.                                                                                                                                                               |
| FR-RUN-04 | Must     | Commands, queues, status, resets, stats, plugins, assets, and persisted product records are installation-scoped with guild correlation. No guild command can inspect or destroy another installation’s work, including data from an earlier install of the same guild.                                                                                                                                                              |
| FR-RUN-05 | Must     | DMs and guilds without an admitted installation are rejected before any Discord side effect, announcement, autocomplete/component handler, hook, task, queue, media, or plugin work begins. Hosted new work also requires a current installation admission grant valid for at most 60 seconds; provisioning, suspended, deleting, revoked, or expired-grant tenants cannot start work.                                              |
| FR-RUN-06 | Must     | Hosted releases publish a stable global command set in a dedicated idempotent release job. Sandbox builds can publish guild commands. Runtime startup and tenant toggles do not mutate global definitions.                                                                                                                                                                                                                          |
| FR-RUN-07 | Must     | The hosted profile disables the legacy core OAuth/session routes, global dashboard, DevTools, customer plugin upload, and unauthenticated operational endpoints.                                                                                                                                                                                                                                                                    |
| FR-RUN-08 | Must     | All provider applications use aligned shard count and shard IDs. One stable environment/shard lease atomically owns the complete controller/worker set and fences by epoch, boot, catalog revision, and expiry; one process per guild with duplicate tokens is prohibited.                                                                                                                                                          |
| FR-RUN-09 | Must     | The runtime publishes `live`, `ready`, `degraded`, and `draining` signals. Controller failure makes it unready; worker loss can be degraded when controller service remains safe.                                                                                                                                                                                                                                                   |
| FR-RUN-10 | Must     | A drain rejects new playback, lets finite active queues finish within a configured bound, reports remaining work, and force-stops endless/radio or over-time queues at an explicit timeout within the orchestrator termination grace.                                                                                                                                                                                               |
| FR-RUN-11 | Should   | Shared content-addressed cache hits may cross tenants only when source content is public and the cache exposes no tenant metadata. Customer uploads and derived private assets never cross namespaces.                                                                                                                                                                                                                              |
| FR-RUN-12 | Must     | MVP queue/player/voice contents are explicitly ephemeral: graceful drain preserves bounded finite work, while crash, forced drain, or fence loss may interrupt playback and drop in-memory queues. A minimal durable non-resumable active-work marker supports a best-effort installation-scoped interruption outcome without replaying tracks. Playlists, configuration, installation state, and completed history remain durable. |

### 6.5 Configuration and customer dashboard

| ID         | Priority | Requirement and acceptance                                                                                                                                                                                                                                                           |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-CFG-01  | Must     | Tenant configuration is schema-versioned, validated, revisioned, auditable, and applied idempotently. The data plane reports its last accepted revision.                                                                                                                             |
| FR-CFG-02  | Must     | MVP settings cover only proven safe controls: enabled channels if supported, controller AFR weight, allowed worker set, and documented playback/queue safety limits. Unsupported settings do not appear.                                                                             |
| FR-PORT-01 | Must     | The customer portal shows installation state per cat, effective capacity, runtime status, configuration revision, members, recent tenant-scoped usage, repair/removal actions, and the release-backed enabled/disabled plugin/command inventory including self-hosted-only surfaces. |
| FR-PORT-02 | Must     | Portal errors distinguish customer action, Discord action, upstream-media failure, provider incident, and retryable delay without exposing stack traces, tokens, URLs containing credentials, or another tenant’s identifiers.                                                       |
| FR-PORT-03 | Should   | The portal meets WCAG 2.2 AA for the onboarding and tenant-management critical paths and works on current mobile and desktop browsers.                                                                                                                                               |

### 6.6 Staff and support

| ID        | Priority | Requirement and acceptance                                                                                                                                                  |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-OPS-01 | Must     | Staff search returns only fields allowed by role. OAuth tokens, bot tokens, cookie content, raw uploaded media, and database credentials are never viewable.                |
| FR-OPS-02 | Must     | Every staff mutation records actor, role, tenant/cell target, request ID, reason, before/after safe fields, result, and time in append-only audit storage.                  |
| FR-OPS-03 | Must     | Support operators may retry only named idempotent actions. Release, secret, restore, purge, and role changes require their dedicated higher role.                           |
| FR-OPS-04 | Must     | The staff console exposes tenant onboarding, cat observations, config convergence, cell/shard readiness, deployment digest, queue counts, and linked redacted logs/metrics. |
| FR-OPS-05 | Should   | A documented break-glass path is time-bound, separately approved where feasible, alerts security ownership, and produces an immutable record.                               |

### 6.7 Plugin and OSS hosting contract

| ID        | Priority | Requirement and acceptance                                                                                                                                                                                                 |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-PLG-01 | Must     | The private runtime integration is a Jasper plugin using public contracts; private code does not patch core or import undocumented internals.                                                                              |
| FR-PLG-02 | Must     | Hosted production loads only build-time allowlisted, compatibility-checked, integrity-verified plugins. Disabled/test plugins are absent from the image and command manifest; browser users cannot upload executable code. |
| FR-PLG-03 | Must     | Plugin routes declare schema, principal policy, guild-context requirement, and response contract. Default policy is deny. Fastify encapsulation is not represented as a code sandbox.                                      |
| FR-PLG-04 | Must     | Plugin hooks, tasks, commands, and route ownership can be deactivated/disposed so no stale handler executes. Collisions fail deterministically without overwriting a core command.                                         |
| FR-PLG-05 | Must     | Exported artifacts include the complete backend bundle/module tree, frontend, assets, manifest, compatibility range, content hashes, and provenance. An install-and-boot smoke test verifies the artifact.                 |
| FR-OSS-01 | Must     | Jasper publishes a core OCI image and tested single-instance Compose path using local/self-hosted providers, with no private repository required.                                                                          |
| FR-OSS-02 | Must     | Public documentation covers explicit controller/worker applications, migrations, secrets, health, command publication, backup, restore, upgrade, rollback, and a provider-neutral orchestration contract.                  |
| FR-OSS-03 | Must     | Every hosted-required core capability has a self-hosted default and automated regression coverage. The existing PM2/manual path remains documented while supported.                                                        |

### 6.8 Data lifecycle and privacy

| ID        | Priority | Requirement and acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-DAT-01 | Must     | Public data-plane and private control-plane PostgreSQL schemas use separate owners, credentials and independently locked/checksummed migrations orchestrated in declared expand-contract order. SQLite remains supported for self-hosted shared behavior.                                                                                                                                                                                                                            |
| FR-DAT-02 | Must     | Data-plane object keys begin with immutable `installationId`; private control-plane objects may use its opaque tenant UUID. Neither uses a raw guild/name as ownership. Access uses short-lived server-side credentials or signed URLs with bounded scope and lifetime.                                                                                                                                                                                                              |
| FR-DAT-03 | Must     | The service publishes a data inventory, purpose, retention, subprocessors, deletion behavior, and contact route before external preview onboarding.                                                                                                                                                                                                                                                                                                                                  |
| FR-DAT-04 | Must     | Tenant removal immediately records `deleting`, denies control-plane operations, stops admission-grant renewal, and schedules durable deletion. Runtime denial is confirmed only after revocation acknowledgement or expiry of the last ≤60-second grant; the portal shows the intervening revocation stage. The preview policy uses a configurable 30-day recovery window, after which tenant records and private objects are purged; legal/security holds are explicit and audited. |
| FR-DAT-05 | Must     | Backups inherit encryption and retention policy. A deletion tombstone prevents a deleted tenant from being silently restored into active service.                                                                                                                                                                                                                                                                                                                                    |
| FR-DAT-06 | Must     | Product analytics records funnel events and aggregate service outcomes, not Discord message content or unneeded raw media URLs. Identifiers are minimized and access-controlled.                                                                                                                                                                                                                                                                                                     |
| FR-DAT-07 | Must     | Remote media and upload handling enforces scheme and destination policy, private-network denial, redirects, timeouts, byte limits, MIME inspection, quotas, filename safety, and malware-policy review.                                                                                                                                                                                                                                                                              |
| FR-DAT-08 | Must     | Runtime core credentials cannot read control-plane identity/session/audit records; control-plane services do not query Jasper tables directly. Durable restore covers both database domains, tenant objects, config/catalog and an independently retained deletion-tombstone ledger.                                                                                                                                                                                                 |
| FR-DAT-09 | Must     | Every tenant-owned core/plugin row and object carries immutable `installationId` scope in addition to Discord guild correlation, so deletion/reinstall or ownership recovery cannot resurrect an earlier installation’s data.                                                                                                                                                                                                                                                        |

## 7. Non-functional requirements

| ID          | Area          | MVP requirement                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-SEC-01  | Isolation     | Automated negative tests cover horizontal and vertical tenant access for API, database, object storage, Discord commands, jobs, logs, metrics links, and plugin routes; any failure blocks deployment.                                                                                                                                                                                                                   |
| NFR-SEC-02  | Secrets       | Bot/OAuth/database/storage/signing secrets are referenced from a managed secret store, encrypted in transit/at rest, rotatable, redacted, and unavailable to customer code or responses.                                                                                                                                                                                                                                 |
| NFR-SEC-03  | Supply chain  | Images and plugin artifacts are immutable, dependency-locked, scanned, signed/attested with SBOM and provenance, verified at deployment, and promoted by one environment-independent signed release manifest plus a signed per-environment deployment envelope. yt-dlp and FFmpeg are pinned and verified at build time. Scan waiver thresholds and approvers are explicit.                                              |
| NFR-SEC-04  | Network       | Public, customer, staff, and workload endpoints use distinct auth policies. Runtime control is outbound or mutually authenticated; databases and operational endpoints are not public.                                                                                                                                                                                                                                   |
| NFR-REL-01  | Availability  | Proposed monthly targets are successful scheduled authenticated control-plane canary probes ÷ all scheduled probes ≥99.5%, and ready assigned-shard minutes ÷ expected service assigned-shard minutes ≥99.0%. Report fleet, cell and tenant-impact minutes. Discord-wide incidents are classified and reported separately, not silently removed; announced excluded maintenance is reported and capped at 2 hours/month. |
| NFR-REL-02  | Recovery      | Rollback to the previous compatible signed release manifest through a verified environment deployment envelope completes within 10 minutes. Both control-plane and Jasper data-plane PostgreSQL plus tenant-owned objects have proposed RPO ≤15 minutes and RTO ≤4 hours; config/catalog and external deletion tombstones are recoverable and verified before preview.                                                   |
| NFR-REL-03  | Convergence   | Guild join/remove observations and configuration changes normally appear in the portal within 15 seconds and alert after 60 seconds without convergence.                                                                                                                                                                                                                                                                 |
| NFR-PERF-01 | Interactions  | At least 99% of interactions received by a ready runtime are acknowledged within Discord’s required response window.                                                                                                                                                                                                                                                                                                     |
| NFR-PERF-02 | Playback      | At least 95% of supported first-track attempts on an idle, available channel reach audio within 15 seconds. Ordinary valid enqueues behind active tracks are measured as queue acceptance and later queue wait, not failed starts; unsupported/blocked upstream media is classified separately.                                                                                                                          |
| NFR-PERF-03 | Portal        | Authenticated portal API p95 latency is ≤500 ms for non-Discord/non-media operations under the validated preview load.                                                                                                                                                                                                                                                                                                   |
| NFR-PERF-04 | Fairness      | Per-installation command, queue, playback, extraction, download and upload limits plus cell/global provider budgets prevent one tenant from exhausting shared capacity; safety limits are distinct from product entitlements.                                                                                                                                                                                            |
| NFR-OBS-01  | Telemetry     | Logs are structured with request/event, cell, shard, application, guild/tenant-safe correlation, and release IDs; metrics avoid raw guild/user labels in high-cardinality backends.                                                                                                                                                                                                                                      |
| NFR-OBS-02  | Alerting      | Alerts cover controller readiness, worker capacity, gateway limits, command failures, playback start failures, extraction health, database pool/migrations, object errors, observation lag, outbox lag, and deployment convergence.                                                                                                                                                                                      |
| NFR-ACC-01  | Accessibility | Critical marketing, sign-in, onboarding, repair, member, and deletion flows pass automated checks and manual keyboard/screen-reader review against WCAG 2.2 AA.                                                                                                                                                                                                                                                          |
| NFR-COM-01  | Transparency  | Hosted release metadata names the exact public Jasper commit and private distribution version. Public docs disclose supported operating profiles and known limitations.                                                                                                                                                                                                                                                  |

The reliability numbers are private-preview objectives subject to review. They
are not a public SLA.

## 8. Onboarding state model

The canonical product states are:

```text
access-approved
  → guild-selected
  → provisioning
  → controller-authorizing
  → controller-observed
  → workers-authorizing
  → verifying
  → configuring
  → ready
  → completed

cancelled or inactive for 7 days
  → expired
  → reservation release or quarantined-cat cleanup
```

Service states are `provisioning`, `active`, `degraded`, `suspended`, `deleting`,
and `deleted`. `degraded` retains known-safe service. `provisioning`,
`suspended`, and `deleting` deny new work. A failed attempt is recorded on a
step; “failed” is not a terminal tenant state because the journey is resumable.

State transitions are server-authoritative, append an event, update the
materialized run in one transaction, and use a compare-and-set version.
Detailed mechanics are in the [MVP design](mvp-design.md).

## 9. Launch gates

### 9.1 Entry to employee/sandbox testing

- Public core and private repository CI are green.
- The runtime uses explicit worker identities and least-privilege intents.
- Global destructive/status commands are installation-scoped and guild
  authorized.
- Hosted profile exposes no legacy dashboard, DevTools, plugin upload, or public
  operational API.
- Tenant-isolation and SSRF/upload negative suites pass.
- A sandbox guild completes controller and worker onboarding twice, including
  removal and repair.

### 9.2 Entry to real-guild private preview

- Discord application ownership, install links, permissions, verification
  trajectory, and secret rotation are documented.
- Immutable promotion, migration, readiness, drain, rollback, backup, and
  restore drills pass.
- Threat model, privacy notice, terms/media-platform review, incident runbook,
  and deletion runbook are approved.
- Staff OIDC/RBAC and mutation audit are operating.
- The release manifest, portal, first-command guide, and marketing copy agree on
  the exact enabled plugin/command inventory and clearly label disabled or
  self-hosted-only plugin web surfaces.
- At least one controller-only and one full-cat failure drill passes.
- No unresolved severity-0 or severity-1 security/data-loss defect.

### 9.3 MVP completion

- At least 10 consented real guilds complete onboarding.
- At least 3 install every available cat.
- At least 1,000 playback starts occur over a 14-day soak.
- Before the controlled run, freeze a numeric target from the approved catalog
  and declared topology across at least 5 guilds:
  `min(20, planned cat slots in that topology)`. The topology uses enough
  full-cat guilds to target 20 whenever the catalog and 10-guild cohort permit;
  a missing/unready cat fails the gate rather than lowering the target.
- Median onboarding is no more than 5 minutes excluding Discord consent time.
- NFR interaction and playback objectives pass.
- No cross-tenant disclosure occurs.
- Previous-compatible-release rollback and complete durable-state restore are
  repeated successfully during the preview.
- Pilot owners complete structured feedback on value, consent clarity,
  reliability, and willingness to continue.

## 10. Product measurement

### Funnel

`landing_view → oauth_started → authenticated → access_approved →
guild_selected → controller_observed → first_worker_observed → ready →
first_command → first_playback`

Measure completion and elapsed time at each transition, including total
wall-clock time and dwell/abandonment for each Discord application consent.
Do not put Discord message content, OAuth tokens, media search text, or raw
credentials in product analytics.

### Quality and value

- Ready tenants and degraded tenants.
- Installed/ready cats per tenant.
- Command acknowledgements and categorized failures.
- Supported playback attempts, starts, time-to-audio, and failure class.
- Concurrent voice leases by cell and aggregate cohort.
- AFR selection distribution by cat role without public tenant labels.
- Week-one returning guilds and active days.
- Onboarding abandon/retry/repair rates.
- Support contacts and time to resolution.
- Removal/deletion requests and completion.

### Guardrails

- Cross-tenant authorization test failures.
- Staff denied-action and break-glass events.
- Secret/redaction scanner findings.
- SSRF/private-network blocks and upload quota violations.
- Discord gateway session-start budget and rate limits.
- Cell saturation and tenant noisy-neighbor indicators.
- Backup age and last successful restore exercise.

## 11. Feature index

The ownership column describes source/operating boundary, not feature quality.

### Short term: definition through limited preview

| Feature                                         | Ownership                               | Target phase |
| ----------------------------------------------- | --------------------------------------- | ------------ |
| Per-guild worker leases and AFR                 | OSS core                                | MVP          |
| Explicit cat/application catalog                | OSS interface + private secret provider | MVP          |
| Guild installation/access context               | OSS core + private policy adapter       | MVP          |
| Global/release command publisher                | OSS core                                | MVP          |
| Versioned DB migrations and installation scope  | OSS core                                | MVP          |
| Tenant storage and safe remote media contract   | OSS core/providers                      | MVP          |
| Authenticated typed plugin routes and lifecycle | OSS plugin SDK                          | MVP          |
| Health/readiness/degraded/drain/shard contract  | OSS core                                | MVP          |
| Deterministic plugin artifact and OCI build     | OSS build                               | MVP          |
| Compose and independent-host guide              | OSS docs/artifacts                      | MVP          |
| Hosted runtime adapter                          | Private plugin                          | MVP          |
| Discord login, cohort, tenant and membership    | Private control plane                   | MVP          |
| Resumable multi-cat onboarding                  | Private control plane/portal            | MVP          |
| Customer portal                                 | Private                                 | MVP          |
| Staff SSO/RBAC/audit console                    | Private                                 | MVP          |
| Marketing and acquisition funnel                | Private                                 | MVP          |
| Free entitlement resolver and safety quotas     | OSS interface + private implementation  | MVP          |
| Immutable one-region deployment and recovery    | Private ops, public contract            | MVP          |
| Real-guild preview and stress program           | Joint                                   | MVP          |

### Medium term: public beta and commercial readiness

| Feature                                                           | Ownership                           | Earliest phase                  |
| ----------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| Scaled shard/cell placement and automated capacity                | OSS contract + private orchestrator | Public beta                     |
| Higher availability control plane and regional disaster recovery  | Private                             | Public beta                     |
| Customer notifications, maintenance, richer support               | Private                             | Public beta                     |
| Self-service waitlist/admission and abuse controls                | Private                             | Public beta                     |
| Data export, advanced privacy controls, formal DPA/subprocessors  | Private + public formats            | Public beta                     |
| Usage metering with reconciliation                                | OSS events + private ledger         | Commercial readiness            |
| Plans, trials, checkout, invoices, tax and subscription lifecycle | Private                             | Commercial launch               |
| Provider-neutral entitlement decisions at execution boundaries    | OSS interface                       | Commercial launch               |
| Premium Garage Band capabilities using tenant-safe contracts      | Private plugin                      | After commercial foundation     |
| Authenticated realtime extension transport                        | OSS contract if justified           | After horizontal fan-out design |

### Long term: hosting and ecosystem platform

| Feature                                              | Ownership                                   | Earliest phase  |
| ---------------------------------------------------- | ------------------------------------------- | --------------- |
| Multi-region tenant placement and migration          | OSS contract + private orchestrator         | Scale phase     |
| Region/data-residency selection                      | Private product + public placement metadata | Scale phase     |
| Independent provider distribution reference          | OSS                                         | Scale phase     |
| Bring-your-own-bot/application profile               | OSS + private optional product              | Scale phase     |
| Untrusted third-party plugin isolation/marketplace   | OSS sandbox contract + separate commerce    | Ecosystem phase |
| Fine-grained Discord/DJ policy and delegated config  | OSS + private portal                        | Ecosystem phase |
| Realtime collaborative playlists                     | Garage Band/private, over generic transport | Ecosystem phase |
| Safe realtime mixing with capacity tiers             | OSS audio + future entitlements             | Ecosystem phase |
| Provider federation or portable tenant export/import | OSS formats/protocol                        | Ecosystem phase |

## 12. Explicitly deferred decisions

These are not unanswered MVP requirements; they are later decisions with defined
prerequisites:

- Payment processor: decide only after usage metering, legal entity/tax scope,
  target countries, refund policy, and preview economics exist.
- Plan catalog and prices: decide from observed resource cost and customer value,
  not from current issue #98.
- Trial duration: decide after onboarding and retention baselines; access cohorts
  remain operational until then.
- Multi-region provider: decide after the one-region cell and backup/restore
  contract is proven.
- Realtime transport: decide after tenant auth and horizontal fan-out semantics
  are specified; do not add process-local WebSockets first.
- Untrusted plugins: decide after a sandbox threat model; current Node plugins
  remain trusted operator code.

See [future phase briefs](future-phases.md) for the entry criteria and required
design work.

## 13. Dependencies and external approvals

- Ownership and configuration of the controller and every worker Discord
  application.
- Discord application verification and intent approval planning as the service
  approaches scale thresholds.
- The private
  [`purrfectsoft/jasper-hosted`](https://github.com/purrfectsoft/jasper-hosted)
  repository and appropriate private-repo governance. GitHub Free does not
  provide private-repo branch protection/rulesets.
- Jasper repository admin help for new Actions environments, secrets, rules, or
  GitHub App grants; the active contributor has write but not admin.
- Terms/privacy and upstream media-platform review before real-guild preview.
- A managed secret store, PostgreSQL, object store, observability backend, and
  one-region runtime environment selected during implementation.

## 14. Requirement traceability

- Current limitations and evidence: [current-state audit](current-state-audit.md)
- Public/private and plugin decision: [plugin feasibility](plugin-feasibility.md)
- Technical realization: [MVP design](mvp-design.md)
- Filed issue ownership and dependencies: [MVP issue plan](mvp-issue-plan.md)
- Deferred designs and triggers: [future phases](future-phases.md)

## 15. Change log

| Version | Date       | Change                                                                     |
| ------- | ---------- | -------------------------------------------------------------------------- |
| 0.1     | 2026-07-24 | Initial audited definition for review; no issues filed                     |
| 1.0     | 2026-07-25 | Accepted definition; filed 50 stable IDs and incorporated final review fix |
