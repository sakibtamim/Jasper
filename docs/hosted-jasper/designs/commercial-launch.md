# Hosted Jasper commercial launch design brief

Status: **Future design stub; no payment or gating implementation authorized**
Entry gate: Stable public beta plus accepted economics/legal evidence
Predecessor: [Public beta brief](public-beta.md)

## Intended outcome

Offer understandable plans, an optional trial, reliable payment/subscription
management, and enforceable entitlements without putting payment-provider logic
in Jasper core or degrading the free/self-hosted product.

## Decisions already inherited

- Payment, plan, customer billing and subscription state are proprietary.
- Jasper core exposes only a provider-neutral capability/entitlement contract.
- Operational safety limits are independent of paid entitlements.
- The authoritative decision is enforced at execution, not only in portal UI.
- Runtime can use a bounded, signed/authenticated entitlement snapshot during a
  control-plane outage.
- Self-hosted defaults do not require an entitlement service.
- Existing issue #98 is not implemented as `stripe.ts` in the bot.

## Evidence required before full design

- Reconciled infrastructure/support cost by active guild, playback and peak
  concurrency.
- Retention and willingness-to-pay research from preview/beta owners.
- Capability usage and resource correlation, without retroactive tracking
  expansion.
- Target countries/currencies, legal entity, tax, invoice, refund and consumer
  protection requirements.
- Expected free/trial abuse and acquisition conversion.
- Customer-support staffing and dunning/cancellation expectations.
- Payment-provider comparison based on the actual business footprint.

## Required design sections

1. product catalog, public/free commitment and capability vocabulary;
2. plan/version lifecycle and migration rules;
3. trial eligibility, start/end, grace and reactivation;
4. checkout, customer billing portal and payment-provider selection;
5. tax, currency, invoices, receipts, refunds and chargebacks;
6. subscription create/change/cancel/pause/dunning state machine;
7. webhook signature, replay, ordering, idempotency and reconciliation;
8. usage ledger, late events, corrections and billing-period close;
9. entitlement resolver/snapshot, cache, expiry and outage behavior;
10. runtime enforcement, user messaging and active-playback transition;
11. customer/staff RBAC and audited finance/support operations;
12. privacy, PCI scope, retention, export and account deletion;
13. feature/plan experiment governance and accessibility;
14. migration from whole-product free beta;
15. failure, sandbox, reconciliation and rollback tests; and
16. OSS source boundary and public documentation updates.

## Safety constraints

- Never store raw card data in Jasper or its control plane when a hosted payment
  page/tokenized provider can keep it out of scope.
- A webhook is an input, not the subscription source of truth; reconcile with
  provider records.
- Duplicate, reordered and delayed events cannot grant or revoke twice.
- A provider outage has an explicit grace posture; it must not terminate active
  audio unexpectedly.
- Plan downgrade/removal has a clear timing rule and preserves customer data for
  the published period.
- No browser-only gate protects a paid capability.
- A compromised runtime cannot mint its own entitlement.
- Billing staff do not automatically gain runtime/secret access.

## Decisions intentionally not made

- Stripe or another payment provider.
- Price, currency, free-plan limits or trial duration.
- Which Jasper or Garage Band capabilities, if any, are paid.
- Whether usage affects invoices.
- Annual, team, nonprofit or sponsorship offerings.

These choices require the evidence above and must be written into the accepted
commercial PRD, not inferred from old issues.

## Exit evidence

- Sandbox and production-like billing reconciliation close with zero unexplained
  variance.
- Trial, upgrade, downgrade, cancellation, failed-payment, refund and deletion
  journeys pass.
- Runtime entitlement outage/grace/recovery drills pass without cross-tenant
  decisions.
- Legal, tax, privacy and support procedures are approved.
- Public/self-hosted behavior remains complete without private commerce.
- Commercial launch metrics and rollback/kill-switch owners are named.
