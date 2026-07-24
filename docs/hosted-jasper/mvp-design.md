# Hosted Jasper MVP technical design

Design status: **Draft / review required**
Implements: [Hosted Jasper PRD](prd.md)
Boundary decision: [Private-plugin feasibility](plugin-feasibility.md)
Issue mapping: [MVP issue plan](mvp-issue-plan.md)

## 1. Design outcome

The MVP adds a provider-operated, logically multi-tenant operating profile to
Jasper without creating a private fork:

- one open Jasper data-plane image;
- one private hosted distribution image containing a trusted runtime adapter;
- one independently deployed private control plane, job worker, customer portal,
  staff console, and marketing site;
- provider-owned controller and worker applications;
- one active aligned shard cell for the limited cohort;
- PostgreSQL for durable metadata and S3-compatible storage for private assets;
  and
- no billing or paid feature gate.

Customers perform only Discord sign-in, server selection, explicit Discord
application authorizations, and optional preferences.

## 2. Constraints and preserved behavior

### 2.1 Product invariants

1. The Jasper controller remains a playback-capable AFR participant.
2. The cat already serving a guild/channel is reused.
3. `AFR_JASPER_WEIGHT` semantics remain a controller preference in the range
   0–1; worker selection remains randomized among eligible cats.
4. Controller fallback remains available when workers cannot serve.
5. Multiple cats may play in different channels of one guild.
6. The same cat application may play in one channel in each of several guilds.
7. A self-hosted operator can run one controller with zero or more workers using
   local SQLite or PostgreSQL.
8. Existing commands remain the user-facing Discord control plane unless a
   requirement explicitly changes them.

### 2.2 External constraints

- A Discord authorization URL names one application. The controller and every
  worker require separate consent.
- Server installation requires a user with `MANAGE_GUILD`.
- Bot authorization may complete without an application callback, so browser
  navigation is not authoritative proof of installation.
- A bot application may hold one voice connection per guild. discord.js voice
  connection groups separate different bot applications.
- Discord deterministically maps a guild to a gateway shard. Discord permits
  applications to use different shard counts; Jasper deliberately requires one
  aligned count and co-located shard ID across its cat applications.
- Global commands are a release surface; guild commands are the immediate
  sandbox surface.
- Current Jasper plugins are trusted Node code, not sandboxes.

## 3. System context

```text
┌──────────────────────────────── proprietary ────────────────────────────────┐
│                                                                            │
│  Marketing          Customer portal                 Staff console          │
│      │                     │                              │                 │
│      └──────────────┬──────┴──────────────────────────────┘                 │
│                     ▼                                                       │
│            Control-plane API ───── control-plane worker                    │
│              │       │                       │                              │
│              │       ├── PostgreSQL          ├── notifications             │
│              │       ├── object storage      └── outbox/tasks              │
│              │       └── secret/KMS and staff/customer identity            │
│              │                                                             │
│              │ workload-authenticated observations / desired state         │
│              ▼                                                             │
│        Hosted runtime adapter plugin                                        │
└──────────────┬─────────────────────────────────────────────────────────────┘
               │ public, versioned Jasper contracts
┌──────────────▼──────────────── open Jasper ────────────────────────────────┐
│ installation policy → commands → queues → per-guild AFR leases → voice     │
│ plugin/runtime contracts     DB/storage providers      health and metrics  │
└──────────────┬─────────────────────────────────────────────────────────────┘
               ▼
       Discord controller and worker applications
```

### Trust boundaries

1. Public browser to proprietary web edge.
2. Customer Discord identity to tenant authorization.
3. Staff OIDC identity to privileged operational authorization.
4. Control plane to a fenced runtime workload.
5. Trusted hosted plugin to open core.
6. Guild A to guild B within a shared process, database, and object store.
7. Jasper to Discord, media providers, and arbitrary user-supplied URLs.
8. Build system to immutable runtime and plugin artifacts.

Every boundary has a distinct identity and a default-deny policy. Fastify plugin
encapsulation is not one of these trust boundaries.

### Bootstrap order and provider boundary

The ordinary plugin lifecycle starts after Discord clients log in today. It
cannot safely supply credentials needed before client creation, and it must not
leave an admission gap while the hosted policy plugin loads. The MVP bootstrap
is:

1. load and validate `RuntimeProfile` and `RuntimeIdentity`;
2. read controller/worker identities from a public file/secret-file provider
   materialized by the orchestrator;
3. initialize the guild access registry to an immutable deny-all provider;
4. preflight data-plane schema compatibility and verify all allowlisted plugin
   artifacts without executing plugin lifecycle code;
5. atomically acquire and begin renewing the complete aligned shard-set lease;
   the lease value pins the validated catalog revision and complete application
   set, and lease failure starts no Discord client;
6. open only minimal liveness, create clients, attach the admission guard, and
   log in only while that lease is current;
7. load the already-verified build-time allowlisted plugins;
8. let the required hosted adapter register policy, lifecycle and health
   providers, then reconcile the already-connected guild caches;
9. become ready and admit interactions only after policy/config convergence.

If the hosted plugin fails, Discord clients may be connected but every guild
interaction remains denied and readiness remains false. Guild observations that
arrive before adapter readiness are buffered with a bound and followed by a
complete cache reconciliation, so onboarding never depends on one transient
`guildCreate`.

Platform-specific secret retrieval, if needed, is an early bootstrap adapter
behind the public worker-provider contract—not an ordinary Jasper plugin. The
lean default is a mounted catalog plus one mounted token file per application.

## 4. Runtime topology and Discord sharding

### 4.1 MVP topology

The first data-plane environment runs one **runtime cell**. The cell owns shard
0 of 1 for the controller and every provider worker application:

```text
runtime cell preview-0
  controller app: shard 0/1
  worker Misty:   shard 0/1
  worker ...:     shard 0/1
```

Because each application uses the same shard count, a guild hashes to the same
cell for every cat. The cell serves many guilds in one process while keeping
worker leases per guild.

Jasper admits one atomic owner of the aligned shard set keyed by the stable
`(environment, shard_id)`. The compare-and-set protected lease value contains
the shard count, immutable application-catalog revision, complete
controller/worker application ID set, epoch, holder/boot identity, and expiry.
Changing catalog metadata cannot create a second lease namespace; partial
application-set acquisition starts no client. Discord can permit overlapping
sessions during a handoff, so the one-owner rule is Jasper’s correctness
invariant rather than a Discord-enforced lock.

An orchestrator-backed shard lease has a 30-second monotonic deadline, a
10-second renewal target, and an epoch/fencing token. A new epoch is not admitted
until the prior deadline plus the configured clock/network safety margin. Each
interaction checks local lease validity; expiry immediately makes the runtime
unready, denies new work, drains/disconnects clients, and rejects tasks even if a
policy cache is still fresh. A cold start or restart always acquires a new
lease.

Running an unsharded process per customer with shared provider tokens is
forbidden.

### 4.2 Scaling trigger

Before Discord’s mandatory 2,500-guild-per-shard ceiling—and at a lower
internally measured capacity threshold—the provider raises a common shard count
for **every** cat application and assigns shard IDs to cells. The cutover design
must use one environment-wide topology lock/cutover protocol so old and new
shard-count generations cannot be admitted together. It must also account for
Discord identify concurrency and session-start budget.

CPU, memory, event-loop delay, active voice connections, extraction concurrency,
and interaction latency may trigger sharding earlier than guild count.

### 4.3 Availability consequence

Jasper forbids two admitted replicas for the same complete aligned shard set.
The MVP prioritizes fenced correctness and bounded recovery over claiming
seamless gateway failover. Deployment:

1. marks the shard draining;
2. rejects new queues;
3. waits for active voice leases up to the approved bound;
4. stops the old owner;
5. starts the new digest and acquires a higher epoch;
6. verifies controller and plugin readiness; and
7. resumes admission.

A warm image/node may exist, but Jasper does not admit it with the same shard
until ownership transfers. Network-partition tests cover delayed renewal,
expired local deadlines, late heartbeats and a replacement attempting a higher
epoch.

## 5. Open core contracts

Names below specify responsibility. Final TypeScript names may change during
review, but the boundary may not.

### 5.1 Runtime profile

```ts
type RuntimeProfile = 'self-hosted' | 'hosted';

interface RuntimeIdentity {
    profile: RuntimeProfile;
    environment: string;
    release: string;
    bootId: string;
    cellId?: string;
    shardId: number;
    shardCount: number;
    applicationCatalogRevision: number;
    fenceEpoch?: number;
}
```

The profile chooses providers and closes unsafe surfaces; it does not scatter
`if (hosted)` product feature gates through commands.

`bootId` is a new random UUID for every process start. Runtime observations are
deduplicated by `(cellId, fenceEpoch, bootId, sequence)` so a restarted
producer’s sequence cannot collide with its previous boot.

### 5.2 Worker identity catalog

```ts
interface WorkerIdentity {
    id: string;
    displayName: string;
    applicationId: string;
    role: 'controller' | 'worker';
    secretRef: string;
}

interface WorkerIdentityProvider {
    list(): Promise<readonly WorkerIdentity[]>;
    resolveToken(secretRef: string): Promise<string>;
}

interface WorkerPublicState {
    id: string;
    displayName: string;
    applicationId: string;
    ready: boolean;
}
```

Only the internal client factory sees resolved tokens. Plugin, API, log, metric,
and dashboard contracts receive `WorkerPublicState`.

Self-hosted configuration accepts an explicit catalog file and/or namespaced
variables such as `JASPER_WORKER_MISTY_TOKEN`; current bare `MISTY_TOKEN` style
gets one documented deprecation window. Arbitrary `*_TOKEN` discovery is
removed.

In hosted operation, infrastructure materializes the validated catalog and
token files from the platform secret store before the process starts; the
public bootstrap provider reads only those files. The ordinary hosted plugin
does not provide or receive bot credentials. The control-plane application
catalog separately contains customer-safe install metadata and never bot
tokens.

### 5.3 Guild installation and access

```ts
type InstallationState = 'provisioning' | 'active' | 'degraded' | 'suspended' | 'deleting';

interface GuildInstallationContext {
    guildId: string;
    installationId: string;
    state: InstallationState;
    configRevision: number;
    enabledWorkerIds: ReadonlySet<string>;
    enabledPluginIds: ReadonlySet<string>;
    jasperWeight: number;
}

interface GuildAccessPolicy {
    resolve(guildId: string): Promise<GuildInstallationContext | null>;
    mayStartWork(context: GuildInstallationContext): boolean;
}
```

Every Discord interaction resolves this context before command execution.
`null`, DMs, `provisioning`, `suspended`, and `deleting` fail safely. A
self-hosted local policy maps configured guilds to local installations and
requires no proprietary service.

The same guard covers autocomplete/components, plugin hooks/tasks, announcements,
queue/voice admission and every outbound guild side effect. Hosted startup
announcements are disabled or deferred until the target guild/channel resolves
an admitted installation; client login alone never authorizes a message.

The hosted adapter caches signed/authenticated last-known-good policies. During
a policy/config delivery outage, an **already valid shard owner** may admit new
work for at most 15 minutes by default. The authoritative 30-second shard lease
is separate and always wins: an expired lease stops admission immediately.
After policy expiry the valid owner fails closed for new work while allowing
bounded active work to drain.

### 5.4 Guild-scoped services

Database, plugin data, plugin files, owned media, logs, status, configuration,
and destructive operations accept a required scope object:

```ts
interface GuildScope {
    guildId: string;
    installationId: string;
}
```

Core does not use the private tenant UUID. The private control plane maps its
tenant to `installationId` and Discord guild. This keeps the public contract
provider-neutral.

Every tenant-owned core/plugin row and object is keyed by immutable
`installationId`; `guildId` is retained for Discord correlation, not ownership.
A deleted and later reinstalled guild receives a new installation ID and cannot
see prior plays, plugin KV/files or assets.

Global system operations use a separate operator-only interface; they cannot be
reached by passing a special guild ID.

### 5.5 Plugin SDK vNext

The plugin manifest declares:

- stable manifest ID and version;
- Jasper SDK range;
- backend entry and frontend entry;
- requested capabilities;
- route and command ownership;
- required runtime profiles if any; and
- integrity/provenance metadata in the built artifact.

Hosted plugins are globally allowlisted at build time. An installed guild also
has an `enabledPluginIds` policy. The MVP may use the same set for every preview
guild, but command execution, routes, hooks and scheduled guild work still
verify that per-installation set; there is no customer plugin toggle.

Key contracts:

```ts
interface PluginRequestContext {
    principal: AuthenticatedPrincipal;
    guild?: GuildScope;
    requestId: string;
}

interface PluginRouteDefinition {
    method: HttpMethod;
    path: string;
    access: { kind: 'public' } | { kind: 'authorized'; policyAction: string };
    guildRequired: boolean;
    schema: JsonSchemaBundle;
    handler(context: PluginRequestContext, request: TypedRequest): Promise<unknown>;
}
```

Default is deny: omission of access policy or schema prevents registration. A
provider-neutral authorization port resolves `(principal, policyAction,
GuildScope/resource)` through a local or hosted provider; OSS core does not know
Hosted Jasper’s owner/admin membership roles. Discord administrative commands
separately check current Discord permissions such as `ManageGuild`.

Fastify
registers extension routes in an encapsulated prefix with the resolved auth,
schema, rate-limit, and context hooks before `ready()`/`listen()`.

Every hook, task, route, decorator, and command registration returns an
ownership handle disposed on unload. ID or command collision fails plugin load;
it never overwrites a core owner. Compatibility mismatch for a hosted-required
plugin makes readiness fail.

Fastify does not support arbitrary route registration/removal after the server
is ready. Hosted allowlisted plugins therefore load and register before
`listen()` and change through a runtime release. If self-hosted hot activation
is retained, it uses one pre-registered, policy-enforcing dispatcher and
deactivates ownership so stale handlers cannot execute, or explicitly requires
a restart. It must not imply that Fastify encapsulation can unregister a live
route.

The vNext context replaces raw discord.js `Client` and mutable `WorkerState`
objects with purpose-built facades and `WorkerPublicState`. Plugin store, asset,
command, hook, file and scheduled-guild-work APIs require `GuildScope`; lifecycle
events carry it. An explicit global operator task API is separate and unavailable
to ordinary feature plugins.

The hosted adapter requests two narrow, reviewed capabilities instead of a raw
client or generic operator API:

```ts
interface InstallationRuntimeOperations {
    snapshot(scope: GuildScope): Promise<ApplicationMembershipSnapshot>;
    drain(scope: GuildScope, operationId: string): Promise<DrainResult>;
    leaveApplication(
        scope: GuildScope,
        applicationId: string,
        operationId: string,
        expectedFence: number,
    ): Promise<void>;
}

interface RuntimeComponentStateStore {
    get(componentId: string, key: string): Promise<VersionedValue | null>;
    compareAndSet(
        componentId: string,
        key: string,
        expectedVersion: number | null,
        value: Uint8Array,
    ): Promise<VersionedValue>;
    appendObservation(record: FencedObservation): Promise<void>;
    claimUnacknowledged(
        componentId: string,
        claimant: RuntimeIdentity,
        limit: number,
        leaseMs: number,
    ): Promise<readonly FencedObservation[]>;
    acknowledgeObservation(
        recordBootId: string,
        throughSequence: number,
        claimant: RuntimeIdentity,
    ): Promise<void>;
}
```

Operations are installation-scoped, idempotent, application-catalog validated,
revision/fence checked and audited. The component state/spool stores only
bounded runtime cursors, last-known-good policy metadata and undelivered
observations in the data-plane domain; it cannot access tenant feature KV or
control-plane tables. The current fenced owner may claim ordered records from a
prior boot and acknowledge them by their original boot/sequence. Replaceable
health snapshots coalesce under the configured count/byte bound; lifecycle,
security, install/remove, and config-ack records are not silently dropped. If
the durable bound cannot accept a required record, readiness and new admission
fail until delivery or operator recovery.

These facades prevent accidental contract-level token and cross-guild leakage;
they are not a sandbox. Trusted in-process Node code can still import modules,
read process state or bypass a facade. Hosted allowlisting, review and artifact
pinning remain the actual trust decision.

### 5.6 Capability decision

```ts
interface CapabilityDecisionProvider {
    decide(
        installation: GuildInstallationContext,
        capabilityId: string,
    ): Promise<{ allowed: boolean; reason: string; validUntil?: Date }>;
}
```

The public local resolver allows every existing capability. The hosted MVP also
allows every capability for every admitted preview tenant. Operational
rate/queue/upload limits use a separate safety-policy interface. Core contains
no plan, price, trial, payment, or subscription type.

The safety-policy interface is evaluated by immutable `installationId` and
operation class. It provides per-installation command, queue, extraction,
download, upload, and concurrent-playback limits plus cell/global provider
budgets. Admission is fail-safe under overload, emits a bounded reason, and does
not identify a commercial plan.

### 5.7 Health and lifecycle

Public lifecycle events include:

- controller/worker ready and unavailable;
- guild/app observed and removed;
- guild permissions changed;
- installation config resolved/applied/rejected;
- drain requested/complete/forced;
- plugin ready/degraded/failed; and
- runtime fencing changed.

Plugins register health contributors returning non-sensitive component state.

## 6. Per-guild worker leases and AFR

### 6.1 State

```text
Map<installationId, Map<workerId, VoiceLease>>

VoiceLease:
  state = acquiring | active | retained | releasing
  installationId
  guildId
  workerId/applicationId
  voiceChannelId
  queueId
  generation
  acquiredAt
  lastActivityAt
```

There is no global `busy` boolean. A worker is unavailable only within a guild
where it has an acquiring, active, retained, or releasing lease. It remains
available in other guilds.

A retained voice connection retains the lease. Jasper either reuses that same
channel or destroys the connection and releases the lease; it never exposes the
current “released state with retained connection” conflict.

### 6.2 Allocation algorithm

Under a per-installation allocation lock:

1. Resolve an active/degraded installation and its enabled cats.
2. If a lease already targets the requested channel and its client is ready,
   reuse it.
3. Build eligible controller and worker candidates:
    - configured and enabled;
    - client ready;
    - application observed in the guild;
    - no lease in this guild;
    - can see the channel and has `Connect` and `Speak`; and
    - not quarantined or draining.
4. If Jasper is eligible, select it with the configured weight.
5. Otherwise choose uniformly from eligible workers.
6. Reserve an `acquiring` lease before asynchronous voice work.
7. Revalidate Discord state and connect.
8. On a candidate-specific failure, release that reservation, remove the
   candidate, and try the next candidate.
9. Commit `active`, or return a guild-scoped capacity/permission error when no
   candidate remains.

Controller fallback means Jasper participates in the candidate set even when
worker capacity is absent. A configured weight of zero prevents probabilistic
selection but does not disable last-resort controller fallback in the MVP.

Release requires
`(installationId, guildId, workerId, voiceChannelId, generation)` so stale
callbacks from an earlier install or playback generation cannot release a newer
lease.

### 6.3 Queue durability boundary

Queue, player, and voice-connection contents remain ephemeral in the MVP. A
graceful deployment drains finite queues within the configured bound, but a
process crash, forced drain, or fence loss may interrupt and drop in-memory
queue entries. For each active queue/playback Jasper persists only a minimal
non-resumable marker—installation/queue ID, boot/fence, and safe timestamps—so a
later owner can emit a best-effort installation-scoped `interrupted` outcome and
clear the marker. It never reconstructs or replays a track from that marker and
never claims queue failover. Playlists, accepted configuration, installation
state, and completed history remain durable.

Durable queue resume is a later design only if preview evidence shows the
customer benefit outweighs ordering, duplicate-playback, media-expiry, and
cross-release compatibility complexity.

### 6.4 Concurrency and distribution tests

- simultaneous allocations for the same guild never choose one cat twice;
- one cat can be active in guild A and guild B;
- partial cat installation never selects an absent cat;
- permission failure retries another cat;
- retained connections preserve ownership;
- stale release generations are ignored;
- a stale callback from a purged installation cannot affect a new installation
  of the same guild;
- weighted selection converges within a statistical tolerance;
- zero/one weights and no-worker fallback retain semantics; and
- `/catastrophic-reset` and `/music-status` operate only on the invoking guild
  and require the intended current Discord permissions.

A distributed lease is not required inside one-shard MVP ownership. Shard
fencing prevents a second process from allocating the same guild. If future
architecture splits a guild’s cats across processes, the lease interface must
gain a transactional distributed provider first.

## 7. Command lifecycle

### 7.1 Stable global registry

The controller application owns the public slash commands. Worker applications
do not register the controller command set.

Command definitions are stable across tenants. A plugin command may be visible
globally while execution checks installation and plugin policy. Tenant
enablement never bulk-overwrites the application registry.

Core and plugins export pure command descriptors for a build-time manifest.
Publication does not execute plugin `onLoad`, initialize a database, register a
route/task/hook, or make network calls. Jasper commands declare Discord guild
interaction/install contexts and safe default member permissions in the
manifest; runtime DM denial and permission checks remain defense in depth.

### 7.2 Publisher modes

- `guild`: sandbox and development, one allowlisted guild, immediate updates.
- `global`: hosted staging/preview/production release, one controller
  application, explicit operator job.
- `dry-run`: normalized diff, command count and limit validation, no mutation.

The publisher receives an explicit environment, controller application,
credential reference, command digest, and signed release-manifest identity.
`GUILD_ID` is not a hosted global.

### 7.3 Safe release ordering

Command evolution follows expand-contract:

1. deploy runtime that accepts old and new interactions;
2. verify readiness;
3. publish additive/changed definitions;
4. automatically verify the target application command registry/digest and run
   controlled target-environment canary evidence where required;
5. remove old definitions; and
6. remove old handlers only in a later release.

Command publication failure does not replace a ready runtime. Runtime startup
does not publish. Production-disabled test plugins never participate in a
release manifest. CI does not automate ordinary Discord users or use self-bots;
real consent/slash-command checks are controlled canary/manual exercises.

## 8. Private control plane

### 8.1 Deployables

| Component             | Responsibility                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Marketing             | Public product, transparency, consent explanation, preview CTA, legal/support links        |
| Customer portal       | Discord sign-in, guild chooser, onboarding, tenant status/config/members/removal           |
| Control-plane API     | Customer/staff/workload authorization, tenant source of truth, desired state, observations |
| Control-plane worker  | Outbox, task leases, cleanup, notification, reconciliation, retention jobs                 |
| Staff console         | OIDC/RBAC tenant and fleet operations with redacted diagnostics                            |
| Hosted runtime plugin | Data-plane observation, policy, desired-state and health adapter                           |

Marketing may be statically cached. Customer and staff frontends call only the
control-plane API, never the data-plane Fastify server.

The hosted MVP does **not** load the current dynamic plugin IIFE pages into the
proprietary portal and does not expose plugin HTTP routes to customer browsers.
Tenant-safe Garage Band/Soundboard Discord commands may be enabled; their
legacy web panels remain a self-hosted surface. A later plugin-web design must
use a control-plane/BFF-mediated, tenant-authorized extension contract rather
than direct browser access to a shard process. The customer portal may show only
safe plugin availability/health metadata in MVP.

### 8.2 API conventions

- HTTPS only; `/v1` version prefix.
- JSON Schema validation for request and response.
- Opaque IDs externally; Discord snowflakes accepted only in validated,
  authorized contexts.
- `Idempotency-Key` required on create, retry, activation, invite, removal, and
  runtime observation/task acknowledgement.
- Optimistic concurrency through `If-Match`/revision for configuration and
  membership changes.
- Cursor pagination and bounded filters.
- Structured error code, safe message, request ID, retry classification.
- CSRF protection for cookie-authenticated mutations; secure, HTTP-only,
  signed/encrypted as appropriate, SameSite cookies and session rotation.
- Customer, staff, and workload route trees use distinct authentication and
  rate-limit policies.

Representative customer endpoints:

```text
GET    /v1/me
GET    /v1/me/manageable-guilds
POST   /v1/onboarding-runs
GET    /v1/onboarding-runs/:runId
POST   /v1/onboarding-runs/:runId/applications/:appId/authorization
POST   /v1/onboarding-runs/:runId/activate
GET    /v1/tenants/:tenantId
PATCH  /v1/tenants/:tenantId/config
GET    /v1/tenants/:tenantId/members
POST   /v1/tenants/:tenantId/invitations
PATCH  /v1/tenants/:tenantId/members/:memberId
DELETE /v1/tenants/:tenantId
```

Representative workload endpoints:

```text
POST /v1/runtime/registrations
POST /v1/runtime/heartbeats
POST /v1/runtime/observations:batch
GET  /v1/runtime/desired-state?cursor=...
POST /v1/runtime/tasks/:leaseId/ack
```

Staff routes are separate and role-specific. They never reuse a customer
“is authenticated” hook as authorization.

### 8.3 Workload delivery

The runtime plugin makes outbound mutually authenticated or workload-token
authenticated requests. Credentials are cell-specific, short-lived where the
platform supports it, and rotatable.

PostgreSQL outbox/inbox records make observation, desired-state, and task
delivery durable:

- producer transaction writes domain change and outbox event;
- worker claims with bounded lease and publishes/materializes;
- consumer deduplicates observations by
  `(cellId, fenceEpoch, bootId, sequence)` and other work by idempotency key;
- acknowledgement records the cell fence epoch and applied revision; and
- poison work is quarantined and visible to staff rather than retried forever.

The runtime component spool persists the current boot’s bounded, undelivered
observation sequence and acknowledgement cursor. A restart gets a new `bootId`
and can safely replay any prior unacknowledged records without colliding with a
reset sequence.

No Redis or general message broker is required for the limited MVP. Add one only
from measured queue latency/fan-out requirements.

## 9. Discord onboarding design

### 9.1 Application catalog

The private catalog stores immutable revisions, each containing, per
environment and cat:

- internal stable cat ID;
- role and display order;
- Discord application/client ID;
- safe display name/avatar;
- controller-required or optional-worker classification;
- requested install scopes and permission bitset;
- authorization base/link strategy;
- verification/intent state;
- enabled environments; and
- matching runtime application identity.

Tokens and client secrets are secret-store references outside this table.
Published revisions are immutable. Rotation creates a new revision; the
previous revision remains retained for matching and cleanup until explicit
cutover or migration completes.

The MVP permits only one runtime catalog revision per environment. A normal
promotion stops issuing old authorization actions and waits for every
old-revision run and leave/cleanup task to complete or expire before the shard
owner cuts over. Historical revisions and app IDs remain read-only for
observation matching and audit; retired credentials remain available only
through a bounded operational cleanup window and are removed after
zero-membership evidence. An emergency app/credential retirement explicitly
invalidates or migrates affected steps, marks them `action_required`, and
completes an audited cleanup/manager-notification path; it never silently aliases
an old app ID to a new one.

Soundboard’s message-collector upload flow currently requires
`MessageContent`. The hosted MVP either redesigns upload around slash-command
attachments or disables that flow. It does not request the privileged intent
for an unused/optional path.

### 9.2 Authorization ceremony

The server generates a short-lived authorization action for one catalog app and
the selected guild. Each onboarding run and action pins the immutable catalog
revision, application ID, scopes, and permission bitset. The browser opens that
application-specific Discord URL with the minimum scopes and permissions, a
guild hint, and fixed guild selection where Discord supports it. If an
application or permission set rotates mid-run, the service either finishes
against the still-observed pinned revision or explicitly invalidates/migrates
the step; it never silently matches a stale URL to the current catalog.

The portal then waits on the control-plane run. It does not accept a browser
query parameter as proof. The runtime’s `guildCreate`, cache reconciliation, or
periodic membership observation reports:

- guild ID;
- application ID and bot user ID;
- join/observation time;
- readiness;
- relevant guild and configured-channel permissions; and
- cell, shard, release, catalog revision, fence epoch, boot ID, and observation
  sequence.

The control plane matches the observation to one active run and marks the step
complete exactly once.

Selecting a guild transactionally creates a `provisioning` tenant reservation
and onboarding run under the unique guild constraint. It does not create an
active installation. Individual authorization actions are short-lived; the run
remains resumable for 7 days after its last verified activity.

### 9.3 State machine

```text
ACCESS_APPROVED
  └─ select manageable guild
      → PROVISIONING / GUILD_SELECTED
      → CONTROLLER_AUTHORIZING
      → CONTROLLER_OBSERVED
      → WORKERS_AUTHORIZING
      → VERIFYING
      → CONFIGURING
      → READY
      → ACTIVE or DEGRADED / COMPLETED

cancel or 7-day inactivity
  → EXPIRED
  → release empty reservation
     OR quarantine observed cats → leave → delete provisional tenant
```

Each transition:

- validates actor and current version;
- records the causal event and idempotency key;
- updates the materialized run in the same transaction;
- creates any task/outbox record; and
- increments the run version.

Attempts carry `pending`, `observed`, `succeeded`, `retryable_error`,
`action_required`, or `skipped_optional`. Errors do not erase success.

`provisioning`, `active`, `degraded`, `suspended`, `deleting`, and `deleted` are
tenant service states, not alternate progress paths. A controller-observed
tenant can become `degraded` when workers are skipped/removed. Controller
removal suspends new work until repaired or deleted.

An expired run with no observed provider app releases the reservation. If a cat
was observed, the tenant never becomes active: the cat is quarantined, admission
stays denied, and an idempotent leave/deletion job runs unless a verified
manager recovers the run inside the documented window.

Provider client IDs and install links are public, so a bot may be invited
without any onboarding run. An unmatched app/guild observation creates only a
quarantine record, never a tenant. The runtime admits no commands, and the
control plane schedules the app to leave after 15 minutes unless a user with
fresh `MANAGE_GUILD` verification claims it through a normal run.

### 9.4 Duplicate ownership

The database uniqueness constraint reserves one live installation per Discord
guild across `provisioning`, `active`, `degraded`, `suspended`, and `deleting`.
The 30-day recoverable deletion tombstone also blocks re-onboarding. A new
installation ID may be created only after the recovery record is released or an
audited irreversible-purge transaction completes. When another user selects an
installed guild:

- an existing member is routed to the tenant;
- a non-member receives no tenant data and uses an ownership-recovery request;
- a current owner/admin can invite them; or
- staff follows an audited recovery process using fresh Discord authority and
  documented evidence.

Automatic takeover based on a single OAuth response is prohibited.

## 10. Data design

### 10.1 Store and credential separation

The MVP may use one managed PostgreSQL service to stay lean, but it has two
logical databases (or equivalently isolated schemas where the provider
requires), separate owners, migration ledgers/locks, pools and runtime roles:

| Domain               | Owner                                       | Credential boundary                                                                                |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Jasper data plane    | Open Jasper migrations/runtime              | Core runtime can read/write installation-scoped playback, plugin and asset metadata only           |
| Hosted control plane | Private control-plane migrations/API/worker | Customer identity, OAuth/session, membership, onboarding, desired state, audit and operations only |

The runtime core credential cannot read control-plane OAuth, session,
membership, staff or audit tables. The private runtime plugin calls the
control-plane API and has no direct control-plane database credential. The
control plane does not query Jasper tables directly.

A release orchestration job runs the two independently locked migration sets in
their declared compatibility order. “One migration job” means one orchestrated
release step, not one shared schema ledger or owner.

Object storage is similarly separated into tenant-owned Jasper assets, private
control-plane exports/artifacts where needed, and a disposable shared public
media cache, each with its own role and lifecycle. Backup/restore covers both
durable database domains and tenant-owned objects. Deletion tombstones live in
an independent immutable ledger/failure domain so restoring an older backup
cannot reactivate deleted data.

### 10.2 Public Jasper persistence

Shared core changes include:

- `schema_migrations(version, checksum, applied_at, release)`;
- installation-scoped play/usage queries with Discord guild correlation;
- plugin storage with explicit scope, e.g.
  `(plugin_id, scope_type, scope_id, key)` where tenant `scope_id` is immutable
  `installationId`;
- installation-scoped owned asset metadata;
- versioned runtime-component state plus a bounded fenced observation spool;
- minimal non-resumable active-work markers keyed by installation/queue/boot/
  fence, containing no track URL or message/search content;
- cache metadata separated from tenant-owned assets; and
- PostgreSQL/SQLite parity for shared columns and behavior.

Migrations are ordered, checksum verified, run once under a database lock, and
designed for old/new runtime compatibility. Application startup checks schema
compatibility but does not opportunistically mutate production schema.

### 10.3 Private control-plane records

| Record                    | Important fields and rules                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                   | opaque ID, Discord subject, safe profile, status; unique subject                                                                              |
| `oauth_credentials`       | user, encrypted token envelope, scopes, expiry, rotation metadata; tightly restricted                                                         |
| `sessions`                | hashed/rotating identifier, user, issuer, expiry, revocation                                                                                  |
| `tenants`                 | UUID, immutable installation ID, Discord guild ID under nonterminal/recoverable uniqueness, lifecycle, owner invariant, expiry/deletion times |
| `memberships`             | tenant, user, role, state, actor and version; unique active pair                                                                              |
| `invitations`             | tenant, role, hashed token, inviter, expiry, use/revoke state                                                                                 |
| `application_catalog`     | immutable revision plus safe controller/worker install metadata by environment                                                                |
| `guild_app_installations` | tenant/installation, catalog revision/app, observation/readiness/permission state, last cell/shard/boot                                       |
| `onboarding_runs`         | tenant/installation/guild/user, pinned catalog revision, canonical state, version, activity/expiry/cancel and resume metadata                 |
| `onboarding_steps`        | run, pinned app/scopes/permissions, status, attempt, error class, observations                                                                |
| `tenant_configs`          | tenant, schema and revision, validated document, actor, applied state                                                                         |
| `runtime_cells`           | environment, cell, release, shard assignment, catalog revision/app set, fence epoch, boot ID, heartbeat/readiness                             |
| `desired_state`           | target/revision/document/digest, created by                                                                                                   |
| `runtime_observations`    | cell/fence/boot/sequence, type/safe payload/received time and unique dedup key                                                                |
| `runtime_tasks`           | target, action, lease/fence, idempotency, expiry/result                                                                                       |
| `outbox` / `inbox`        | durable delivery and deduplication                                                                                                            |
| `access_cohorts`          | whole-service preview admission, reason, actor, status; not a paid entitlement                                                                |
| `entitlement_snapshots`   | provider-neutral all-free result for forward compatibility                                                                                    |
| `usage_events`            | tenant, event type, quantity/outcome/time, dedup; no message content                                                                          |
| `audit_events`            | append-only actor/principal/action/target/reason/safe change/result/request/time                                                              |
| `deletion_jobs`           | tenant, stages, recovery deadline, holds, external tombstone, object/database completion                                                      |

Foreign keys and uniqueness encode one nonterminal/recoverable installation per
guild, one owner minimum through transactional service rules, one active app
installation per tenant/app, and ordered config/observation sequences.

### 10.4 Tenant enforcement

- Service-layer authorization derives `tenant_id` from principal plus route
  target.
- Repositories require an authorization scope, not a free tenant ID parameter.
- PostgreSQL row-level security protects customer-facing tenant tables as
  defense in depth where practical.
- Background workers use explicit system roles and record the tenant/task.
- Staff cross-tenant database paths use separate credentials and service
  methods.
- Jasper data-plane object keys start with immutable `installationId`; private
  control-plane objects may start with opaque tenant UUID. Neither uses a
  user-controlled guild/name as ownership.
- Cache storage has a separate bucket/prefix and never carries customer ACLs.
- Integration tests attempt every cross-tenant read/write/delete path.

### 10.5 Retention baseline

Subject to legal/privacy approval before preview:

| Data                            | Proposed preview retention                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Active OAuth credential         | Only while needed for active account/session duties; encrypted and revoked/deleted on account removal |
| Browser session                 | At most 30 days; rotating and revocable                                                               |
| Raw runtime observations        | 30 days, then aggregate or delete                                                                     |
| Tenant usage aggregates         | 13 months for preview trend/capacity analysis                                                         |
| Staff/security audit            | 12 months minimum unless legal policy requires longer                                                 |
| Deleted tenant recoverable data | 30 days, then purge                                                                                   |
| Backups containing deleted data | At most 35 days; tombstones prevent active restore                                                    |
| Public shared cache             | Capacity/expiry policy, not customer retention; contains no private tenant ownership                  |

The published privacy inventory is authoritative; configuration and jobs must
match it.

## 11. Storage and media safety

### 11.1 Storage providers

Public interfaces distinguish:

- `TenantAssetStore`: installation-scoped uploads and derived private assets;
- `SharedMediaCache`: content-addressed, replaceable cache for eligible public
  media; and
- `PluginAssetStore`: plugin plus immutable installation scope, implemented
  over local files or object storage.

Self-hosted implementations use documented local directories. Hosted
implementations use private buckets/prefixes, encryption, lifecycle rules, and
bounded signed URLs. Database transactions and object operations use durable
pending/finalized states so orphan cleanup is safe.

### 11.2 Remote-source policy

All core and plugin remote downloads go through one service that:

- accepts only configured schemes and ports;
- resolves DNS and denies loopback, link-local, RFC1918/private, metadata, and
  other restricted ranges before and after redirects;
- limits redirects, connection/read time, and total bytes;
- streams rather than unbounded `arrayBuffer()` use;
- validates declared and detected content type;
- assigns a tenant quota and concurrency limit;
- uses safe generated filenames and non-executable storage;
- emits redacted outcome metrics; and
- supports source-specific allow/deny policy.

yt-dlp and FFmpeg subprocesses obey the same boundary through container/network
egress policy or a controlled proxy, robust URL parsing rather than substring
tests, redirect/destination controls, child-process concurrency and lifetime,
bounded stdout/stderr, resource limits, and explicit approved arguments. A safe
Node fetch wrapper alone is insufficient.

Only public media bytes and normalized provider/source metadata may enter the
shared cache. Raw user searches, arbitrary submitted URLs, requester identities
and query-to-result mappings are tenant-scoped and minimized/short-lived; they
are not shared cache keys or cross-tenant metadata.

Arbitrary playable URLs, Garage Band thumbnails/tracks, and Soundboard uploads
must use it. A malware scanning/quarantine decision is a real-preview launch
gate.

## 12. Security design

### 12.1 Principal types

- `anonymous`: only explicit public marketing/status routes.
- `customer_user`: Discord-authenticated, no tenant authority by itself.
- `tenant_member`: user plus tenant role from server-side membership.
- `staff`: OIDC subject plus explicit staff role and MFA assurance.
- `runtime_workload`: cell/shard identity plus fence epoch.
- `system_job`: named internal job identity with bounded action set.

Authorization is action/resource based. “Any logged-in user” is never an admin
policy.

### 12.2 Immediate hosted closures

Before employee guilds share a process:

- make `/catastrophic-reset` guild-scoped and require current Discord
  `ManageGuild` permission;
- make `/music-status`, queues, cache attribution, logs, and stats guild-scoped;
- disable the legacy core `/api/auth/*` OAuth/session flow, DevTools, dynamic
  dashboard, and public plugin management in hosted profile;
- prevent customer retrieval of decrypted OAuth tokens or media cookies;
- disable plugin upload/install/remove/toggle from customer surfaces;
- sign/rotate session state correctly;
- remove raw worker tokens from plugin types;
- verify PostgreSQL TLS rather than setting `rejectUnauthorized: false`; and
- remove unused privileged intents or redesign the feature requiring them.

### 12.3 Abuse and rate control

Apply layered limits by IP/session/user/tenant/action, plus global Discord/media
provider budgets. Operational limits cover:

- OAuth and install-link generation;
- onboarding retries and guild reconciliation;
- commands and queue length;
- concurrent extraction/download/upload;
- concurrent voice/playback admission per installation and per cell;
- object bytes and file count;
- control-plane desired-state/observation batches; and
- staff mutations.

Limits protect reliability and do not imply a paid tier.

### 12.4 Audit and redaction

Never log bot/OAuth/workload tokens, cookies, authorization headers, signed URLs,
raw plugin archives, or unbounded request bodies. Guild/user IDs are searchable
only in controlled logs; metrics use bounded opaque/cohort dimensions rather
than raw IDs.

Audit records include safe before/after metadata but never secret values.
Automated secret scanners test logs, errors, artifacts, browser bundles, and
support exports.

## 13. Health, observability, and operation

### 13.1 Endpoints

| Endpoint           | Audience               | Behavior                                                                                                    |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/health/live`     | Orchestrator           | Minimal 200 while event loop/process can serve; no component inventory                                      |
| `/health/ready`    | Orchestrator           | 200 only with current fence, compatible DB, controller ready, required plugins/config loaded; 503 otherwise |
| `/internal/health` | Workload/staff backend | Authenticated component detail including degraded workers and shard metadata                                |
| `/metrics`         | Private collector      | Authenticated/scrape-network-only, redacted bounded labels                                                  |

Worker loss is degraded if the controller safely serves. All-bot login failure,
controller failure, expired fence, incompatible schema, or required hosted
plugin failure is unready.

### 13.2 Core telemetry

- gateway ready/resume/disconnect, identify and session-start budget;
- interaction receive/ack/complete and error class;
- lease allocation/reuse/retry/release and AFR role distribution;
- active/retained queues and voice connections;
- voice join, UDP, player state and time-to-audio;
- media resolve/extract/download/cache outcome and latency;
- plugin lifecycle, route/task/hook errors;
- DB pool, query, migration and outbox/inbox lag;
- object operations and quota;
- config/observation convergence;
- runtime release, shard, fence and drain; and
- event-loop, CPU, memory, filesystem and child-process health.

Structured traces propagate a request/interaction ID through command, queue,
lease, resolver, plugin, and observation paths.

Availability reporting uses two explicit monthly denominators: successful
authenticated control-plane canary probes over all scheduled probes, and ready
assigned-shard minutes over expected service assigned-shard minutes. Dashboards
also report fleet, per-cell, and tenant-impact minutes. Discord-wide incidents
are classified separately rather than silently removed; announced excluded
maintenance is itemized and capped at two hours per month.

### 13.3 Runbooks and alerts

Required preview runbooks:

- controller or one/all worker login failure;
- worker removed/permission lost;
- Discord outage, rate limit, verification or session-start exhaustion;
- media provider/yt-dlp breakage;
- database or object-store degradation;
- control-plane outage and expired policy cache;
- stuck onboarding observation/config revision;
- cell split-brain/fence loss;
- bad plugin or image release and rollback;
- tenant data disclosure suspicion;
- secret exposure/rotation;
- backup restore and deleted-tenant tombstone handling; and
- graceful versus forced drain.

## 14. Build, deployment, and environments

### 14.1 Artifact model

Public CI produces one Jasper OCI base image from an exact commit:

- Node 24 pinned by digest/version;
- production build output and required workspace runtime packages;
- pinned, checksum-verified yt-dlp and FFmpeg;
- non-root user, read-only root filesystem, explicit writable cache/data mounts;
- no test source in production output;
- dependency lock, vulnerability report, SBOM, provenance and signature/
  attestation; and
- image digest and compatible plugin SDK version.

Private CI produces a deterministic hosted plugin artifact and assembles a
hosted distribution image `FROM` the exact public digest. Environment
configuration and secrets are injected at runtime; images are not rebuilt for
promotion.

The public base build succeeds from a public/fork checkout with no recursive
private submodule and no secret. It excludes private Garage Band source or
consumes only a verified public compiled artifact. A separate trusted
post-review lane assembles private integration and never uses
`pull_request_target` to execute contributor code with secrets.

Promotion uses a signed **release manifest**, not a naked image digest. It binds:

- public core commit/image digest;
- private distribution and every plugin artifact digest;
- both database schema compatibility ranges and migration-set digests;
- configuration-schema and Discord application-catalog-schema compatibility;
- command manifest digest;
- required infrastructure-contract version;
- SBOM/provenance attestations and accepted scan-policy/waiver IDs; and
- previous compatible release-manifest identity.

The release manifest is environment-independent and is the identical signed
artifact promoted across environments. A separately signed per-environment
**deployment envelope** binds that release identity to the exact environment,
configuration revision, immutable application-catalog revision/app set,
infrastructure revision, both migration execution results, controller command
target/observed digest, actor/approval, canary evidence, and prior compatible
deployment envelope.

Deployment verifies both signatures/attestations and every referenced registry
digest/revision before mutation.

### 14.2 Quality gates

Pull-request CI:

- format/lint;
- build then typecheck in a clean workspace;
- unit and component tests;
- SQLite and PostgreSQL integration;
- route authorization and tenant-isolation matrices;
- plugin validate, package, install and boot;
- image build and smoke;
- secret, dependency, license and vulnerability scans.

Untrusted/fork CI uses public fixtures and no GitHub App, Discord, deployment or
private-repository credential. Trusted integration and release jobs run only
after review with short-lived identity and an explicit environment policy.

Promotion:

```text
commit
  → immutable public/private artifacts
  → sandbox guild
  → hosted staging guilds
  → manual preview approval
  → limited preview
```

Each environment records the common release-manifest identity/signature plus
its signed deployment envelope and resulting health/canary evidence.

### 14.3 Deployment order

1. Verify the signed release manifest and environment deployment envelope,
   attestations, registry digests/revisions, environment capacity and prior
   compatible envelope.
2. Verify backup policy and run the independently locked data-plane and
   control-plane migration sets in their declared compatible order.
3. Deploy control-plane API/worker with expand-contract compatibility.
4. Drain and replace the fenced runtime shard owner.
5. Require runtime readiness plus the target environment’s dedicated canary
   guild/application checks; automated jobs verify registry/command digests,
   while real consent/slash/playback evidence is a controlled canary/manual
   exercise rather than an ordinary-user bot.
6. Publish compatible controller commands if their digest changed.
7. Verify observations, configuration, onboarding and tenant-isolation smoke.
8. Promote or automatically/manual roll back according to the failure policy.

Rollback never runs an incompatible down migration automatically. Expand-
contract migrations and compatible config/catalog revisions keep the prior
signed release manifest runnable; rollback creates/verifies a new environment
envelope referencing that prior release and compatible revisions.

### 14.4 Existing `deploy` lane

The current unprotected, in-place SSH/PM2 workflow is not reused for hosted
orchestration. Wave 0 freezes it or adds the minimum safe gate before another
use:

- add ordinary PR CI independently;
- stop publishing commands before unverified runtime deployment;
- prevent test-plugin command discovery;
- document its actual single-host status and missing runtime access;
- add concurrency, health and recoverable release directories if it remains
  active; and
- require an owner-approved manual operation until the public container path is
  proven.

After the public image/Compose drill, a separate decision migrates the staging
guild to that artifact or retains PM2 as an explicitly supported manual lane.

The hosted staging environment is a named environment with separate Discord
applications/guilds and configuration. A branch name alone is not an
environment.

## 15. Self-hosted and independent-provider design

The public distribution includes:

```text
Jasper core image
  + controller/worker catalog file or namespaced env
  + SQLite for simple local use OR PostgreSQL
  + local storage OR documented S3-compatible provider
  + local allowlist installation policy
  + guild/global command publisher
  + health/metrics contract
```

A one-container quick path uses SQLite, local asset/cache volumes, an explicit
one-shot `jasper migrate`/opt-in `migrate-and-start`, and no proprietary service.
A production-like Compose profile adds PostgreSQL, S3-compatible storage if
selected, migration jobs, health checks, backup/restore commands, and an
optional reverse proxy. The manual PM2 guide remains available and corrected.

Default-deny API authorization also has a local recovery path: self-hosters
configure operator Discord user IDs in a file/environment or manage them through
an offline CLI. If no operator exists, customer/admin HTTP routes stay closed
and the CLI can add/recover one without a web bypass.

Plugin SDK v1 remains available only in a documented self-hosted compatibility
mode. A single-guild migration command dry-runs/backups and maps legacy
unscoped plugin KV/files to that configured guild; ambiguous multi-guild data
requires an operator choice. Hosted mode rejects v1 plugins. Compatibility has
a published removal window rather than silently treating global data as tenant
safe.

The independent-provider guide documents:

- public installation/access policy interface;
- application/shard alignment;
- worker catalog/secret materialization and rotation;
- Discord application verification, intents and session-start budgeting;
- desired-state and observation vocabulary;
- tenant/guild scope;
- migration and object-storage contract;
- command release semantics;
- image/plugin provenance;
- health, drain, placement, backup, restore and rollback; and
- security responsibilities, including trusted plugin status.

It does not publish the proprietary portal, staff console, acquisition logic, or
future billing implementation.

## 16. Garage Band and built-in plugin migration

The initial hosted production allowlist is explicit:

| Component                                                    | Initial hosted disposition                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Core Jasper commands                                         | Enabled after guild scope, command-context and destructive-action gates pass      |
| Private Hosted Jasper adapter                                | Required, exact digest, build-time only                                           |
| Garage Band                                                  | Disabled until every HJ-GB preview condition passes; Discord commands only in MVP |
| Soundboard                                                   | Disabled until HJ-SB-01 passes; Discord commands only in MVP                      |
| Sound Effect Plugin (`/ping-plugin`)                         | Demo plugin; excluded from hosted image and command manifest                      |
| Advanced Hooks Test, DB Test, Dashboard Notes, Media Gallery | Test/demo plugins; excluded from hosted image and command manifest                |

Marketing, the portal and release manifest publish this inventory. Adding a
plugin requires a reviewed allowlist/release change; filesystem discovery alone
never enables it.

Garage Band is included in preview only after it:

- stores playlists by guild/installation in normalized transactional records or
  versioned conflict-safe documents;
- enforces tenant membership and playlist ownership/role on every command and
  route;
- stops using synthetic `api` ownership;
- uses the public enqueue service rather than importing core music-player code;
- adopts safe remote fetch/upload, quotas, MIME/size policy and object storage;
- aligns manifest and runtime version;
- passes concurrent update and cross-guild negative tests; and
- has an immutable, provenance-preserving source/artifact/host release path.

Soundboard must scope sounds and plays by guild, authenticate mutations, replace
placeholder ownership, and either replace its message collector with attachment
interactions or justify/obtain the privileged intent.

Test/dev plugins are excluded from production image and command discovery.

## 17. Failure behavior

| Failure                                  | Required behavior                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One worker unavailable/removed           | Mark cat unavailable, continue with eligible cats/controller, update portal, no global readiness failure                                                     |
| Controller unavailable                   | Runtime unready; acknowledge safely if possible, no new playback; alert and restart/rollback                                                                 |
| Runtime crash or forced fence loss       | In-memory queues/audio stop; next owner emits best-effort installation interruption from minimal markers, clears them, and never auto-replays                |
| Partial worker authorization             | Activate degraded after controller; installer resumes at missing cat                                                                                         |
| Policy/config delivery unreachable       | While the independent shard lease remains valid, use authenticated last-known-good policy up to 15 minutes and buffer bounded observations; then fail closed |
| Shard lease renewal unavailable/expired  | Lease rule overrides policy cache; become unready, deny Discord side effects, drain/disconnect, and let a later epoch start only after expiry/safety margin  |
| Control-plane PostgreSQL unavailable     | Customer/staff mutations fail safely; runtime continues bounded cached policy; outbox recovers idempotently                                                  |
| Runtime PostgreSQL incompatible          | Readiness fails before Discord admission                                                                                                                     |
| Object store unavailable                 | Existing public cache/playback may continue where safe; uploads/private-asset operations fail retryably                                                      |
| Discord gateway outage/rate limit        | Preserve durable control-plane state, back off within library/API rules, report provider incident                                                            |
| Media extraction/provider failure        | Classify upstream versus internal, do not churn cats, offer safe user error, alert on aggregate regression                                                   |
| Stale cell/task                          | Fence/version rejection; no mutation or duplicate leave/config action                                                                                        |
| Plugin incompatibility/integrity failure | Hosted runtime unready; retain/rollback the previous compatible signed release manifest through a verified environment envelope                              |
| Unsolicited or expired provisional cat   | Quarantine with no command admission; attach only through verified onboarding or leave on the bounded cleanup timer                                          |
| Tenant suspension/deletion               | Stop new work promptly, drain/clear only that guild, cats leave through idempotent tasks, deletion workflow continues                                        |
| Cross-tenant authorization assertion     | Fail closed, page security ownership, halt promotion and preserve evidence                                                                                   |

## 18. Test and verification strategy

### 18.1 Unit/property tests

- per-installation/guild AFR and lease state machine, stale-install generation,
  race and statistical properties;
- installation/onboarding transitions, catalog-revision cutover and idempotency;
- policy-cache expiry and fail-closed behavior;
- shard lease renewal/expiry, clock margin, partition and replacement epoch;
- config schemas and revision comparisons;
- authorization decisions for every role/action;
- outbox/inbox dedup, lease/fence and poison handling;
- observation-spool prior-boot claim, acknowledgement, coalescing and
  required-record overflow;
- redaction, URL/IP policy and byte/time limits; and
- retention/deletion state machine.

### 18.2 Integration/contract tests

- SQLite and Jasper data-plane PostgreSQL parity/migrations plus independently
  locked private control-plane migrations from supported versions;
- real Fastify injection for public/customer/staff/workload/plugin route trees;
- two-tenant horizontal/vertical access matrix;
- S3-compatible tenant prefix and signed-URL isolation;
- private plugin against supported public core SDK versions;
- plugin recursive artifact install, boot, unload and collision behavior;
- signed release-manifest and environment-envelope attestation/tamper/
  compatibility/rollback behavior;
- OAuth callback/session/CSRF/revocation with a controlled identity stub;
- Discord application catalog and observation reconciliation with fixtures; and
- image health/readiness, signals, drain and rollback.

### 18.3 Sandbox end-to-end

- new user and guild; controller plus every worker;
- controller-only activation, later worker completion;
- browser close/resume, duplicate action and cancelled Discord consent;
- run expiry with empty/observed cats and unsolicited-install quarantine/leave;
- wrong guild/no `MANAGE_GUILD`;
- cat removal, permission loss and repair;
- membership invite/change/remove and ownership transfer;
- config update/convergence/stale update;
- suspended/deleting tenant command denial;
- customer and staff unauthorized-route probes;
- first command, playback, multi-guild simultaneous same-cat use;
- deploy/drain/rollback during idle and active voice; and
- backup/restore with deletion tombstone.

Discord-dependent tests use dedicated non-production applications and guilds,
respect rate limits, and do not run destructive scenarios against preview
tenants. They do not use Discord self-bots or automate an ordinary user account.

### 18.4 Security and load

- threat-model review and code review at every trust boundary;
- dependency/image/plugin scanning and secret leak fixtures;
- SSRF redirect/DNS rebinding/private address suite;
- upload MIME/polyglot/oversize/quota tests;
- tenant ID tampering and object-key traversal;
- staff/customer/workload token confusion;
- a final-preview numeric target frozen after HJ-GOV-01 from the approved
  catalog and a declared topology across at least 5 guilds:
  `min(20, planned cat slots in that topology)`. Use enough full-cat guilds to
  target 20 whenever the catalog and 10-guild cohort permit; missing/unready
  cats fail rather than shrink the target; and
- 14-day real-guild soak with at least 1,000 playback starts.

## 19. Implementation guide and sequence

### Stage 0: lock contracts and inventory

1. Confirm provider application/cat inventory, requested permissions, intents,
   install links, verification owners, and sandbox guilds.
2. Approve the public/private contract, create the governance-only private
   repository, and add its minimal stack-neutral plugin/fixture baseline.
3. Add public and private PR CI plus a contract test skeleton.
4. In the private repository, pin public Jasper contract fixtures and build a
   time-boxed hosted-plugin spike before portal product work. Exercise
   heartbeat, observation, desired state, allow/deny, artifact boot/unload and
   both current/automatic JSX runtime compatibility for issue #38; never add a
   private hosted pointer to public Jasper.
5. Use the spike findings to approve the provider-stack/portability ADR:
   application stack, persistence, orchestration/IaC, identities, KMS, storage,
   telemetry and local substitutes.

Exit: the spike proves heartbeat, observation, desired state, access allow/deny,
package boot, and clean teardown without internal imports; the accepted ADR
unblocks application scaffolding.

### Stage 1: make shared Jasper safe by installation

1. Add runtime profile, explicit worker identities, token-safe public state, and
   least-privilege clients.
2. Replace global busy state with per-guild leases and fix retained connection
   ownership.
3. Add installation policy to Discord entry points and scope global commands,
   status and reset.
4. Introduce migrations, installation-scoped data/storage, and API policy.
5. Enforce per-installation and provider-wide operational safety limits.
6. Close legacy hosted surfaces and safe-fetch/upload paths.
7. Migrate Garage Band, Soundboard, and other persistent plugins.

Exit: two synthetic guilds cannot see, mutate, reset, or consume each other’s
owned state; one cat serves both concurrently.

### Stage 2: establish hosted runtime and control plane

1. Scaffold the ADR-approved independent applications/shared packages and
   isolated control-plane schema/migrations.
2. Implement customer Discord auth, staff OIDC, tenant/membership/cohort and
   audit.
3. Implement runtime workload identity, registration, heartbeat, observations,
   desired state, policy cache and fencing.
4. Add liveness/readiness/degraded/drain and structured telemetry.
5. Build public base and private distribution images.

Exit: sandbox tenant desired state converges through the plugin and survives
restart/control-plane interruption within policy.

### Stage 3: deliver onboarding and operations

1. Implement the application catalog and resumable installer.
2. Build marketing, customer portal and staff console critical paths.
3. Implement configuration, members, repair, removal and deletion.
4. Provision named sandbox/staging/preview environments, object storage,
   secret/KMS, monitoring, backup, promotion and rollback.
5. Publish self-hosted Compose and independent-provider documentation.

Exit: every PRD entry gate passes in sandbox and staging.

### Stage 4: private preview

1. Onboard staff guilds, then a small consented external cohort.
2. Run failure, restore, rollback, security and load exercises.
3. Complete 10-guild/14-day/1,000-playback acceptance.
4. Review qualitative feedback, unit economics signals, legal posture and
   operational burden.
5. Decide public beta scope; do not add billing inside the MVP.

## 20. Design acceptance checklist

- The public/private boundary has no private patch to core.
- The provider-stack ADR is accepted with local substitutes and portability
  boundaries.
- A controller-only guild is useful and visibly degraded.
- One cat can safely serve multiple guilds at once.
- All installation-owned state and actions carry immutable installation scope.
- Customer, staff, workload, job and plugin authorities cannot be confused.
- Supported plugin/API/admin contracts expose no bot, OAuth or cookie secret;
  the trusted same-process plugin limitation is explicit.
- Runtime startup does not publish commands or mutate schema.
- One stable lease atomically owns the complete aligned cat shard set before
  login; policy cache cannot override lease expiry.
- Ephemeral queue interruption and durable product state are distinguished.
- The hosted portal/control plane remains available through a data-plane drain.
- The signed release manifest plus deployment envelope trace the exact public
  core, private distribution, plugins, schemas, config/catalog, command and
  infrastructure revisions.
- The same open image and contracts support a documented independent
  single-instance operator.
- No payment processor or paid feature gate is required to pass MVP.
- Every failure in section 17 has a tested response and named runbook.
