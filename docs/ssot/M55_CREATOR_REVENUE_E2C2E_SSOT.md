# M55 Creator Revenue / E2C2E SSOT

Status: **ACTIVE / HUMAN-APPROVED ROADMAP CONTRACT**

**IMPLEMENTATION STATUS:** CREATOR CASH INFRASTRUCTURE **NOT IMPLEMENTED**

Sole executable CURRENT/NEXT authority remains `docs/ssot/M55_EXECUTION_STATE.json`. This document is the durable planning contract for the Creator Revenue program.

---

## A. E2C2E term

- `E2C2E` is a Human shorthand.
- Do **not** invent or freeze an acronym expansion unless Human later defines it.
- Its normative meaning is the state-machine creator acquisition / attribution / purchase / commission / payout / re-sharing loop defined in this SSOT.

---

## B. Safe distribution loop

Normative conceptual flow:

`SHARE_READY`
→ `DIRECT_ATTRIBUTION_RECORDED`
→ `ELIGIBLE_PURCHASE_CONFIRMED`
→ `COMMISSION_PENDING`
→ optional `COMMISSION_HOLD_REVIEW`
→ `COMMISSION_PAYABLE`
→ `PAYOUT_REQUESTED`
→ `PAYOUT_PROCESSING`
→ `PAYOUT_POSTED`

Exceptional paths:

- `PURCHASE_REFUNDED` → `COMMISSION_REVERSED` / `CANCELED`
- `CHARGEBACK` → `COMMISSION_REVERSED` / `NEGATIVE_ADJUSTMENT` as contract permits
- `FRAUD_FLAG` → `HOLD` → `REVIEW` → `RELEASE` / `DECLINE` / `PARTNERSHIP_PAUSE`
- `PAYOUT_FAILED` / `RETURNED` → reconciliation, not silent success

---

## C. Anti-MLM / creator safety

Hard requirements:

- single-tier **DIRECT** referral only
- one eligible purchase can credit at most one directly attributed creator
- no upline/downline override commission
- no commission for merely recruiting creators
- no recursive compensation
- no joining fee
- no required purchase or inventory to qualify
- purchaser status is **not** required merely to be an eligible promoter
- Free user may become an approved promoter
- self-referral prevention
- circular-referral prevention
- duplicate identity/payment abuse detection
- fraud flag/hold/review lifecycle
- refund/chargeback commission reversal
- severe abuse may immediately disable referral capability
- forfeiture/partnership termination requires documented policy and Human review unless an already-approved safety rule mandates immediate stop
- no deceptive earnings promises
- no "easy money" / guaranteed-income claims
- creator must use approved M55 claims/disclosure assets

---

## D. Creator trust surface

Before creator revenue launch, creator must be able to understand:

- what M55 is
- exact product being recommended
- current public price/billing type
- what user receives
- refund/cancellation conditions
- support/contact route
- post-purchase recovery/revisit route
- how attribution works
- when a commission is merely pending
- why it may be held/reversed
- payout prerequisites
- payout timing/threshold once finalized
- disclosure requirements
- privacy/data boundary
- dispute/support route

Creator must **not** need to handle customer card details or recipient banking secrets directly when Stripe-hosted collection is available.

---

## E. Internal commission ledger — required architecture

M55 owns commission eligibility/accounting state.

At eligible Stripe-confirmed purchase:

- create idempotent internal commission event
- status initially `PENDING`

`PENDING` does **not** mean money has been paid or irrevocably earned.

Only after:

- required refund/cancellation window
- fraud checks
- eligibility checks
- attribution checks
- chargeback state as defined by policy

may it become: `PAYABLE` / `VESTED`.

Only `PAYABLE` amounts may enter payout execution.

Do **not** call this:

- Stripe escrow
- Connect escrow
- escrow

unless Stripe/legal authority explicitly approves an actual escrow product.

Exact duration, payout threshold, payout cadence, and final commission calculation base remain future gate decisions.

`TARGET_COMMISSION_RATE = 50%` remains:

- **HUMAN TARGET ONLY**
- **NOT** provider-approved
- **NOT** legal/tax-approved
- **NOT** final accounting basis
- **NOT** the permanent standard rate

Normative meaning after Human freeze (2026-09-05): `TARGET_COMMISSION_RATE = 50%` names the **FOUNDING CREATOR INTRODUCTORY ACQUISITION RATE** only.

---

## H. Two-lane reward architecture (Human-approved 2026-09-05)

### General User lane

- cash payout **prohibited**
- cash-equivalent transferable balance **prohibited**
- general-user benefit design remains **R2-E** work
- do **not** freeze a 10% discount yet
- candidate benefit forms include: referred-user discount, M55 digital unlock, Pair-specific unlock
- exact benefit/value/trigger remains **unresolved until R2-E**
- general referral must **not** require the referrer to be a Premium purchaser unless later legal review explicitly approves that structure

### Approved Creator lane

Cash commission requires all of:

- application
- M55 approval
- direct single-tier attribution
- compliant disclosure
- Product Truth / claims compliance
- refund/fraud/chargeback eligibility review

No open cash-affiliate lane without approval.

---

## I. Frozen creator rate schedule (Human-approved 2026-09-05)

Preserve the literal verifier-required tokens above. Normative schedule:

| Rate name | Percent | Applies when |
|---|---|---|
| **FOUNDING BOOST RATE** | **50%** | Until the earlier of: first **10** eligible conversions **or** **90** days after creator approval |
| **FOUNDING TRANSITION RATE** | **40%** | After Founding Boost until the earlier of: **50** cumulative eligible conversions **or** **180** days after creator approval |
| **FOUNDING LEGACY RATE** | **35%** | After Founding Transition for creators admitted into the Founding Creator cohort, subject to continued compliance and the active program contract — **not** described as irrevocably guaranteed for life |
| **STANDARD APPROVED CREATOR RATE** | **30%** | Approved Creators admitted **after** the Founding Creator cohort unless a later Human-approved campaign explicitly overrides |

Hard rules:

- no automatic MLM / downstream / volume-tree rates
- no retroactive reduction of already **PAYABLE** commission
- **PENDING** commission remains reversible according to refund, chargeback, fraud and eligibility rules
- recording **50%** in this SSOT does **not** make it live without R2-D cohort budget / stop-loss closure

---

## J. COMMISSIONABLE_REVENUE (commission base)

**COMMISSIONABLE_REVENUE** means the eligible customer amount actually collected after discounts, excluding consumption tax and excluding refunded, charged-back, reversed or otherwise ineligible amounts.

Creator percentage is calculated against **COMMISSIONABLE_REVENUE**.

Payment-processing fees are borne by M55 and are **not** deducted from the Creator commission base.

Any legally required withholding/tax treatment on creator payout is a separate payout/tax obligation and does **not** redefine the commercial percentage.

Do **not** invent tax certainty in this SSOT.

---

## K. Payout economic rule

- never payout once per purchase
- payout execution must aggregate creator commission by period/threshold
- exact payout threshold and cadence remain **unresolved** until provider, tax and operational confirmation
- internal `PENDING` is **not** escrow
- only `PAYABLE` may enter payout execution

Stripe payout provider remains: **UNSELECTED**

Creator cash infrastructure remains: **NOT_IMPLEMENTED**

---

## L. Founding program stop-loss (unresolved before activation)

Rate schedule is frozen by this decision. Still unresolved before activation:

- Founding cohort size
- program-level total acquisition budget cap
- launch dates
- refund/fraud reserve assumptions
- payout threshold/cadence
- exact provider supportability
- tax/legal execution mechanics

Therefore **50%** must **NOT** become live merely because this SSOT records it.

**R2-D** must freeze cohort budget and stop-loss before activation.

---

## M. External claim boundary

Allowed future commercial direction (only with final public terms):

> Founding Creators: eligible purchases may earn up to 50% commission

Final public terms must clearly disclose:

- limited eligibility
- approval requirement
- time/conversion limits
- commission base
- pending/reversal rules

Prohibited claims:

- guaranteed income
- easy money
- unlimited income
- passive-income guarantee
- recruitment reward
- MLM wording

---

## N. R2 sub-gates (planning contract)

| Sub-gate | Scope | Status |
|---|---|---|
| **R2-A** `COMPETITIVE_REWARD_BENCHMARK` | one-time Japan/competitor research input | **ONE-TIME RESEARCH COMPLETE / REUSE** — do not repeat absent invalidator |
| **R2-B1** `JAPAN_LEGAL_STRIPE_PREFLIGHT` | official-source issue mapping and STOP conditions | open |
| **R2-C** `M55_TWO_LANE_REWARD_CONTRACT` | General non-cash / Approved Creator cash split | contract direction frozen here; implementation future |
| **R2-D** `FOUNDING_CREATOR_ECONOMICS` | rate schedule frozen by this decision; remaining: cohort size, total budget cap, stop-loss, provider-cost confirmation | open |
| **R2-E** `GENERAL_USER_VIRAL_VALUE_DESIGN` | select strongest non-cash viral benefit without leaking Premium value or increasing legal/payment complexity | open |
| **R2-B2** `EXTERNAL_SUPPORTABILITY_CONFIRMATION` | only after M55 converges to one final model: Stripe account-specific confirmation plus necessary Japan legal/tax professional confirmation | blocked until R2-C/D/E convergence |

Do not decide yet whether 50% is before/after tax, Stripe fees, refunds, or other contract adjustments beyond the **COMMISSIONABLE_REVENUE** definition until unit economics / provider / legal gate closes.

---

## F. Stripe boundary

Existing customer purchase rail remains existing Stripe checkout/webhook authority.

Creator payout preference: **STRIPE-NATIVE**.

Provider product is **NOT** selected yet.

Candidate families include:

- Stripe Connect payouts
- Stripe Global Payouts
- another Stripe-supported payout architecture if Stripe directs M55 there

Do **not** assert:

- Stripe Connect is already chosen
- Global Payouts is available to the current Japan M55 account
- Global Payouts is Production-ready
- Stripe has approved M55 creator payouts
- Stripe provides M55 "escrow"

Current external evidence as of 2026-09-05:

- Stripe prohibits pyramid / multi-level commission or recruitment-based sales structures.
- Escrow services are restricted and cannot be casually represented as a Connect feature.
- Stripe Global Payouts is currently Public Preview.
- Stripe documentation explicitly describes affiliate payouts and creator/influencer payouts as Global Payouts use cases.
- Connect payouts and Global Payouts have different fund-flow, compliance and availability models.
- exact M55 account/country/business-model support must therefore be freshly reverified before payout implementation/activation.

Hard provider gate:

If no Stripe-native product is currently approved/supported for M55's actual Japan account/business model: **STOP**. Do not invent a pass-through, escrow or money-transmission workaround.

---

## G. Automation boundary

Allowed future automation after its roadmap gates:

- referral/share link generation
- approved share asset generation
- direct attribution recording
- Stripe purchase-event ingestion
- idempotent commission-event creation
- pending/hold/payable state transitions
- fraud/reversal workflows
- dashboard visibility
- Stripe-native payout creation after approval
- payout status/reconciliation events

**NOT** allowed:

- unauthorized automated posting to social accounts
- spam
- fake engagement
- recruitment-only reward
- hidden referral disclosure
- recursive MLM reward graph

A referred customer may later become an approved promoter, which can create another **DIRECT** referral edge. That does **not** create an upline commission. Each purchase remains single-tier/direct.

---

## Canonical staged roadmap (R1→R8+)

| Stage | Gate | Status |
|---|---|---|
| R1 | `FOUR_SURFACE_CREATOR_READINESS` | **CLOSED GREEN** |
| R2 | `REVENUE_SAFETY_E2E` | **ACTIVE** — Human-accepted cold-start PASS 2026-09-05 |
| R3 | `M55-INFLUENCER-PRODUCT-LAUNCH-READINESS-CODEX-AUDIT` | future |
| R4 | `M55-CREATOR-DISTRIBUTION-FOUNDATION` | future |
| R5 | `ATTRIBUTION_AND_COMPLIANCE` | future |
| R6 | `COMMISSION_LEDGER` | future |
| R7 | `CREATOR_DASHBOARD` | future |
| R8 | `PAYOUT_AND_SETTLEMENT` | future |
| — | `M55-CODEX-CREATOR-INFRA-AUDIT` | future |
| — | `INVITE_ONLY_CREATOR_BETA` | future |
| — | `M55_CREATOR_REVENUE_READY` | future |
| — | `CONTROLLED_SCALE` | future |

### R2 boundary — `REVENUE_SAFETY_E2E`

Evidence/mapping-first. Must:

- reuse prior CLOSED GREEN payment/checkout/webhook/fulfillment evidence unless an invalidating dependency changed
- validate product description, price, billing type, deliverable, refund conditions, support/contact and post-purchase recovery
- validate current Stripe revenue path / entitlement continuity
- **NOT** implement creator payout infrastructure
- **NOT** rerun a real payment merely because this is a new lane/chat
- require separate Human GO for any real payment when truly necessary

### R3 boundary — influencer launch-readiness

Before cash infrastructure. Must validate:

- approved recommendation/claim language
- disclosure material
- creator trust/onboarding
- product/refund/support clarity
- privacy
- safe share assets
- no misleading earnings claims
- no prohibited recruitment framing
- no unsupported product/relationship/fortune certainty claims

Creator cash infrastructure remains prohibited until the relevant readiness gates close.

---

## Implementation status summary

| Capability | Status |
|---|---|
| Creator referral | **NOT_IMPLEMENTED** |
| Attribution | **NOT_IMPLEMENTED** |
| Commission ledger | **NOT_IMPLEMENTED** |
| Creator dashboard | **NOT_IMPLEMENTED** |
| Payout/settlement | **NOT_IMPLEMENTED** |
| Stripe payout provider | **UNSELECTED** |
