# Hosted Jasper scale and ecosystem design brief

Status: **Future design stub; split into independent designs before execution**
Entry gate: A measured demand or capacity trigger for each track
Predecessor: [Public beta brief](public-beta.md); commercial launch is required
only for marketplace-commerce work

## Purpose

Capture the long-term architectural directions without coupling them to one
release. Multi-region hosting, portable provider operation, realtime
collaboration, advanced audio and untrusted plugins have different risks and
must become separate designs and epics.

## Track A — Multi-region runtime and data residency

Required design:

- tenant placement and region metadata;
- aligned application-shard ownership across regions;
- guild migration/drain and Discord session-start coordination;
- control-plane consistency and regional failure mode;
- PostgreSQL/object replication, residency and recovery;
- object/cache placement and egress;
- latency/capacity scheduler and fencing;
- customer region choice and support;
- observability without globally leaking tenant IDs; and
- rollback from a partially completed migration.

Trigger: one-region capacity, latency, residency demand or disaster-recovery
evidence justifies the operational complexity.

## Track B — Portable hosting and bring-your-own applications

Required design:

- public provider registration and compatibility protocol;
- BYOB controller/worker ownership verification and secret import/rotation;
- shard/application inventory and health;
- tenant/config/data export/import format;
- provider trust, support and responsibility boundary;
- migration between self-hosted, independent provider and purrfectsoft-hosted;
- command ownership/collision and Discord verification implications; and
- deletion/tombstone portability.

Trigger: validated independent-provider or customer demand. Proprietary account
orchestration remains optional; the protocol and formats remain open.

## Track C — Untrusted plugin isolation and marketplace

Current Node plugins are trusted and are not a foundation for arbitrary uploads.
Required design:

- process/container/WASM isolation choice;
- explicit capabilities, resource limits, egress and storage grants;
- secret denial and brokered Discord/audio operations;
- signing, publisher identity, review, scanning and revocation;
- version compatibility, migration and kill switch;
- per-tenant install/consent and data deletion;
- marketplace discovery, licensing, payouts and disputes if commercial;
- browser bundle content security; and
- adversarial escape, denial-of-service and supply-chain tests.

Trigger: meaningful third-party developer/customer demand and an accepted
sandbox threat model. Operator-trusted out-of-tree plugins continue separately.

## Track D — Authenticated realtime extensions

Required design:

- tenant/principal authentication and authorization;
- subscription topics and data minimization;
- ordering, idempotency, resume cursor and reconnect;
- horizontal fan-out/broker and backpressure;
- presence/typing semantics if needed;
- rate limits and abuse;
- durable versus ephemeral event policy; and
- client/core/plugin version compatibility.

Trigger: a specific product such as collaborative Garage Band playlists proves
value. Process-local Fastify WebSockets are not an acceptable distributed
design.

Queue resume is a separate durability decision under the same ordering,
idempotency, backpressure and version-compatibility constraints. MVP queues stay
ephemeral; design durable resume only when measured interruption cost proves
the benefit.

## Track E — Advanced collaborative audio

Required design:

- real-time mixing graph and failure isolation;
- CPU/memory/network capacity and noisy-neighbor controls;
- voice latency and degradation/fallback;
- guild/DJ/member authorization;
- licensing/media-source posture;
- recording/privacy implications if any;
- operational versus commercial limit boundary; and
- load, audio quality and rollback tests.

Trigger: isolation and capacity foundations are proven and user research
prioritizes the experience. Existing soundboard-mixing issue #36 remains
deferred until then.

## Shared constraints

- Every track retains guild/tenant scope and provider-neutral core contracts.
- Cross-region/provider/plugin boundaries use explicit identities and fencing.
- Portable formats are versioned, documented and usable without proprietary
  services.
- Commercial marketplace logic does not enter core.
- A track cannot consume privileged Discord intents without a reviewed product
  need and verification plan.
- Each track has its own PRD, threat model, data inventory, migration, operational
  model, issue plan and exit evidence.

## Portfolio decision rule

Start the smallest track that resolves a measured bottleneck or creates
validated customer value. Do not start “platform” work merely because the
interfaces can be imagined.
