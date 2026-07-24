# Hosted Jasper definition pack

Status: **Accepted**
Version: **1.0**
Last repository and live-state verification: **2026-07-25**
Implementation status: **MVP issues filed; implementation has not started and no
product code has been changed**

This directory is the accepted definition of Hosted Jasper: a provider-operated,
zero-infrastructure Jasper experience that preserves the complete, first-class
self-hosted product and its open implementation.

“Zero setup” in this pack means no infrastructure, bot-token, database, storage,
or configuration work by a customer. Discord deliberately requires a server
administrator to authorize each Discord application. Jasper cannot safely remove
those consent steps, so the product turns them into one resumable, verified
installation ceremony.

## Documents

| Document                                      | Purpose                                                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [Product brief](product-brief.md)             | Problem, vision, audiences, principles, scope, and product boundary                                                                          |
| [Current-state audit](current-state-audit.md) | Onboarding-document review, static architecture analysis, local verification, live GitHub and staging evidence, risks, and open-issue impact |
| [Product requirements](prd.md)                | Live PRD, complete MVP requirements and acceptance gates, plus the short-, medium-, and long-term feature index                              |
| [Plugin feasibility](plugin-feasibility.md)   | Decision and scorecard for packaging the proprietary distribution around Jasper’s out-of-tree plugin workflow                                |
| [MVP technical design](mvp-design.md)         | Runtime, control-plane, tenancy, onboarding, security, data, deployment, and testing design                                                  |
| [MVP issue plan](mvp-issue-plan.md)           | Filed issue-by-issue source of truth, ownership, dependencies, sequencing, and acceptance outcomes                                           |
| [Future phases](future-phases.md)             | Concrete design briefs for public beta, commercial launch, and the longer-term hosting platform                                              |

## Accepted decision

Proceed with a **plugin-led, not plugin-only** hosted distribution:

- Keep Jasper core, its multi-cat runtime, AFR, self-hosting, generic hosting
  contracts, and single-instance orchestration open.
- Use the private
  [`purrfectsoft/jasper-hosted`](https://github.com/purrfectsoft/jasper-hosted)
  repository for proprietary delivery.
- Make that repository plugin-shaped at its Jasper integration boundary, while
  also housing independently deployed proprietary marketing, customer,
  control-plane, staff, and operations applications.
- Add only vendor-neutral capabilities to Jasper core: per-guild worker leases,
  installation-scoped data and storage, authenticated extension routes,
  lifecycle and health contracts, explicit worker configuration, deterministic
  packaging, and documented deployment interfaces.
- Keep billing, plans, acquisition analytics, hosted account and membership
  management, staff administration, and provider automation private.

The distinction matters. Jasper plugins currently execute as trusted code inside
the bot process. That is an excellent integration point for a hosted runtime
adapter, but it is the wrong failure, scaling, and security boundary for a public
website or control plane.

## MVP outcome

An invited Discord server administrator can:

1. discover Hosted Jasper on the proprietary marketing site;
2. sign in with Discord;
3. choose a server they may manage;
4. authorize Jasper and each available worker cat through a guided flow;
5. watch every installation become verified automatically;
6. choose a small set of safe preferences; and
7. use Jasper without supplying a token or operating any infrastructure.

The MVP is a limited, free private preview. Every accepted guild receives the
same product capability. Access cohorts and operational limits protect a young
service; they are not paid feature gates. Payment, subscription, and premium
feature enforcement are explicitly deferred.

## Architectural through-line

```text
customer and staff browsers
        │
        ▼
private marketing / portal / staff console
        │
        ▼
private control-plane API ─── PostgreSQL / object storage / secret manager
        │  authenticated outbound polling and observations
        ▼
private hosted runtime plugin
        │  stable public plugin and installation contracts
        ▼
open Jasper core ─── controller + worker cats ─── Discord guild voice
```

The first runtime cell operates one shard for every provider-owned cat
application and serves multiple guilds. A cat may serve one voice channel in
each guild at the same time. It must not be represented by the current
process-global `busy` flag.

## Approval record and execution gates

The team approved this pack on 2026-07-25. Approval authorized repository
scaffolding and issue filing; it did not authorize a production launch.

- Public/private ownership, the plugin-led boundary, the one-region private
  preview, and its acceptance targets are accepted.
- [`purrfectsoft/jasper-hosted`](https://github.com/purrfectsoft/jasper-hosted)
  is the private delivery repository. It remains intentionally empty until
  HJ-PRV-01 owns the first reviewed scaffold.
- [HJ-EPIC](https://github.com/sakibtamim/Jasper/issues/124) is the public
  coordination point and
  [HJ-PRV-00](https://github.com/purrfectsoft/jasper-hosted/issues/1) is the
  complete authorized delivery index.
- All 50 stable IDs are filed: 22 public Jasper items, 24 private hosted items,
  and 4 private Garage Band items. HJ-OSS-07 deliberately reuses and re-scopes
  existing issue #122.
- The existing `deploy` branch remains a legacy self-hosted staging lane until
  HJ-OPS-03 establishes and validates its replacement.
- Real-guild admission remains blocked on the PRD safety, product, security,
  privacy, recovery, and operations gates.

## Terms used here

- **Jasper**: the controller application and the product as a whole.
- **Cat** or **worker**: an additional Discord bot application used as an
  independent voice body.
- **AFR**: Automatic Feline Rotation, Jasper’s weighted controller/worker
  selection and reuse behavior.
- **Guild**: a Discord server.
- **Tenant**: the hosted commercial/account boundary mapped one-to-one to a
  Discord guild in the MVP.
- **Installation ID**: the immutable data-ownership generation for one tenant;
  reinstall after final purge receives a new value even for the same guild.
- **Runtime cell**: one fenced owner of an aligned set of Discord shards for the
  controller and every worker application.
- **Control plane**: private account, onboarding, configuration, membership, and
  operational coordination services.
- **Data plane**: Jasper’s Discord gateway, commands, queues, media resolution,
  and voice playback runtime.
