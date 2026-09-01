# Hosted Jasper public beta design brief

Status: **Future design stub; implementation not authorized**
Entry gate: Accepted MVP completion report
Predecessor: [MVP technical design](../mvp-design.md)

## Intended outcome

Open Hosted Jasper admission to a wider, still carefully managed audience while
preserving tenant safety, predictable Discord/runtime capacity, transparent
service health, and supportability. Billing is not required and is not part of
this brief.

## Decisions already inherited

- Open Jasper remains the data plane.
- The private product remains a plugin-led distribution with separate control
  plane and web surfaces.
- One Discord guild maps to one tenant unless a new migration design proves a
  reason to change it.
- Provider-owned controller/worker applications remain the default.
- Every application uses aligned shard count/IDs.
- Runtime placement is fenced; duplicate shard owners are invalid.
- Core contracts remain provider-neutral and self-hosted.
- Customer and staff identity remain separate.

## Measured inputs required before full design

- Peak and p95 CPU, memory, event-loop and extraction load by guild and voice
  concurrency.
- Discord session-start/rate-limit behavior across every cat application.
- Preview onboarding conversion, time, abandon and repair distribution.
- Per-cat utilization, AFR distribution, controller-only frequency and
  saturation.
- Control-plane API, outbox, observation and config convergence load.
- Actual RPO/RTO drill results and incident/support burden.
- Cost per active guild, playback start and concurrent voice hour.
- Abuse, takedown, deletion and privacy-support cases.

These inputs choose shard count, cell size, admission rate, support staffing and
object/database capacity. They must replace guesses in the full design.

## Required design sections

The phase design must specify:

1. shard-count transition and aligned multi-application rollout;
2. cell placement, fencing, capacity scoring and rebalancing;
3. control-plane horizontal scaling and outbox/broker decision;
4. PostgreSQL/object-store high availability and regional recovery;
5. self-service admission, waitlist, abuse and suspension/appeal;
6. customer status, maintenance and incident communications;
7. support queues, safe diagnostics and escalation;
8. data export, privacy controls, DPA and subprocessor posture;
9. accessibility, localization and onboarding experiments;
10. reconciled usage/cost ledger with no entitlement enforcement;
11. revised SLO/error-budget proposal and public-status posture;
12. migration, rollback, chaos, load and exit tests; and
13. public/self-hosted impact and independent-provider documentation.

## Architectural questions to decide from evidence

- At what measured load should a shard/cell split occur before Discord’s hard
  guild ceiling?
- Can PostgreSQL outbox polling meet observed fan-out, or is a broker justified?
- Does the runtime require geographic cells for latency, or only disaster
  recovery?
- Which operational limits prevent noisy neighbors without masquerading as
  premium tiers?
- Which support actions are safe enough for automated customer repair?
- Is a formal public service objective useful during beta, and at what measured
  level?

## Explicit exclusions

- Paid plans, payment providers and subscription enforcement.
- Untrusted plugin marketplace.
- Multi-region active/active playback unless the measured beta requirement
  independently justifies it.
- Collaborative playlist WebSockets without an authenticated distributed
  transport design.

## Exit evidence

- A defined wider-admission cohort runs through the accepted soak period.
- New shard/cell placement passes fencing, migration and failure drills.
- Capacity headroom and admission policy are supported by measured load.
- Support, abuse, privacy and incident workflows meet their service targets.
- Usage/cost events reconcile without affecting feature access.
- Self-hosted release and independent-provider contract remain green.
- A commercial-phase evidence package can answer every input in the commercial
  brief.
