# Hosted Jasper product brief

Status: **Accepted**
Related: [PRD](prd.md) · [MVP design](mvp-design.md) ·
[Plugin decision](plugin-feasibility.md)

## The opportunity

Jasper already has a distinctive product architecture: one controller, multiple
independent voice cats, Automatic Feline Rotation, queue and playback controls,
media extraction and caching, and a full-stack plugin system. The tradeoff is
that the current experience assumes an operator who can create Discord
applications, copy multiple tokens, configure a database and media tools, run a
Node process, and maintain it.

Hosted Jasper should remove that operational work without flattening the product
into a generic single-bot music service or weakening the open-source edition.

## Product statement

For Discord communities that want Jasper’s multi-cat music experience without
running infrastructure, Hosted Jasper is a provider-operated edition that
installs through a guided Discord flow and stays observable, recoverable, and
upgradable for them.

Unlike a separate closed rewrite, it runs the same open Jasper data plane behind
well-documented hosting contracts. Proprietary software supplies acquisition,
accounts, membership, onboarding, provider operations, and—later—commerce.

## Goals

1. Deliver a zero-infrastructure, zero-token, zero-manual-configuration customer
   journey.
2. Preserve controller/worker behavior, AFR, concurrent multi-cat playback,
   caching, and the open plugin contract; enable only the plugin features that
   pass the hosted safety inventory.
3. Make multiple real Discord guilds safe tenants of one provider-operated
   runtime.
4. Keep self-hosting first-class and document enough orchestration for another
   OSS consumer to operate their own Jasper offering.
5. Prove the service through a limited free preview before introducing payments
   or paywalled capabilities.
6. Keep proprietary product logic out of core while delivering a bounded,
   provider-neutral foundational program with generally useful contracts.
7. Provide customer and staff experiences that are auditable, accessible, and
   safe by default.

## Non-goals for the MVP

- Stripe, invoices, taxes, paid plans, checkout, subscriptions, or paid feature
  enforcement.
- A public, unbounded self-service launch.
- A third-party untrusted plugin marketplace.
- The current dynamic Garage Band/Soundboard web panels inside the proprietary
  customer portal; MVP plugin feature access is Discord-command-only after each
  plugin passes the hosted allowlist.
- Multi-region active/active playback.
- Per-customer infrastructure or customer-supplied bot tokens.
- A rewrite of Jasper commands, audio, queueing, or plugin features.
- Real-time collaborative Garage Band playlists or real-time soundboard mixing.
- Perfectly interruption-free voice sessions during every runtime deployment.
- Hiding the open-source implementation or withholding the generic hosting
  contract.

## Audiences and jobs

### Discord server owner

“Let my community use Jasper’s supported multi-cat experience without becoming
its DevOps engineer.”

Needs a clear consent flow, trustworthy permissions, fast readiness, member
delegation, status visibility, and complete removal.

### Discord server administrator

“Configure Jasper and recover common problems without access to provider
infrastructure.”

Needs scoped permissions, cat-install status, safe configuration, usage and
incident visibility, and actionable repair steps.

### Community member

“Use familiar Jasper commands and get reliable playback.”

Needs low command latency, clear degraded-mode messages, fair cat allocation,
and no hosted-account requirement for ordinary Discord commands.

### Support and product staff

“Understand onboarding and service health without broad production access.”

Needs least-privilege staff roles, tenant-aware views, redacted diagnostics,
audited recovery actions, funnel measurements, and cohort controls.

### Jasper contributor or independent host

“Run or extend the same data plane without proprietary services.”

Needs stable contracts, local providers, containers and Compose, migration and
backup instructions, health probes, upgrade/rollback guidance, and transparent
architectural decisions.

## Experience principles

### Consent is part of the product

Each cat is a distinct Discord application and therefore has its own
application-specific authorization URL. A server manager must approve each one.
The portal explains why, opens each authorization, watches Discord gateway
observations, and resumes at the first incomplete cat.

### Useful before perfect

The controller becomes usable as soon as it is installed and verified. Missing
worker cats reduce concurrency and AFR variety but do not make Jasper unusable.
The dashboard shows the exact capacity and offers “install next cat.”

### No secret handoff

Customers never see or paste provider bot tokens, cookie pools, database
credentials, object-store keys, or runtime URLs.

### Same product, explicit operating profile

Core has `self-hosted` and `hosted` runtime profiles with common behavior.
Hosted-only policy arrives through a private adapter rather than scattered
edition checks. Self-hosted defaults remain local, understandable, and usable.

### Transparent source boundary

Hosted pages state that the data plane is Jasper OSS and link to its source and
self-hosting guide. They separately identify the proprietary control-plane
components. Generic fixes are upstreamed rather than maintained as a private
fork.

### Safety limits are not monetization

Rate limits, upload caps, queue caps, and invitation cohorts prevent abuse and
protect service quality. They apply for operational reasons and are not framed
as premium entitlements during the MVP.

## Scope boundary

| Open Jasper and public artifacts                        | Private Hosted Jasper                            |
| ------------------------------------------------------- | ------------------------------------------------ |
| Discord commands, queues, playback, AFR, worker leasing | Marketing site and acquisition funnel            |
| Installation-aware plugin/runtime contracts             | Hosted Discord login and account sessions        |
| Tenant-safe database and storage interfaces             | Customer membership and hosted tenant records    |
| API policy primitives and operator isolation            | Guided multi-application onboarding              |
| Health, readiness, metrics, drain, shard metadata       | Staff SSO, RBAC, audit and support console       |
| Deterministic plugin packaging and verification         | Provider configuration and secret orchestration  |
| OCI image, Compose, migrations, backup/restore commands | Private runtime adapter and control-plane API    |
| Self-host and independent-provider documentation        | Funnel/product analytics and communications      |
| Provider-neutral entitlement interface                  | Future billing, plans, trials, and subscriptions |

This boundary is defined by reusable capability, not by commercial advantage.
Anything needed to operate Jasper correctly or securely belongs in the open
core. Provider-specific customer acquisition and business operations do not.

## MVP proposition

The MVP is an invite-only, free preview in one region using provider-owned
Jasper and worker applications. It supports:

- Discord sign-in and manageable-guild selection;
- resumable controller and worker authorization;
- automatic observation and verification;
- a complete controller-only degraded mode;
- installation-scoped configuration, membership, status, and usage summaries;
- separate, strongly authenticated staff operations;
- one logically multi-tenant runtime cell with PostgreSQL and object storage;
- a published launch-time inventory of enabled commands/plugins and known
  self-hosted-only web surfaces;
- immutable, promoted releases with health checks and rollback;
- documented deletion, backup, restore, incident, and support paths; and
- a real-guild soak and load-validation program.

## Accepted MVP success threshold

The private preview is successful when all launch gates in the PRD pass,
including:

- at least 10 consented real guilds complete onboarding;
- at least 3 guilds install the full available cat set;
- the cohort produces at least 1,000 playback starts over a 14-day soak;
- a controlled test reaches a numeric target frozen from the approved catalog
  and declared topology across at least 5 guilds:
  `min(20, planned cat slots in that topology)`; the topology uses enough
  full-cat guilds to target 20 whenever the catalog and 10-guild cohort permit,
  and missing/unready cats fail rather than lower the target;
- median ready-to-use onboarding is at most 5 minutes, excluding time spent on
  Discord’s own consent screens;
- at least 99% of received interactions are acknowledged within Discord’s
  deadline and at least 95% of supported playback attempts start;
- no cross-tenant disclosure and no unresolved severity-0 or severity-1
  security or data-loss defect; and
- a restore drill and previous-release rollback both succeed.

These are accepted MVP targets, not claims about the present system.

## Product risks

| Risk                                                         | Product response                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Multiple bot authorizations feel like setup                  | Explain the multi-cat value, sequence one click at a time, poll for completion, support controller-only use, and resume safely     |
| Discord verification or privileged-intent limits delay scale | Remove unused privileged intents, inventory every app early, and make app verification a launch gate                               |
| Upstream media extraction is volatile                        | Pin and verify media tools, publish provider status, distinguish unsupported sources from Jasper faults, and review platform terms |
| Shared runtime could leak tenant data                        | Make installation context mandatory, default routes to deny, test isolation, and block preview launch on any leakage               |
| Plugins are trusted in-process code                          | Allowlist and pin operator plugins; do not market current plugins as a sandbox                                                     |
| Hosted work degrades self-hosting                            | Require local adapters, migration docs, Compose, and self-host acceptance tests for every new core seam                            |
| Commerce leaks into OSS or arrives too early                 | Use a provider-neutral entitlement contract and a free resolver; defer payment implementation until post-preview evidence          |

## Decision record

On 2026-07-25, product ownership approved:

1. the plugin-led/private-control-plane architecture;
2. the one-guild-to-one-tenant MVP model;
3. controller-only service while workers are being installed or are degraded;
4. the private-preview targets and one-region constraint;
5. [`purrfectsoft/jasper-hosted`](https://github.com/purrfectsoft/jasper-hosted)
   as the private delivery repository; and
6. proprietary marketing, portal, control plane, staff console, and future
   commerce with open integration contracts.
