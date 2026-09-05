# M55 Creator Compliance and Payout Automation SSOT

Status: **ACTIVE / HUMAN-APPROVED ARCHITECTURE CONTRACT**

**IMPLEMENTATION STATUS:** **NOT IMPLEMENTED**

Normative detailed architecture for scalable creator compliance, commission qualification, exception review, and future Stripe-native payout automation.

Parent contract: `docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md`

Sole executable CURRENT/NEXT authority remains `docs/ssot/M55_EXECUTION_STATE.json`.

---

## A. Machine-first operating principles (frozen)

| Principle | Value |
|---|---|
| `HUMAN_DOES_NOT_APPROVE_EVERY_PAYOUT` | **TRUE** |
| `MACHINE_FIRST_FAIL_CLOSED_COMPLIANCE` | **TRUE** |
| `HUMAN_ONLY_FOR_AMBIGUOUS_OR_MATERIAL_EXCEPTIONS` | **TRUE** |
| `NO_AI_ONLY_FORFEITURE_FOR_AMBIGUOUS_LEGAL_JUDGMENT` | **TRUE** |
| `OBJECTIVE_INVALIDITY_CAN_BE_AUTOMATED` | **TRUE** |

Operational goal: normal commissions resolve automatically. Human attention is reserved for ambiguous semantic/claims cases, material compliance cases, creator appeals/disputes, unusual fraud patterns, policy exceptions, and provider/legal escalations.

Future scaling objective (not a current launch guarantee): **≥95% machine-resolved** after calibration and sufficient volume.

---

## B. Content registry / compliance evidence

Cash-commission creator promotion must be machine-auditable.

Future logical registry minimum fields:

- `creator_id`
- `campaign_id`
- `content_id`
- `tracking_link_id`
- `source_platform`
- `content_url`
- `content_snapshot` / version
- `registered_at`
- `last_scanned_at`
- `disclosure_status`
- `claim_scan_status`
- `compliance_status`
- `risk_flags`
- evidence references

Cash-attributed promotional content must be registered or otherwise machine-resolvable to a known creator/campaign/content identity.

M55 must **not** rely on Human searching the entire Internet manually.

Machine inspection scope: attributable/registered promotional content plus risk-triggered evidence only.

---

## C. Content compliance machine pipeline

Future architecture must support:

- text/caption extraction
- image/visual text inspection
- video/audio transcription
- multimodal semantic inspection
- URL/landing-page validation
- required PR/affiliate disclosure detection
- approved-claims validation
- prohibited-claims detection
- content-version / change detection

Architecture pattern:

**DETERMINISTIC RULE ENGINE + AI SEMANTIC CLASSIFIER**

AI is evidence/risk classification — **not** unlimited legal authority.

Risk concept examples:

- guaranteed future/result claim
- fortune/fate certainty
- fabricated testimonial
- guaranteed income / easy-money claim
- recruitment-income framing
- missing required advertising disclosure
- unapproved product claims

**Do NOT** ban the word `相性` itself. M55 has legitimate relationship-product language.

Prohibited boundary is authority/fortune/guarantee framing such as:

- fortune telling / 鑑定 authority
- fate certainty
- future certainty
- guaranteed reconciliation/outcome
- fabricated knowledge of another person's private feelings
- guaranteed earnings

---

## D. Machine decision classes

### AUTO_PASS

Objective required checks satisfied and no unresolved risk remains.

### AUTO_CANCEL_OBJECTIVE

Use only where invalidity is objectively established by contract/data:

- refund
- chargeback where policy requires cancellation
- duplicate commission
- invalid attribution
- confirmed self-referral
- confirmed circular abuse
- non-existent/failed eligible purchase

Do **not** use `AUTO_CANCEL_OBJECTIVE` merely because an AI model dislikes marketing wording.

### AUTO_HOLD

Machine detects unresolved compliance/fraud/provider risk.

Examples:

- missing disclosure
- suspicious content change
- AI semantic violation flag
- unusual device/payment cluster
- provider warning
- conflicting attribution evidence

### HUMAN_REVIEW

Only for unresolved ambiguous/material exceptions.

Possible Human actions:

- `RELEASE`
- `DECLINE_RELATED_COMMISSION`
- `KEEP_HOLD`
- `PAUSE_CREATOR`
- `TERMINATE_PARTNERSHIP`
- `REQUEST_CORRECTION`

Termination/forfeiture must follow approved policy and applicable law.

---

## E. Correction / re-scan loop

For machine-correctable issues:

`AUTO_HOLD`
→ machine notice to Creator
→ Creator corrects content
→ new snapshot
→ automatic re-scan
→ `AUTO_RELEASE` if all checks pass

Example: required PR disclosure missing → content/referral capability paused → disclosure corrected → re-scan → release if compliant.

Human approval is **not** required for every corrected low-risk case.

---

## F. 30-day commission review model

`STANDARD_COMPLIANCE_REVIEW_WINDOW_DAYS = 30`

Subject to mandatory applicable payment-deadline law and final R2-B2 professional confirmation.

At eligible purchase:

1. create idempotent commission event
2. initial state: **`COMMISSION_PENDING_COMPLIANCE_REVIEW`**

During review, check at minimum:

- payment succeeded
- refund/cancellation state
- dispute/chargeback state
- attribution validity
- self/circular referral
- duplicate commission
- creator partnership status
- registered content identity
- disclosure status
- claims/compliance status
- fraud/device/payment anomaly state
- provider risk state

Do **not** call this period:

- escrow
- Stripe escrow
- M55 escrow

`PENDING` is an internal conditional commission/accounting state.

---

## G. Automatic PAYABLE transition

Future machine rule concept:

```
review_age >= required_review_window
AND payment eligible
AND refund absent
AND unresolved dispute absent
AND attribution valid
AND creator active
AND objective abuse absent
AND unresolved compliance hold absent
AND provider risk hold absent
→ COMMISSION_PAYABLE
```

No Human button required for the normal case.

Crossing a Creator's 180/365-day rate boundary while an existing commission is **PENDING** must **not** change the purchase-event rate already assigned to that commission.

**PAYABLE: NO RETROACTIVE RATE REDUCTION.**

---

## H. Payout architecture

Target direction:

`TARGET_PAYOUT_EXECUTION = STRIPE_NATIVE_AUTOMATED_PAYOUT`

Preferred technical candidate:

`STRIPE_CONNECT_FIRST_CANDIDATE`

Possible candidate implementation pattern:

- platform-side customer charge
- internal `PENDING` compliance review
- `PAYABLE`
- aggregated Stripe-native transfer/payout
- payout status reconciliation

Separate Charges and Transfers or another Stripe-directed supported architecture may satisfy this pattern.

Preserve:

- `stripePayoutProviderStatus = UNSELECTED`

Do **not** assert:

- Connect selected
- Connect approved
- Global Payouts available
- Separate Charges and Transfers approved for the M55 account/model
- Stripe account approval obtained
- escrow

Final provider/flow selection requires R2-B2 account-specific confirmation.

---

## I. Payout aggregation

Never design: **one purchase = one bank payout**.

Future payout engine must:

- aggregate `PAYABLE` commissions by creator
- apply provider/legal eligibility
- apply payout threshold/cadence
- create idempotent payout instruction
- record Stripe/provider external IDs
- track processing / posted / failed / returned
- reconcile failures/returns

Exact threshold and payout cadence remain unresolved until R2-B2.

The 30-day review window must **not** be used to violate any applicable mandatory payment deadline.

Applicable Japanese legal/tax/payment deadlines are external confirmation items — not invented facts in this SSOT.

---

## J. Compliance violation scope

Do **not** implement blanket punishment logic such as "one bad post = confiscate every historical commission".

Freeze:

- violations affect the related content/campaign/commission set supported by evidence and contract
- severe violations may immediately pause future referral attribution, pause future payouts, hold affected `PENDING` commissions, trigger partnership review
- unrelated historical `PAYABLE` commissions are **not** retroactively erased merely because a later unrelated content violation occurs
- fraud/contract/legal remedies remain subject to final approved terms

---

## K. Auditability

Every material automated decision must be explainable from durable evidence.

Future decision record minimum:

- `decision_id`
- `commission_id`
- `creator_id`
- `decision_type`
- `rule_version`
- model/classifier version when applicable
- objective facts used
- risk flags
- content snapshot reference
- decision timestamp
- machine/human actor
- reason codes
- previous state
- next state

No silent commission disappearance.

Creator-facing dashboard must eventually distinguish:

`PENDING` · `HOLD` · `PAYABLE` · `PAYOUT_PROCESSING` · `PAID/POSTED` · `REVERSED/CANCELED`

with understandable reason/status where legally/product-safe.

---

## L. Human exception queue

Human operational UX must be **exception-first**.

Do **not** build a screen whose primary workflow is "approve every payout".

Future Human queue shows only cases needing intervention, with:

- risk severity
- creator
- affected commissions
- related content snapshot
- deterministic facts
- AI/rule findings
- recommended action
- financial exposure
- deadline
- appeal/correction history

Normal commissions must **never** appear as manual approval work.

---

## M. General User separation

General User referral remains a separate non-cash lane.

The creator compliance/payout engine must **not** turn ordinary users into cash affiliates.

| Rule | Value |
|---|---|
| cash | **prohibited** |
| transferable wallet | **prohibited** |
| downline | **prohibited** |

Launch v1: `GENERAL_USER_PRIMARY_V1 = FREE_COMPLETION_DIGITAL_UNLOCK`

Pair mutual artifact: `FUTURE_OPTIMIZATION_CANDIDATE`

---

## N. Corrected stop-loss automation principles

Do **not** treat arbitrary percentage matrices as automatic law.

| Event | Action |
|---|---|
| `CONFIRMED_SELF_REFERRAL` | objective rejection |
| `CONFIRMED_CIRCULAR_REFERRAL` | objective rejection / creator pause as policy permits |
| `CONFIRMED_DUPLICATE_COMMISSION` | objective cancellation |
| refund/chargeback on related transaction | reversal/cancellation per state/policy |
| Stripe/provider risk warning | immediate automated payout/referral **PAUSE** + review |
| **first observed chargeback** in small launch cohort | **HUMAN REVIEW** trigger — do not wait for 2% threshold |
| creator concentration > **35%** | diversification/dependency **REVIEW** only — not hard stop |
| creator-attributed contribution margin ≤ **0** after required variable costs | program economic **HARD STOP** |
| positive but materially deteriorating contribution | **HUMAN REVIEW** / future cohort admission pause |

High concentration alone is **not** misconduct. A creator producing >50% of attributable revenue must **not** be automatically stopped when fraud is absent, claims compliance is GREEN, refund/dispute quality is acceptable, and contribution remains positive.

Exact statistically meaningful rate thresholds may be frozen later after sufficient real volume exists.

---

## O. Implementation boundary

**NOT IMPLEMENTED:**

- content registry runtime
- compliance scanner runtime
- commission ledger runtime
- payout engine runtime
- exception queue UI
- Stripe Connect onboarding

Implementation order is defined in `docs/ssot/M55_ROADMAP.md` and `docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md`.

Do **not** implement payout before attribution/compliance/ledger.

Do **not** implement a Human-per-payout workflow as interim architecture.
