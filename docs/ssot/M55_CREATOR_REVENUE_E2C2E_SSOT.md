# M55 Creator Revenue / E2C2E SSOT

Status: **ACTIVE / HUMAN-APPROVED ROADMAP CONTRACT**

**IMPLEMENTATION STATUS:** CREATOR CASH INFRASTRUCTURE **NOT IMPLEMENTED**

Sole executable CURRENT/NEXT authority remains `docs/ssot/M55_EXECUTION_STATE.json`. This document is the durable planning contract for the Creator Revenue program.

Machine-first compliance / payout architecture annex: `docs/ssot/M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md`

Affiliate-first Stripe / payout / Japan tax-legal annex: `docs/ssot/M55_CREATOR_AFFILIATE_STRIPE_TAX_LEGAL_SSOT.md`

Commercial/legal/tax evidence pack: `docs/evidence/M55_CREATOR_REVENUE_COMMERCIAL_LEGAL_TAX_EVIDENCE_2026-09-09.md`

Benchmark-independence / Creator-acceptance evidence: `docs/evidence/M55_CREATOR_AFFILIATE_BENCHMARK_INDEPENDENCE_AND_CREATOR_ACCEPTANCE_EVIDENCE_2026-09-09.md`

Frozen affiliate benchmark / target architecture annex: `docs/ssot/M55_CREATOR_AFFILIATE_BENCHMARK_TARGET_ARCHITECTURE_SSOT.md`

Parallel multi-agent operating model: `docs/ssot/M55_MULTI_AGENT_PARALLEL_OPERATING_MODEL_SSOT.md` — mandatory process reference whenever Creator Revenue runs concurrently with UIUX or other AI lanes; does not change R1→R8 order or implementation authority.

**Trust / ledger / payout control detail lives in the annex.** This parent SSOT retains economics, lane contracts, and roadmap authority only.

`CREATOR_EARNINGS_TRANSPARENCY = REQUIRED`

`CREATOR_COMMISSION_LEDGER_APPEND_ONLY = TRUE`

`STRIPE_HOSTED_PAYOUT_ONBOARDING_PREFERRED = TRUE` (subject to R2-B2)

`SELF_REFERRAL_AND_CIRCULAR_ABUSE_MACHINE_BLOCK = REQUIRED`

`CREATOR_PAYOUT_BLOCK_REASON_MUST_BE_ACTIONABLE = TRUE`

`FOUNDING_CREATOR_EXCEPTION_REVIEW_MUST_BE_HIGH_TRUST = TRUE`

`EARNINGS_TRANSPARENCY_IS_A_CREATOR_ACQUISITION_ASSET = TRUE`

`CREATOR_PROGRAM_V1 = AFFILIATE_FIRST`

`AFFILIATE_V1_MANDATORY_DELIVERABLE = NONE`

`AFFILIATE_V1_MANDATORY_POSTING_SCHEDULE = NONE`

`STRIPE_CONNECT_CHARGE_THEN_TRANSFER = REQUIRED`

`PAYOUT_BATCHING_REQUIRED = TRUE`

`LEGAL_PAYMENT_DEADLINE_OVERRIDES_ECONOMIC_THRESHOLD = TRUE_IF_APPLICABLE`

`M55_PAYOUT_COST_PASS_THROUGH_OBJECTIVE = HUMAN_APPROVED`

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION = NOT_AUTHORIZED_PENDING_LEGAL_CLASSIFICATION`

`AFFILIATE_BENCHMARK_SHORTLIST_V1 = FROZEN_SIX`

`TARGET_AFFILIATE_ARCHITECTURE = M55_NATIVE_CONTROL_PLANE_PLUS_STRIPE_MONEY_RAIL`

`THIRD_PARTY_AFFILIATE_SAAS_RUNTIME_DEPENDENCY_V1 = NONE_BY_DEFAULT`

Zero-omission traceability matrix and canonical development order: `docs/ssot/M55_ROADMAP.md`

---

## A-0. Revenue decision no-regression policy (Human-approved 2026-09-06)

`M55_REVENUE_DECISION_NO_REGRESSION = TRUE`

Human-approved/frozen revenue decisions must **not** be re-opened, re-optimized, replaced, or reverted merely because:

- a new chat starts
- a new agent prefers another design
- reassurance is requested
- a previously reviewed competitor remains different
- implementation begins

A frozen decision may be reopened only by a real invalidator such as:

- applicable law/regulation conflict
- Stripe/provider incompatibility
- security/fraud defect
- actual measured negative unit economics
- material product-truth conflict
- Human explicitly changes the decision

**New chat/session is NOT an invalidator.**

---

## A. E2C2E term

- `E2C2E` is a Human shorthand.
- Do **not** invent or freeze an acronym expansion unless Human later defines it.
- Its normative meaning is the state-machine creator acquisition / attribution / purchase / commission / payout / re-sharing loop defined in this SSOT.

---

## B. Safe distribution loop

Normative conceptual flow uses the frozen §U **two-field orthogonal state model**:

`SHARE_READY`
→ `DIRECT_ATTRIBUTION_RECORDED`
→ `ELIGIBLE_PURCHASE_CONFIRMED`
→ commission state `COMMISSION_PENDING_COMPLIANCE_REVIEW`
→ optional commission state `COMMISSION_HOLD`
→ commission state `COMMISSION_PAYABLE`

Payout readiness is a **separate dimension**, not a continuation of the commission state machine. Once a commission is `COMMISSION_PAYABLE`, payout state may independently move through `PAYOUT_NOT_READY` / an applicable `PAYOUT_BLOCKED_*` state → `PAYOUT_QUEUED` → `PAYOUT_PROCESSING` → `PAYOUT_POSTED`.

Exceptional paths:

- `PURCHASE_REFUNDED` → canonical commission transition to `COMMISSION_REVERSED` or an append-only `COMMISSION_ADJUSTED` record as contract permits
- `CHARGEBACK` → `COMMISSION_REVERSED` or `COMMISSION_ADJUSTED` as contract permits
- `FRAUD_FLAG` → `COMMISSION_HOLD` → review → `COMMISSION_PAYABLE` / `COMMISSION_REVERSED` / `COMMISSION_ADJUSTED` as policy permits
- `PAYOUT_FAILED` / `PAYOUT_RETURNED` → payout reconciliation, not silent success

Non-canonical synonyms such as `COMMISSION_HOLD_REVIEW`, `PAYOUT_REQUESTED`, `VESTED`, `CANCELED`, and `PAID` must not be persisted as M55 state values.

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

### D-b. Creator trust UX principles (Human-approved 2026-09-06)

External audit findings are **supporting evidence only**. Absorbed principles:

| Principle | Meaning |
|---|---|
| `CREATOR_PAYOUT_BLOCK_REASON_MUST_BE_ACTIONABLE` | blocked payout UX must explain commission validity, block reason, Creator next action, automatic system next action, expected review/retry, and appeal route |
| `FOUNDING_CREATOR_EXCEPTION_REVIEW_MUST_BE_HIGH_TRUST` | founding cohort risk signals → `AUTO_HOLD` → evidence → correction → machine re-scan → Human only if unresolved/material — no silent rejection |
| `EARNINGS_TRANSPARENCY_IS_A_CREATOR_ACQUISITION_ASSET` | factual launch messaging may emphasize explainable performance/earnings — does **not** change economics or permit guarantee claims |

**Rejected external overclaims (do not adopt):** 完全勝利 · 絶対的な信頼 · リスクを完全に潰す · "money safely stored" · escrow-like wording · exploitative competitor framing · Human-less = zero operational risk.

Product Truth / no-guarantee / no-escrow boundaries remain mandatory.

Detail: `docs/ssot/M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md` §AU–§AX.

---

## E. Internal commission ledger — required architecture

M55 owns commission eligibility/accounting state.

`CREATOR_COMMISSION_LEDGER_APPEND_ONLY = TRUE`

Do **not** rewrite historical commission facts. Corrections use immutable adjustment entries (refund, chargeback, payout correction) referencing the originating commission/event.

At eligible Stripe-confirmed purchase:

- create idempotent internal commission event
- canonical `commission_state` initially `COMMISSION_PENDING_COMPLIANCE_REVIEW`

A creator-facing label such as “pending” does **not** create a second persisted state and does **not** mean money has been paid or irrevocably earned.

Only after:

- required refund/cancellation window
- fraud checks
- eligibility checks
- attribution checks
- chargeback state as defined by policy

may the canonical commission state become `COMMISSION_PAYABLE`. A creator-facing “PAYABLE” label may describe that state, but `VESTED` is not a canonical persisted state.

Only records with `commission_state = COMMISSION_PAYABLE` may enter payout execution.

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
- Premium purchase must **not** automatically be a prerequisite for the ability to share/refer unless later legal review explicitly authorizes the exact mechanic

**Launch MVP frozen (2026-09-06):**

`GENERAL_USER_PRIMARY_V1 = FREE_COMPLETION_DIGITAL_UNLOCK`

Flow:

1. direct invite
2. distinct referred account
3. valid meaningful **Self Free** or **Pair Free** completion
4. abuse checks
5. bounded non-cash M55 digital unlock to referrer

Constraints:

- no purchase required
- no cash
- no transferable balance
- no generic points wallet
- no Premium chapter/content leakage
- no fixed 10% discount

Exact unlock content remains a later minimal product-boundary micro-spec.

`PAIR_INVITE_MUTUAL_ARTIFACT` / Shared Relationship Artifact = **`FUTURE_OPTIMIZATION_CANDIDATE`**

Do **not** make mutual Pair collaboration semantics a v1 requirement. Do **not** reopen CLOSED GREEN Pair architecture merely to implement v1 referral.

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
- recording **50%** in this SSOT does **not** make it live without R2-B2 external confirmation and Human launch authority

**Founding cohort (frozen 2026-09-06):** initial cohort = **20** manually approved creators.

Do **not** freeze an invented absolute program cash-exposure cap. Future absolute cash-exposure cap requires actual Human launch-budget authority. Performance-based Creator commission is itself acquisition cost; a successful positive-contribution Creator must **not** be automatically stopped merely because cumulative sales become large.

**Launch cash bonus:** `BONUS_NOT_NEEDED_AT_LAUNCH` — 50% for six months is already the headline acquisition economics.

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

## L. Program stop-loss (Human-approved 2026-09-06, corrected)

M55 must **not** solve an uneconomic cohort by retroactively cutting the promised rate window for already approved compliant creators.

If economics become unsafe, M55 may:

- stop admitting **new** Founding Creators
- close a future cohort
- pause future campaigns
- change terms for **future** approvals
- reduce future cohort rates after Human approval

Existing creator commissions remain subject to fraud, self-referral, circular referral, refund, chargeback, eligibility, claims/disclosure violations, and partnership suspension rules. Those are safety/enforcement rules — **not** arbitrary retroactive rate cuts.

### Corrected stop-loss principles (not arbitrary percentage matrix)

| Event | Action |
|---|---|
| `CONFIRMED_SELF_REFERRAL` | objective rejection |
| `CONFIRMED_CIRCULAR_REFERRAL` | objective rejection / creator pause as policy permits |
| `CONFIRMED_DUPLICATE_COMMISSION` | objective cancellation |
| refund/chargeback on related transaction | reversal/cancellation per state/policy |
| Stripe/provider risk warning | immediate automated payout/referral **PAUSE** + review |
| **first observed chargeback** in small launch cohort | **HUMAN REVIEW** — do not wait for 2% threshold |
| creator concentration > **35%** | diversification/dependency **REVIEW** only |
| creator-attributed contribution margin ≤ **0** after required variable costs | program economic **HARD STOP** |
| positive but materially deteriorating contribution | **HUMAN REVIEW** / future cohort admission pause |

High concentration alone is **not** misconduct. A creator producing >50% of attributable revenue must **not** be automatically stopped when fraud is absent, claims compliance is GREEN, refund/dispute quality is acceptable, and contribution remains positive.

Still externally/open operationally before activation:

- actual Human absolute cash-exposure budget if desired
- provider payout costs
- legal/tax deadlines
- provider supportability
- refund/fraud reserve assumptions
- payout threshold/cadence
- exact statistically meaningful rate thresholds (after sufficient volume)

Therefore **50%** must **NOT** become live merely because this SSOT records it.

**R2-B2** must close remaining account-specific supportability classification before cash infrastructure activation. Core Stripe feasibility is **CONFIRMED**; R2-B2 is **NOT CLOSED**.

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

## N. R2 sub-gates (planning contract — updated 2026-09-06)

| Sub-gate | Scope | Status |
|---|---|---|
| **R2-A** `COMPETITIVE_REWARD_BENCHMARK` | one-time Japan/competitor research input | **CLOSED / REUSE** — do not repeat absent invalidator |
| **R2-B1** `JAPAN_LEGAL_STRIPE_PREFLIGHT` | official-source issue mapping and STOP conditions | **INTERNAL PREFLIGHT / ISSUE MAPPING COMPLETE** — external professional/account-specific confirmation remains R2-B2 |
| **R2-C** `M55_TWO_LANE_REWARD_CONTRACT` | General User non-cash / Approved Creator cash split | **INTERNAL TWO-LANE CONTRACT FROZEN** |
| **R2-D** `FOUNDING_CREATOR_ECONOMICS` | 50% days 0–180 · 40% days 181–365 · 30% day 366+ · no conversion cliffs · cohort **20** · no extra launch cash bonus · machine-first compliance architecture · 30-day review model · corrected stop-loss principles | **INTERNAL ECONOMICS FROZEN** — actual Human absolute cash-exposure budget / provider costs / legal deadlines remain external |
| **R2-E** `GENERAL_USER_VIRAL_VALUE_DESIGN` | `GENERAL_USER_PRIMARY_V1 = FREE_COMPLETION_DIGITAL_UNLOCK` · Pair mutual artifact deferred | **INTERNAL LAUNCH MVP FROZEN** |
| **R2-B2** `EXTERNAL_SUPPORTABILITY_CONFIRMATION` | account-specific Stripe/provider + Japan legal/tax confirmation | **ACTIVE** — **STRIPE A/B/D CLOSED** · **STRIPE C NON-BLOCKING FOLLOWUP** · **JAPAN LEGAL/TAX OPEN** · P0-1 `GREEN_WITH_CONDITION` · P0-2 `GREEN` · P0-3 `GREEN` · **NOT CLOSED** |

Machine-first compliance / payout detail: `docs/ssot/M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md`

### R2 implementation order (no skipping)

1. R2 durable SSOT freeze — complete
2. R2-B2 supportability confirmation packet
3. account-specific Stripe/provider confirmation
4. required Japan legal/tax confirmation
5. close R2 / explicit Human acceptance
6. R3 launch-readiness audit per canonical roadmap
7. R4 Creator Distribution Foundation
8. R5 Attribution + Compliance implementation
9. R6 Commission Ledger
10. R7 Creator Dashboard / exception queue
11. R8 Payout + Settlement automation
12. independent Creator infra audit
13. invite-only beta
14. revenue-ready
15. controlled scale

Do **not** implement payout before attribution/compliance/ledger. Do **not** implement a Human-per-payout workflow as interim architecture.

Human-approved clarification after official-source tax review (2026-09-09):

- the frozen 50% / 40% / 30% rate applies to `COMMISSIONABLE_REVENUE` to produce **gross Creator commission before payer-side statutory withholding**;
- M55 does **not** promise a tax-net or after-withholding take-home percentage;
- ordinary M55 payment-processing fees remain outside the advertised commission base as already frozen;
- refund/chargeback/ineligible amounts remain governed by `COMMISSIONABLE_REVENUE` and append-only adjustments;
- any legally required withholding is a separate payout/tax layer and does not redefine the commercial rate;
- Creator-borne payout/service fee remains unresolved and may not be implemented until its exact legal/contract classification closes.

### R2-B2 Stripe P0 evidence (Human-approved 2026-09-06)

Dated external evidence from Stripe support — do not paraphrase into stronger approval than received.

| Classification | Status | Meaning |
|---|---|---|
| `R2_B2_STRIPE_P0_1_BUSINESS_CLASSIFICATION` | **GREEN_WITH_CONDITION** | Described business does not appear to fall under Japan prohibited "Psychic services and fortune tellers"; `M55_ACCOUNT_FINAL_STRIPE_APPROVAL = NOT_YET_CONFIRMED` pending specialist account review |
| `R2_B2_STRIPE_P0_2_JP_CREATOR_COMMISSION` | **GREEN** | Japan platform → Japan resident Creator connected account → affiliate commission as part of product sales supported in principle |
| `R2_B2_STRIPE_P0_3_30_DAY_TRANSFER_MODEL` | **GREEN** | Purchase → ~30-day internal review → commission PAYABLE → later Creator transfer allowed for Japan platform + Japan connected account |
| `R2_B2_CORE_STRIPE_ARCHITECTURE_FEASIBLE` | **TRUE** | Core Stripe Connect affiliate architecture is feasible as leading candidate |
| `STRIPE_CONNECT` | **VALIDATED_LEADING_PROVIDER_CANDIDATE** | Not final selection |
| `SEPARATE_CHARGES_AND_TRANSFERS` | **CONFIRMED_M55_CONNECT_FLOW** | Stripe support confirmed M55 uses Separate Charges and Transfers |
| `stripePayoutProviderStatus` | **UNSELECTED** | Final selection remains UNSELECTED until R2 Final Human acceptance; Stripe support follow-up is non-blocking and does not gate provider-independent development |

### R2-B2 Stripe A/B/D evidence (2026-09-08)

Primary evidence: `docs/evidence/M55_R2_B2_STRIPE_SUPPORT_EVIDENCE_2026-09-08.md`

| Classification | Status | Meaning |
|---|---|---|
| `R2_B2_STRIPE_A_ACCOUNT_CONFIGURATION` | **CLOSED_GREEN** | Accounts v2 · Express Dashboard · fees payer = application · losses.payments = application · semantic only — not frozen API syntax |
| `STRIPE_ACCOUNT_API` | **ACCOUNTS_V2** | New Connect implementation should use Accounts v2 |
| `STRIPE_CONNECTED_ACCOUNT_DASHBOARD` | **EXPRESS** | Express Dashboard for connected accounts |
| `STRIPE_FEES_RESPONSIBILITY` | **APPLICATION** | Platform bears Connect fees |
| `STRIPE_LOSSES_RESPONSIBILITY` | **APPLICATION** | Platform bears payment losses |
| `R2_B2_STRIPE_B_NEGATIVE_BALANCE_RESPONSIBILITY` | **CLOSED_GREEN_PLATFORM_RESPONSIBLE** | M55 platform bears connected-account negative balances |
| `R2_B2_STRIPE_C_ACCOUNT_SUPPORTABILITY` | **NON_BLOCKING_STRIPE_SUPPORT_FOLLOWUP** | Support-side follow-up may still arrive; `STRIPE_SUPPORT_FOLLOWUP = COMPLETED_NO_ACTION_REQUIRED` · `M55_ACTION_REQUIRED_FOR_STRIPE_FOLLOWUP = FALSE` · `DEVELOPMENT_BLOCKED_BY_STRIPE_SUPPORT_FOLLOWUP = FALSE` · `M55_ACCOUNT_FINAL_STRIPE_APPROVAL = NOT_YET_CONFIRMED` (informational only) |
| `R2_B2_STRIPE_D_PRICING_MODEL` | **CLOSED_FOR_PRICING_MODEL** | Platform-managed pricing · ¥200/mo active account · 0.25%+¥250 payout · charges debited from platform balance |
| `STRIPE_CONNECT_PRICING_OWNER` | **PLATFORM** | Platform-managed Connect pricing model |
| `R8_ACTUAL_BILLING_RECONCILIATION_REQUIRED` | **TRUE** | Reconcile Dashboard/contract/invoice at R8 before payout activation — no invented unit-cost formula |

**Residual Stripe confirmation (`R2_B2_STRIPE_RESIDUAL_CONFIRMATION`):**

- **C only — non-blocking.** Stripe support-side follow-up may still arrive; no final approval certificate received; not a development wait gate
- `R2_B2_STRIPE_RESIDUAL_CONFIRMATION = C_ONLY_NON_BLOCKING`
- `NO_ADDITIONAL_STRIPE_QUESTION_NOW = TRUE`
- A/B/D are **CLOSED** — do not reopen Stripe support questioning for A/B/D

**30-day review separation:**

- `STRIPE_30_DAY_REVIEW_COMPATIBILITY = GREEN` (provider compatibility only)
- `JAPAN_LEGAL_30_DAY_PAYMENT_COMPATIBILITY = OPEN` (Freelance Act, mandatory payment deadline, Creator contract treatment, tax/withholding)
- `STANDARD_COMPLIANCE_REVIEW_WINDOW_DAYS = 30` remains frozen design; if law creates direct incompatibility → `REAL_INVALIDATOR` → Human architecture review

**R2-B2 vs R6/R8 ownership:**

| Topic | R2-B2 owns | R6/R8 owns |
|---|---|---|
| `NEGATIVE_BALANCE` | Japan/provider recovery-model classification | R8: runtime handling / reconciliation implementation |
| `TAX_WITHHOLDING` | Japan legal/tax classification sufficient for R2 closure | R8: payout/tax operational implementation |
| `ROUNDING` | — | R6: deterministic financial calculation rule |

Principle: **R2-B2 CLASSIFIES · R6/R8 IMPLEMENT** — do not implement R6/R8 early.

### Parallel non-Stripe quality lane (Human-approved 2026-09-06)

`PARALLEL_NON_STRIPE_QUALITY_LANE = SELF_PREMIUM_PUBLICATION_QUALITY_CLOSURE`

| Sub-item | Status |
|---|---|
| Q1 Self Premium editorial depth | **CLOSED / NO REPLAY** |
| Q2-A chapter identity | **IMPLEMENTATION GREEN / LOCAL** |
| Q2-B Promise → Delivery | **IMPLEMENTATION GREEN / LOCAL** |
| Final visual evidence | Cursor/STP candidate **GREEN** |
| Remaining before user-visible closure | independent artifact verification · Human commercial visual acceptance · feature publication/push authorization |

Does **not** change Creator Revenue CURRENT/NEXT · does **not** authorize Stripe/provider mutation · does **not** reorder R2→R8 · does **not** reopen Q1.

### Pair Premium semantic guard (Human-approved 2026-09-06)

| Token | Status |
|---|---|
| `PAIR_PREMIUM_COMMERCE_SWITCH` | **ACTIVATED** |
| `PAIR_PREMIUM_CONTROL_PLANE_DECISION` | **CLOSED GREEN** |
| `PAIR_PREMIUM_PRODUCT_FULLY_LIVE` | **≠ implied by ACTIVATED** |
| `REAL_PAYMENT_E2E` | **PAUSED_BEFORE_PAYMENT / NOT GREEN** |
| `FULFILLMENT + OWNED REPORT REVISIT E2E` | **NOT GREEN** unless separately proven |

---

## N-b. Japan mature-market operational precedent freeze (Human-approved 2026-09-07)

This is a **durable operating baseline** built from dated public evidence. It is **not** a legal safe harbor and does not mean another company's operation legally binds Stripe, tax authorities, JFTC, or M55. Its purpose is to prevent M55 from treating standard affiliate / multi-party payout mechanics as a new invention and repeatedly reopening broad research.

Frozen classifications:

`JAPAN_MATURE_AFFILIATE_OPERATIONAL_PRECEDENT = GREEN`

`JAPAN_STRIPE_CONNECT_PLATFORM_PRECEDENT = GREEN`

`DEVELOPMENT_BLOCKED_BY_GENERAL_LEGAL_TAX_RESEARCH = FALSE`

`PAID_PROFESSIONAL_CONSULTATION_REQUIRED_NOW = FALSE`

`NO_BROAD_DOMESTIC_AFFILIATE_RESEARCH_REPLAY = TRUE`

`NO_BROAD_LEGAL_TAX_RESEARCH_REPLAY = TRUE`

Dated evidence baseline used for this freeze:

- Stripe official Japan/customer material shows Connect in live Japanese multi-party businesses including Adastria / dot-C, INFORICH / ShareSPOT, Kurashi no Market, and Toyota / Mechacomi. The common reusable pattern is platform-controlled multi-party funds flow, seller/partner onboarding/KYC, revenue splitting or payout, refund/cancellation handling, and provider-managed payment infrastructure.
- A8.net publicly documents `未確定` affiliate results that are later confirmed or cancelled by the advertiser; confirmed rewards are paid on a later aggregated schedule. A8.net also publicly states that its affiliate performance rewards are not subject to withholding by A8.
- MoshiMo Affiliate publicly documents per-result approval, in principle within 30 days, followed by confirmed reward handling and later aggregated payment.
- JFTC official guidance remains the mandatory-law boundary: if the Freelance Act applies to the actual M55 relationship, transaction terms and a specific payment due date must be disclosed and payment must meet the applicable statutory deadline.
- Current Stripe Connect documentation recommends modern controller/property or Accounts v2-style configuration rather than relying on legacy Standard/Express/Custom labels alone; exact M55 account configuration remains an account-specific A item.

Reusable M55 operating baseline:

- approved Creator lane, direct single-tier attribution only
- purchase/result first enters internal pending/review state
- objective eligibility / refund / chargeback / self-referral / circular-referral / fraud checks precede `PAYABLE`
- monthly/periodic aggregation rather than one payout per purchase
- append-only commission/accounting history with explicit adjustments
- Creator-visible status and reason codes
- provider-hosted/embedded onboarding preferred; M55 does not store full bank details
- no recruitment commission, no MLM tree, no guaranteed-income claims

**External-wait boundary:** Stripe C non-blocking support follow-up (A/B/D closed 2026-09-08) and any bounded mandatory-law/tax implementation check may change provider configuration, liability handling, fee parameters, payout controls, or activation conditions. They do **not** reopen the frozen Creator acquisition/economics/anti-MLM/state-machine architecture unless they produce a direct invalidator.

**Development policy:** waiting for Stripe or other external responses is **not** a reason to stop provider-independent Creator Revenue development. Actual cash activation, live connected-account creation, live payout, and unresolved tax withholding execution remain fail-closed until their exact owning gate is satisfied.

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
- M55WEB is fully approved
- Creator payout is activated
- final Accounts v2 API field syntax is frozen (semantic configuration classified 2026-09-08; implementation-time schema mapping remains R8)
- final unit-cost pricing formula is frozen (pricing model classified 2026-09-08; actual billing reconciliation remains R8)

Current external evidence as of 2026-09-08 (Stripe support A/B/D response — primary evidence: `docs/evidence/M55_R2_B2_STRIPE_SUPPORT_EVIDENCE_2026-09-08.md`):

- `R2_B2_STRIPE_A_ACCOUNT_CONFIGURATION = CLOSED_GREEN` — Accounts v2 · Express Dashboard · fees/losses = application
- `R2_B2_STRIPE_B_NEGATIVE_BALANCE_RESPONSIBILITY = CLOSED_GREEN_PLATFORM_RESPONSIBLE`
- `R2_B2_STRIPE_C_ACCOUNT_SUPPORTABILITY = NON_BLOCKING_STRIPE_SUPPORT_FOLLOWUP` · `STRIPE_SUPPORT_FOLLOWUP = COMPLETED_NO_ACTION_REQUIRED` · `M55_ACCOUNT_FINAL_STRIPE_APPROVAL = NOT_YET_CONFIRMED` (informational only; not a development blocker)
- `R2_B2_STRIPE_D_PRICING_MODEL = CLOSED_FOR_PRICING_MODEL` · `STRIPE_CONNECT_PRICING_OWNER = PLATFORM` · `R8_ACTUAL_BILLING_RECONCILIATION_REQUIRED = TRUE`
- `SEPARATE_CHARGES_AND_TRANSFERS = CONFIRMED_M55_CONNECT_FLOW`
- `R2_B2_STRIPE_RESIDUAL_CONFIRMATION = C_ONLY_NON_BLOCKING` · `NO_ADDITIONAL_STRIPE_QUESTION_NOW = TRUE` · `DEVELOPMENT_BLOCKED_BY_STRIPE_SUPPORT_FOLLOWUP = FALSE`

Current external evidence as of 2026-09-06 (Stripe support P0 response — still applicable):

- `R2_B2_STRIPE_P0_1_BUSINESS_CLASSIFICATION = GREEN_WITH_CONDITION` — described business does not appear to fall under Japan prohibited "Psychic services and fortune tellers"; `M55_ACCOUNT_FINAL_STRIPE_APPROVAL = NOT_YET_CONFIRMED`
- `R2_B2_STRIPE_P0_2_JP_CREATOR_COMMISSION = GREEN` — Japan platform → Japan resident Creator connected account → affiliate commission supported in principle
- `R2_B2_STRIPE_P0_3_30_DAY_TRANSFER_MODEL = GREEN` — ~30-day review → PAYABLE → later transfer allowed for Japan platform + Japan connected account
- `R2_B2_CORE_STRIPE_ARCHITECTURE_FEASIBLE = TRUE` · `STRIPE_CONNECT = VALIDATED_LEADING_PROVIDER_CANDIDATE`
- `stripePayoutProviderStatus = UNSELECTED`

Prior external evidence as of 2026-09-05 (still applicable where not superseded):

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

R3 `M55-INFLUENCER-PRODUCT-LAUNCH-READINESS-CODEX-AUDIT` validates Creator-facing trust UX and Product Truth **before** cash infrastructure. R3 does **not** build R7 Dashboard.

Must validate:

- Creator onboarding comprehension
- Creator-facing Product Truth
- commission explanation and 50/40/30 explanation
- `PENDING` / `HOLD` / `PAYABLE` comprehension
- KYC/payout block explanation (actionable, not confiscation framing)
- PR/disclosure clarity
- prohibited claims and no misleading earnings language
- refund/reversal explanation
- Creator support/dispute route
- earnings transparency positioning without guarantees
- Founder/Founding Creator narrative
- approved recommendation/claim language
- disclosure material
- product/refund/support clarity
- privacy
- safe share assets
- no recruitment framing
- no unsupported product/relationship/fortune certainty claims

Creator cash infrastructure remains prohibited until the relevant readiness gates close.

### R5 boundary — attribution and compliance

Owns attribution evidence, one-purchase/one-Creator rule, conflict precedence, General invite vs Creator attribution, signed tracking IDs, eligibility lock, self/circular fraud, content registry/snapshots/re-scan, disclosure/claims checks, `AUTO_PASS` / `AUTO_CANCEL_OBJECTIVE` / `AUTO_HOLD`, Human exception routing, correction/appeal intake. **No payout execution in R5.**

### R6 boundary — commission ledger

Owns append-only ledger, immutable adjustments, calculation/policy versioning, `COMMISSIONABLE_REVENUE`, integer/exact money, rounding contract, purchase-event rate lock, `release_at`, commission states, post-`PAYABLE` adjustments, idempotent commission creation, financial replay safety. **Must not silently choose unresolved rounding/tax semantics.**

### R7 boundary — creator dashboard

Owns Creator trust/control UX: performance, earnings, per-commission explainability, actionable payout-block UX, compliance visibility, export. Customer PII hidden. **Trust surface — not cosmetic analytics.**

### R8 boundary — payout and settlement

Owns Stripe/provider integration, hosted onboarding, KYC readiness, payout batching/threshold/cadence, idempotency, provider lifecycle, destination-change security hold, account-takeover controls, webhook/dead-letter/replay, negative-balance handling, post-payout reconciliation, payout statements. **No full bank details stored by M55 unless later unavoidable and explicitly approved.**

### Stage exit criteria (frozen 2026-09-06)

| Stage | Exits only when |
|---|---|
| **R2-B2** | (1) M55 Stripe account supportability classified · (2) current Connect account/configuration model classified · (3) negative-balance/loss responsibility classified · (4) applicable Connect pricing model classified · (5) Japan legal/payment-deadline issues classified · (6) Japan tax/withholding issues classified · (7) no invented financial semantics · (8) no unsupported escrow claim · (9) provider final-selection packet ready for Human decision |
| **R2 final** | explicit Human acceptance after R2-B2 closure |
| **R3** | Creator-facing Product Truth and trust UX are safe/comprehensible |
| **R4** | approved Creator identity/terms/distribution foundation exists |
| **R5** | attribution/compliance/fraud/appeal machine contract is executable |
| **R6** | every commission is deterministic, reproducible, and adjustment-safe |
| **R7** | Creator can independently reconcile earnings/status without normal Human help |
| **R8** | provider onboarding and payout lifecycle are automated/reconciled/fail-closed |
| **Creator Infra Audit** | cross-stage invariants and failure modes pass independent review |
| **Invite-only beta** | real controlled Creator operations expose no blocking safety/accounting defects |
| **Revenue Ready** | explicit Human GO |

Do **not** reorder stages without a real dependency invalidator + Human approval.

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

---

## Creator Revenue evidence-first financial governance (Human-approved 2026-09-09)

`CREATOR_REVENUE_EVIDENCE_FIRST_FREEZE = REQUIRED`

For commercial terms, money movement, Creator percentage, Creator earnings transparency, tax, invoice, withholding, consumer-sale disclosures, payout fees, payment deadlines, accounting evidence, or material operating duties:

```
official / primary evidence
-> bounded mature-market precedent
-> M55 applicability analysis
-> explicit unresolved list
-> independent read-only red-team where useful
-> Control-Tower adjudication
-> Human approval
-> SSOT freeze
-> implementation
-> independent code review for money/state/idempotency
-> runtime evidence
```

No implementation may silently convert an inference, competitor practice, stale provider price, or tax assumption into financial behavior.

`COMMISSION_RATE_IS_GROSS_COMMERCIAL_RATE = TRUE`

`NET_OF_TAX_COMMISSION_GUARANTEE = PROHIBITED`

`STATUTORY_WITHHOLDING_DOES_NOT_REDEFINE_COMMISSION_RATE = TRUE`

`NO_SILENT_CREATOR_DEDUCTION = TRUE`

`TAX_POLICY_MUST_BE_EFFECTIVE_DATED = TRUE`

`UNKNOWN_TAX_CLASSIFICATION_MUST_FAIL_CLOSED_BEFORE_LIVE_PAYOUT = TRUE`

The Creator's final personal/corporate income-tax filing remains the Creator's responsibility, while M55 must separately satisfy any payer-side withholding/remittance duty that actually applies to the classified payment. M55 must not assume either universal zero withholding or universal withholding.

Invoice-registration status may change M55's own consumption-tax/input-tax-credit economics. It must not silently retroactively reduce an already-earned Creator commission rate.

---

## Benchmark independence / Creator trust top-level freeze (Human-approved 2026-09-09)

`BENCHMARK_PATTERN_ADOPTION_NOT_EXPRESSION_COPYING = TRUE`

`M55_IMPLEMENTATION_MUST_BE_INDEPENDENTLY_AUTHORED = TRUE`

`CREATOR_PROGRAM_TRUTH_REQUIRED_BEFORE_FIRST_AFFILIATE_LINK = TRUE`

`CREATOR_EARNINGS_EXPLAINABILITY_REQUIRED = TRUE`

`BENCHMARK_TO_M55_PROVENANCE_REQUIRED = TRUE`

Public competitor/vendor patterns may inform M55 requirements; competitor code, terms text, branding, distinctive UI expression, and non-public implementation are not implementation sources.

## M55 operator facts / R2-B2 payer-form freeze — Human-approved 2026-09-10

These are durable M55 operating facts and must not be guessed from generic "company" language.

`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

`M55_BUILD_MODEL = SOLO_BUILD`

`M55_EMPLOYEES = NONE`

`M55_PAYS_SALARY_OR_WAGES = FALSE`

`M55_IS_SALARY_PAYER_FOR_WITHHOLDING = FALSE`

Human clarification: M55 is not a corporation and does not currently employ workers or pay salary/wages.

### Current R2-B2 consequence

Under current JFTC public guidance, a sole-proprietor ordering business that does **not** use employees is not a `特定業務委託事業者`. If a Creator affiliate relationship is a covered `業務委託`, M55 still must satisfy the Article 3 transaction-condition disclosure requirement, but the additional duties imposed on `特定業務委託事業者` — including the statutory payment-deadline framework — are not the current M55 payer branch.

`FREELANCE_ACT_M55_ORDERER_ROLE_IF_AFFILIATE_IS_COVERED_DELEGATION = BUSINESS_COMMISSIONER_NOT_SPECIFIED_COMMISSIONER_CURRENT_FACTS`

`FREELANCE_ACT_ARTICLE_3_DISCLOSURE = REQUIRED_IF_COVERED_TRANSACTION`

`FREELANCE_ACT_60_DAY_PAYMENT_DEADLINE = NOT_APPLICABLE_TO_CURRENT_M55_IF_AFFILIATE_IS_COVERED_DELEGATION`

Under NTA No.2793, when the payer is an individual who is not a payer of salaries, source withholding on remuneration/fees is generally not required except specified cases such as hostess remuneration.

`M55_PAYER_SIDE_SOURCE_WITHHOLDING_FOR_JP_RESIDENT_ORDINARY_AFFILIATE_COMMISSION = NOT_REQUIRED_UNDER_CURRENT_PAYER_FACTS`

The unresolved academic question of whether ordinary web-affiliate commission could fall inside a category such as `外交員等` does not control M55's current Japan-resident ordinary Affiliate payer obligation while the individual/no-salary-payer exception applies. Nonresident/foreign-recipient payouts remain a separate tax/treaty branch.

### Invalidation

Re-open the relevant legal/tax branch before cash payout if any of these change:

- M55 begins using employees under the then-current JFTC definition;
- M55 begins paying salary/wages, including a tax treatment that makes M55 a salary payer;
- M55 changes from sole proprietor to corporation or another entity form;
- Creator relationship changes from Affiliate-first to sponsored/commissioned deliverables;
- law or official guidance materially changes.

`M55_EMPLOYEE_OR_PAYROLL_STATUS_CHANGE = R2_B2_LEGAL_TAX_INVALIDATOR`

This fact freeze does not authorize payout runtime. R2-B2 closure still requires independent review of the public-evidence mapping and explicit Human R2 final acceptance.

## Operator-status cross-reference — Human-approved 2026-09-10

Normative operator/business-state authority: `docs/ssot/M55_OPERATOR_BUSINESS_STATUS_SSOT.md`.

Current frozen facts:
- sole proprietor;
- solo build;
- zero employees;
- zero salary/wage payments;
- pre-revenue / zero M55 business revenue;
- development phase.

Creator Revenue must consume those facts rather than re-infer them.

`CREATOR_REVENUE_OPERATOR_FACTS_REFERENCE = M55_OPERATOR_BUSINESS_STATUS_SSOT`

First employee, first salary, entity conversion, invoice-status change, first revenue, sponsored-Creator conversion, nonresident payout or material legal change reopens only the affected Creator legal/tax branch.
