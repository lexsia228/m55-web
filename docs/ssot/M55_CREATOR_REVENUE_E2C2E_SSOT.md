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

Normative meaning after Human freeze (2026-09-06): `TARGET_COMMISSION_RATE = 50%` names the Human-approved **Founding Creator introductory acquisition rate** (`FOUNDING_CREATOR_INITIAL_RATE`).

It is:

- **not** the permanent standard rate
- **not** provider approval
- **not** legal/tax approval
- **not** payout-provider selection
- **not** authorization to activate creator cash infrastructure

---

## H. Two-lane reward architecture (Human-approved)

### General User lane

- cash payout = **PROHIBITED**
- cash-equivalent transferable balance = **PROHIBITED**
- open MLM / referral-income language = **PROHIBITED**
- general-user benefit design remains **R2-E** work
- do **not** freeze a 10% discount, specific coupon amount, or specific unlock value yet
- candidate benefit forms include: referred-user first-purchase discount, referrer digital M55 unlock, Pair-specific unlock, reciprocal / double-sided M55 experience benefit
- exact benefit/value/trigger remains **unresolved until R2-E**
- Premium purchase must **not** automatically be a prerequisite for the ability to share/refer unless later legal review explicitly authorizes the exact mechanic

General User motivation principle: ordinary users should want to share because M55 creates self-expression, curiosity, relationship utility, reciprocity, useful/private personal insight, and polished shareable artifacts — **not** because they are promised cash income.

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

## I. Canonical creator rate schedule (Human-approved 2026-09-06)

**Supersession notice:** The earlier same-day provisional schedule (50% until 10 conversions / 90 days → 40% until 50 conversions / 180 days → 35% Founding Legacy → 30% Standard) is **SUPERSEDED BEFORE REMOTE PUBLICATION**. It must not be treated as a current active rule. Historical Decision Log entries may reference it only when clearly marked **SUPERSEDED**.

Preserve the literal verifier-required tokens above. Canonical active schedule:

| Rate name | Percent | Period |
|---|---|---|
| **FOUNDING_CREATOR_INITIAL_RATE** | **50%** | Day **0** through day **180** after creator approval |
| **FOUNDING_CREATOR_TRANSITION_RATE** | **40%** | Day **181** through day **365** after creator approval |
| **STANDARD_APPROVED_CREATOR_RATE** | **30%** | Day **366** onward unless a separately Human-approved Strategic Creator agreement applies |

Removed from active rules:

- first-10-conversion rate downgrade
- 50-conversion rate downgrade
- 90-day 50% end condition
- automatic **35%** Founding Legacy tier

Hard rules:

- **no** conversion-count-triggered rate downgrade
- **no** automatic MLM / downstream / volume-tree rates
- **no** retroactive reduction of already **PAYABLE** commission
- **PENDING** commission remains reversible according to refund, chargeback, fraud and eligibility rules
- recording **50%** in this SSOT does **not** make it live without R2-D cohort budget / stop-loss closure

---

## I-b. Rate determination rule (Human-approved 2026-09-06)

Creator tenure begins at **`CREATOR_APPROVED_AT`**.

For each eligible purchase, the commission percentage is determined by the creator tenure at the **eligible purchase event** — use the Stripe-confirmed eligible purchase event / authoritative internal purchase event time once implemented, **not** the later payout date.

A commission may remain **PENDING** during refund/fraud review. The rate must **not** decrease merely because the creator crosses day 180 or day 365 while that existing commission is **PENDING**.

**PENDING** may still be reversed, canceled, held, or declined for refund, chargeback, fraud, attribution, or eligibility reasons.

Once a commission is **PAYABLE**: **NO RETROACTIVE RATE REDUCTION**.

---

## I-c. Strategic Creator exception (Human-approved 2026-09-06)

After the first **365** days, a creator may receive a separately Human-approved **Strategic Creator** agreement.

Target range: **35%–40%**.

This is **NOT**:

- automatic
- guaranteed
- lifetime
- based on number of recruited creators
- based on downline sales
- MLM hierarchy

Possible future Human review inputs: incremental eligible sales, conversion quality, refund rate, chargeback rate, fraud history, claims/disclosure compliance, audience-product fit, brand safety, creator collaboration quality.

Recruitment / downline / network-tree activity must **never** improve rate.

Default after day 365 remains: **30%**.

---

## J. COMMISSIONABLE_REVENUE (commission base)

**COMMISSIONABLE_REVENUE** means the eligible customer amount actually collected after discounts, excluding consumption tax, excluding refunded amounts, excluding charged-back amounts, and excluding reversed or otherwise ineligible amounts.

Creator percentage is calculated against **COMMISSIONABLE_REVENUE**.

M55 bears ordinary payment-processing fees. Do **not** silently deduct Stripe processing fees from the advertised creator percentage base.

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

## L. Program stop-loss (Human-approved 2026-09-06)

M55 must **not** solve an uneconomic cohort by retroactively cutting the promised rate window for already approved compliant creators.

If economics become unsafe, M55 may:

- stop admitting **new** Founding Creators
- close a future cohort
- pause future campaigns
- change terms for **future** approvals
- reduce future cohort rates after Human approval

Existing creator commissions remain subject to fraud, self-referral, circular referral, refund, chargeback, eligibility, claims/disclosure violations, and partnership suspension rules. Those are safety/enforcement rules — **not** arbitrary retroactive rate cuts.

Still unresolved before activation:

- Founding cohort size
- program-level total CAC budget cap
- stop-loss numeric threshold
- provider payout cost
- refund/fraud reserve assumptions
- payout threshold/cadence
- exact provider supportability
- tax/legal execution mechanics

Therefore **50%** must **NOT** become live merely because this SSOT records it.

**R2-D** must freeze cohort budget and stop-loss before activation.

---

## L-b. Solo-builder economic advantage (Human-approved 2026-09-06)

M55 is solo-built / extremely low payroll-overhead compared with a conventional organization. This is a legitimate structural advantage.

M55 should use it to:

- keep fixed acquisition overhead low
- allocate more contribution margin to performance-based Creator CAC
- maintain unusually strong Creator economics during launch
- invest in UI/UX and creator-safe share assets
- iterate quickly
- stop bad experiments quickly
- concentrate spend on proven incremental acquisition

This does **NOT** mean: infinite free money, permanent uneconomic subsidy, reckless discounting, lowering product quality, or misleading earnings claims.

Strategic objective: **RAPID LEGITIMATE MARKET-SHARE ACQUISITION WITH CAPPED DOWNSIDE AND REVERSIBLE EXPERIMENTS.**

---

## L-c. Why six months at 50% (Human-approved 2026-09-06)

A one-time 2026-09-05/06 market benchmark found current major affiliate programs using aggressive introductory / first-year economics, including high first-month/first-period rates and a current 50% first-year SaaS example.

These external program rates are **DATED RESEARCH EVIDENCE** — **NOT** timeless SSOT facts.

M55 chooses six months at 50% because:

- 50% is commercially conspicuous enough for launch
- M55 has low fixed payroll overhead
- M55 current paid products are relatively low-priced one-time digital purchases rather than high-LTV recurring SaaS
- six months gives strong creator incentive without committing an unvalidated first-year 50% subsidy
- successful creators should not be punished by conversion-count rate cliffs
- months 7–12 at 40% retain strong economics while providing an evidence-based normalization path
- year 2 default 30% creates a sustainable standard program baseline

---

## L-d. Creator product experience principle (Human-approved 2026-09-06)

Creator acquisition must **not** compete on percentage alone.

M55's creator advantage should combine:

- strong launch economics
- believable product conversion
- reliable attribution
- transparent PENDING / PAYABLE / reversal state
- polished Japanese share assets
- compliant claims templates
- clear disclosure guidance
- high-quality UI/UX
- rapid founder feedback / iteration

The long-term moat is **not** merely "a bigger percentage".

---

## M. External claim boundary

Allowed future commercial direction (only with final public terms):

> Founding Creators: eligible purchases may earn up to 50% commission

Final public terms must clearly disclose:

- limited eligibility
- approval requirement
- time/tenure limits (not conversion-count cliffs)
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
| **R2-D** `FOUNDING_CREATOR_ECONOMICS` | rate schedule **NOW FROZEN**: 50% days 0–180 · 40% days 181–365 · 30% day 366+ · no conversion-count cliffs; remaining: cohort size, total CAC budget cap, stop-loss numeric threshold, provider payout cost, refund/fraud reserve | open (budget/stop-loss only) |
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
