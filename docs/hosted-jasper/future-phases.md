# Hosted Jasper future-phase briefs

Status: **Deliberately deferred beyond MVP**
MVP design of record: [Hosted Jasper MVP technical design](mvp-design.md)

This roadmap prevents the MVP from accidentally hard-coding later commerce or
scale decisions. It is not permission to implement a future phase early.

## Phase model

| Phase                    | Outcome                                                                                                 | Entry evidence                                                  | Design brief                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| 1 — Limited free preview | Prove safe hosted Jasper with invited real guilds in one region                                         | This definition approved                                        | [MVP design](mvp-design.md)                                 |
| 2 — Public beta          | Make admission, reliability, capacity, privacy and support safe for a wider free audience               | Every MVP completion gate plus reviewed preview report          | [Public beta brief](designs/public-beta.md)                 |
| 3 — Commercial launch    | Add measured, legally ready plans, trials, payments and subscriptions without coupling commerce to core | Stable beta operations, cost/usage ledger and pricing evidence  | [Commercial design brief](designs/commercial-launch.md)     |
| 4 — Scale and ecosystem  | Multi-region placement, portable hosting and safely extensible realtime/plugin platform                 | Demonstrated demand or scale trigger for each independent track | [Scale and ecosystem brief](designs/scale-and-ecosystem.md) |

## Cross-phase rules

1. A later-phase database field may be reserved only when its meaning and
   ownership are provider-neutral. Do not implement dormant Stripe objects in
   core.
2. Every core contract continues to have a self-hosted implementation and public
   documentation.
3. Access controls for operational safety remain separate from commercial
   entitlement decisions.
4. A phase starts with an evidence review and an accepted detailed design, not
   merely completion of a calendar milestone.
5. Each future design records migration, rollback, security, privacy,
   accessibility, observability, support and deletion behavior.
6. Feature gates never live only in a browser or private plugin; authoritative
   decisions cross a public provider-neutral interface at execution.
7. A private implementation may stay private, while its required runtime
   semantics and self-host implications stay public.

## Medium-term feature groups

### Public beta readiness

- Automated but capacity-aware admission/waitlist.
- Horizontally scalable control-plane API and workers.
- Additional gateway shards/cells with deterministic placement and fencing.
- Higher availability, regional disaster recovery and repeated chaos drills.
- Customer maintenance/incident notifications and richer status/support.
- Abuse detection, appeals and safe service suspension.
- Customer data export, clearer privacy controls, DPA/subprocessor posture.
- Better onboarding recovery, localization and accessibility evidence.
- Reconciled usage/cost ledger without paid enforcement.
- Published beta objectives and service-history transparency.

The public beta can remain free. “More users” is not sufficient entry evidence;
tenant isolation, operations and support must withstand unbounded acquisition.

### Commercial readiness

- Auditable usage meter and cost allocation.
- Provider-neutral entitlement decision/snapshot contract.
- Product catalog, prices, trial/grace/coupon policy and plan transitions.
- Checkout, tax, invoices, refunds, dunning and payment-provider webhooks.
- Customer billing portal and staff finance/support roles.
- Reconciliation, revenue/data retention and subscription incident runbooks.
- Capability enforcement with safe cache/outage/grace behavior.

No payment provider is selected by this roadmap. Existing issue #98’s direct
Stripe-in-core design is superseded by this boundary when the phase starts.

## Long-term feature groups

The following are independent tracks and should not be bundled into one giant
release:

- Multi-region runtime placement, tenant migration and data residency.
- Bring-your-own Discord applications and independent-provider federation.
- Portable tenant export/import based on open formats.
- Untrusted plugin isolation, permissions, signing, review and marketplace.
- Authenticated horizontally scalable realtime extension transport.
- Collaborative Garage Band playlists over that transport.
- Real-time sound mixing after capacity, quota and degradation behavior exist.
- Fine-grained DJ/member policies and richer Discord-native administration.

Each track must prove customer value or an operational threshold before it
earns a full design.

## Evidence handed from one phase to the next

The completion report for every phase includes:

- cohort, guild, cat, command, playback and concurrency distribution;
- onboarding conversion/time/repair and abandonment;
- reliability, latency, failure classification and upstream dependency health;
- resource use and cost per active guild/playback/concurrent voice session;
- security, abuse, privacy, deletion, restore and incident results;
- customer/support feedback and retention;
- self-hosted regressions and independent-provider feedback;
- known architecture debt and capacity limits; and
- accepted, rejected and deferred next-phase hypotheses.

That report supplies the measured fields named in the future design briefs.

## Future issue policy

Do not file implementation issues for a future design until its entry gate and
design review pass. It is acceptable to file a bounded research/spike issue when
a current phase depends on reducing a named uncertainty. Label future work
clearly and do not attach it to the MVP milestone.
