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

**Provider vs legal separation (Human-approved 2026-09-06):**

| Token | Status |
|---|---|
| `STRIPE_30_DAY_REVIEW_COMPATIBILITY` | **GREEN** — Stripe support confirmed provider compatibility for ~30-day review → PAYABLE → later transfer (Japan platform + Japan connected account) |
| `JAPAN_LEGAL_30_DAY_PAYMENT_COMPATIBILITY` | **OPEN** — Freelance Act applicability · mandatory payment deadline · Creator contract treatment · tax/withholding not resolved by Stripe response alone |

Stripe provider compatibility does **not** itself resolve Japanese mandatory-law questions. If law creates direct incompatibility → `REAL_INVALIDATOR` → Human architecture review. Do **not** silently change 30 days.

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

Stripe support (dated external evidence 2026-09-06) confirmed the described JP→JP M55 affiliate model can use delayed transfer after approximately 30-day review and identified **Separate Charges and Transfers** as the applicable flow. Stripe used **Express connected account** wording.

This does **NOT** prove:

- final M55WEB account approval (`M55_ACCOUNT_FINAL_STRIPE_APPROVAL = NOT_YET_CONFIRMED`)
- final connected-account API/configuration model (Express legacy type vs current configuration — OPEN)
- `losses_collector` / negative-balance responsibility (OPEN)
- final Connect pricing model (OPEN)
- legal/tax approval
- cash activation

Preserve:

- `stripePayoutProviderStatus = UNSELECTED`
- `R2_B2_CORE_STRIPE_ARCHITECTURE_FEASIBLE = TRUE`
- `STRIPE_CONNECT = VALIDATED_LEADING_PROVIDER_CANDIDATE`
- `SEPARATE_CHARGES_AND_TRANSFERS = STRIPE_SUPPORTED_M55_FLOW_CANDIDATE`

Do **not** assert:

- Connect selected
- Connect approved
- Global Payouts available
- Stripe account approval obtained
- escrow
- M55WEB fully approved
- Creator payout activated
- final account model frozen
- final negative-balance liability frozen
- final pricing model frozen

Final provider/flow selection requires remaining R2-B2 confirmation + R2 Final Human acceptance.

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

---

## P. Comparable-platform supporting research (dated 2026-09-06)

**DATED SUPPORTING RESEARCH — NOT timeless M55 authority.** Incorporates existing Codex competitive automation audit plus bounded official-source mapping. Do **not** repeat another broad market or commission-rate audit.

Mature comparable systems consistently combine:

- Pending / review states
- automatic normal release
- hold / fraud exceptions
- reversible pre-final commission states
- separate Payable states
- aggregated payout cycles
- creator-visible commission statuses
- earnings / sales / conversion reporting
- payout account/KYC readiness gates
- payout holds after security-sensitive account changes
- appeal/dispute paths
- immutable or traceable adjustments/reversals

| Platform | Supporting pattern (research summary) | Primary source |
|---|---|---|
| Shopify Collabs | ~30-day default hold, automatic payment, creator performance/payout visibility | https://help.shopify.com/en/manual/promoting-marketing/collabs/creators/payments |
| PartnerStack | automatic eligible commission approval, fraud holds, creator-visible statuses | https://docs.partnerstack.com/docs/commissions |
| impact.com | pending → locking → approved/payout lifecycle and reversals | https://help.impact.com/en/support/solutions/articles/48001235263 |
| Awin | pending review → approved → payable, auto-validation, transaction reporting | https://success.awin.com/s/article/Transaction-statuses |
| TikTok Shop | commission base, estimated commission, payout visibility/export | https://seller-us.tiktok.com/university/essay?knowledge_id=10011495 |
| YouTube / AdSense | invalid-traffic automation, holds, appeal/human review path | https://support.google.com/youtube/answer/1311392 |
| Patreon | 5-day payout-method-change hold precedent | https://support.patreon.com/hc/en-us/articles/360042152791 |
| Stripe Connect | hosted onboarding, payout readiness, webhook reconciliation, refund/dispute liability; Japan negative-balance recovery requires account-specific confirmation | https://docs.stripe.com/connect/onboarding · https://docs.stripe.com/connect/payouts |

This supports the existing M55 machine-first architecture. Do **not** copy competitor-specific product complexity.

---

## Q. Creator earnings transparency (frozen)

`CREATOR_EARNINGS_TRANSPARENCY = REQUIRED`

Creator must independently understand:

- traffic attributed to them
- valid Free completions where applicable
- eligible paid conversions
- conversion rate
- attributed sales
- estimated commission
- `PENDING` / `HOLD` / `PAYABLE`
- payout processing / posted payout
- refund/reversal adjustments
- next expected payout/release status

Future aggregate analytics (no unsupported vanity metrics as financial truth):

`unique_tracked_visits` · `valid_Free_completions` · `eligible_purchases` · `conversion_rate` · `attributed_gross_collected` · `commissionable_revenue` · `estimated_commission` · `payable_commission` · `paid_commission` · `refund_reversal_totals`

---

## R. Per-commission explainability (frozen)

Every creator-attributed commission must be explainable without Human contact for ordinary cases.

Future anonymized transaction row minimum:

- `purchase_reference` (creator-safe)
- purchase event timestamp
- product key / public product name
- customer amount actually collected
- `COMMISSIONABLE_REVENUE`
- rate applied
- calculated commission
- commission status
- payout status
- `release_at` / estimated release
- adjustment amount if any
- reason code
- payout batch reference if applicable

Creator must be able to answer: **"Why is this commission this amount and this status?"**

---

## S. Customer privacy boundary (frozen)

Creator dashboard must **NOT** expose:

- customer full name, email, DOB
- questionnaire answers
- private M55 reading content
- payment card/bank data
- raw device identity
- raw fraud graph data

Use anonymous transaction / attribution references only. Creator transparency must **not** become customer surveillance.

---

## T. Estimated vs final earnings (frozen)

Before `COMMISSION_PAYABLE`: creator-facing amount is **ESTIMATED / PENDING COMMISSION** — not guaranteed payment.

After `COMMISSION_PAYABLE`: commercial rate and commission amount are fixed except for separately recorded valid adjustments (refund/chargeback per contract).

Do **not** silently rewrite previously displayed history.

---

## U. Orthogonal commission and payout states (frozen)

Commission eligibility and payout readiness are **separate dimensions**.

**Commission states:**

`COMMISSION_PENDING_COMPLIANCE_REVIEW` · `COMMISSION_HOLD` · `COMMISSION_PAYABLE` · `COMMISSION_REVERSED` · `COMMISSION_ADJUSTED`

**Payout states:**

`PAYOUT_NOT_READY` · `PAYOUT_BLOCKED_KYC` · `PAYOUT_BLOCKED_PROVIDER` · `PAYOUT_BLOCKED_SECURITY` · `PAYOUT_QUEUED` · `PAYOUT_PROCESSING` · `PAYOUT_POSTED` · `PAYOUT_FAILED` · `PAYOUT_RETURNED`

KYC failure must **NOT** erase a valid commission. A creator may have `COMMISSION_PAYABLE` + `PAYOUT_BLOCKED_KYC` until payout readiness is restored.

---

## V. Immutable ledger (frozen)

`CREATOR_COMMISSION_LEDGER_APPEND_ONLY = TRUE`

Required model: original commission entry + immutable adjustment entries.

Examples:

- refund after commission → negative adjustment
- chargeback after `PAYABLE` → negative adjustment
- payout correction → explicit correction entry

Never silently mutate historical ¥673 into ¥0. Every adjustment references its originating commission/event.

---

## W. Calculation reproducibility (frozen)

Every commission must persist enough data to reproduce the calculation.

Future record minimum bindings:

`calculation_version` · `rate_schedule_version` · `commission_rate` · `currency` · `customer_amount_collected` · discount amount/state · tax exclusion inputs · `COMMISSIONABLE_REVENUE` · commission amount · purchase event time · `CREATOR_APPROVED_AT` · attribution policy version

- No floating-point money arithmetic in implementation
- Integer minor units / exact decimal-safe representation preferred
- For JPY, integer yen storage preferred where contract allows

**`MUST_RESOLVE_BEFORE_COMMISSION_LEDGER_IMPLEMENTATION`:** exact tax-base rounding and final commission rounding rule. R6 is blocked until one deterministic rounding rule is Human/legal/accounting approved. Do **not** invent rounding silently.

---

## X. Policy / terms version pinning (frozen)

Each creator and each commission must bind the policy versions that governed it:

`creator_terms_version` · `rate_schedule_version` · `attribution_policy_version` · `commission_policy_version` · `claims_policy_version` · `payout_policy_version`

Later terms must **not** silently rewrite historical commission eligibility.

---

## Y. Event-specific release_at (frozen)

`STANDARD_COMPLIANCE_REVIEW_WINDOW_DAYS = 30` remains the **default**.

`release_at` is a **per-commission** controlled value.

Release may extend beyond day 30 while legitimate unresolved conditions exist: refund/cancellation, dispute/chargeback, fraud investigation, content compliance `HOLD`, provider risk `HOLD`, attribution dispute.

Day 30 alone must **never** auto-release an unresolved `HOLD`. No arbitrary indefinite hold — reason, created time, and review state must be visible/auditable.

Mandatory legal payment deadlines override internal convenience.

---

## Z. Post-payable / post-payout adjustments (frozen)

30-day review does **not** eliminate later chargebacks.

Architecture:

- original `PAYABLE`/`POSTED` record remains historical fact
- later valid refund/chargeback → separate `NEGATIVE_ADJUSTMENT`
- this is **not** a retroactive rate reduction

Future recovery priority:

1. unbatched related `PAYABLE` where legally/contractually permitted
2. future creator `PAYABLE` offset where legally/contractually permitted
3. reserve / debt handling per approved policy
4. Human/legal exception if material

Do **not** assume Stripe can automatically debit a Japanese creator bank account for negative balance recovery.

**Ownership (Human-approved 2026-09-06):**

| Topic | R2-B2 | R8 |
|---|---|---|
| `NEGATIVE_BALANCE` | Japan/provider recovery-model **classification** | runtime handling / reconciliation **implementation** |

R2-B2 must classify who bears Creator connected-account negative balances before R2 closure. R8 implements recovery/reconciliation after classification. No Japan bank auto-debit assumption.

---

## AA. Stripe-hosted payout onboarding (frozen)

`STRIPE_HOSTED_PAYOUT_ONBOARDING_PREFERRED = TRUE` — subject to R2-B2 confirming actual Connect configuration.

Preferred future flow:

1. M55 Creator approved
2. create/associate Stripe connected account
3. Stripe-hosted or Stripe-embedded onboarding
4. Creator provides identity/KYC and payout bank data **to Stripe**
5. M55 receives provider IDs/status
6. payout only when provider readiness is GREEN

`M55_DOES_NOT_STORE_FULL_CREATOR_BANK_ACCOUNT_DETAILS = TRUE` unless unavoidable approved provider contract requires otherwise.

M55 stores minimum provider metadata only: `creator_id` · `stripe_connected_account_id` · onboarding status · requirements status · `payouts_enabled` equivalent · provider status timestamps · provider-safe masked metadata when genuinely necessary

---

## AB. Provider readiness monitoring

Stripe onboarding return does **not** itself mean payout-ready.

Future integration must monitor: `payouts_enabled` · `requirements.currently_due` · `requirements.past_due` · `requirements.pending_verification` · disabled reason · relevant capability state · `account.updated` / provider equivalents

Commission eligibility and payout eligibility stay separate.

---

## AC. Payout destination security (frozen)

`PAYOUT_DESTINATION_CHANGE_SECURITY_HOLD = REQUIRED`

Initial M55 security default: **5 full calendar days** after payout destination / bank payout method is added or materially changed (subject to provider/legal constraints).

During hold:

- future payout execution = **blocked**
- commission accrual = **continues**
- valid `PAYABLE` balance = **preserved**

Before release: step-up authentication where available · provider re-verification · risk check · creator notification · no unresolved takeover signal

Provider may impose a longer hold. Mandatory legal payment deadlines must be respected.

---

## AD. Creator account takeover protection

High-risk profile actions: payout destination change · identity/KYC change · email/account recovery · 2FA/security method reset · sudden payout request after profile change

→ `PAYOUT_BLOCKED_SECURITY` / `AUTO_HOLD` when risk rules require.

Creator must receive security notification. Never rely solely on one session cookie for payout destination changes.

---

## AE. Self-referral / circular abuse machine block (frozen)

`SELF_REFERRAL_AND_CIRCULAR_ABUSE_MACHINE_BLOCK = REQUIRED`

**Objective `AUTO_CANCEL` candidates:**

- creator account == purchaser account
- confirmed identical payment identity
- duplicate commission for same eligible purchase
- confirmed A→B→A circular abuse
- non-existent/failed payment
- confirmed prohibited self-purchase attribution

**Risk signals only (NOT automatic forfeiture alone):** same IP · same device · same address · same surname · high velocity · account creation burst · device cluster · payment cluster · unusual geographic pattern

Multiple risk signals → `AUTO_HOLD` → machine investigation → Human only if unresolved/material. Avoid simplistic IP-only banning.

---

## AF. Fraud graph / attribution evidence

Future fraud system must support graph relationships among:

creator account · referrer link · click/session · buyer account · device cluster · payment identity · purchase · commission

Attribution evidence must be durable. Required concepts:

`tracking_link_id` (signed/unguessable) · `click_event_id` · `creator_id` · attribution source · attribution timestamps · policy version · eligibility lock time

Once eligible purchase attribution is locked, later unrelated clicks must **not** silently steal/overwrite it. Exact attribution window = R5 contract item unless frozen elsewhere.

---

## AG. Attribution conflict contract (R5 pre-freeze)

Before R5 implementation, publish deterministic precedence for:

- multiple creator touches
- creator link vs General User invite
- cookie vs signed link evidence
- same-device conflicting account evidence
- late click after eligibility lock

Conflict resolution: deterministic policy where possible → exception only when genuinely ambiguous. Database race order must **not** decide financial attribution.

---

## AH. Creator discrepancy / appeal path (frozen)

`CREATOR_DISCREPANCY_AND_APPEAL_PATH = REQUIRED`

Creator may challenge: missing attribution · incorrect amount · incorrect `HOLD`/`DECLINE` reason · fraud false positive · content compliance false positive · payout failure status

Future case record: `case_id` · `creator_id` · affected commission(s) · reason · creator evidence · machine evidence · `opened_at` · status · decision · decision reason · `resolved_at`

AI semantic `HOLD` must have correction/appeal path.

**`MUST_RESOLVE_BEFORE_BETA_TERMS_FREEZE`:** exact appeal submission deadline and Human SLA. Do **not** invent a legal SLA in this docs gate.

---

## AI. Content version / rescan

Registry must preserve: original snapshot · content fingerprint · platform/source · observed version · disclosure state · claim scan result · last scan · deletion observation when relevant

Material content change → re-scan. Disclosure disappearance → `AUTO_HOLD` affected pending scope as policy permits. Do not erase prior compliant snapshots.

Periodic scan cadence: `DEFER_UNTIL_BETA_DATA` / implementation calibration.

---

## AJ. Creator Dashboard contract — R7 (frozen)

R7 is **not** cosmetic. Minimum trust contract:

**PERFORMANCE:** unique visits · valid Free completions · eligible paid conversions · conversion rate · attributed sales

**EARNINGS:** estimated commission · `PENDING` · `HOLD` · `PAYABLE` · `POSTED` · adjustments

**PAYOUT:** next eligible payout/release · blocked reason · payout batch status · failed/returned resolution path

**COMPLIANCE:** registered content · compliance state · required correction · appeal/discrepancy state

**EXPORT:** machine-readable statement suitable for reconciliation (exact tax-document format = legal/tax confirmation)

---

## AK. Payout statement

Every posted payout batch must be explainable.

Future statement minimum: batch ID · covered commission IDs/count · gross eligible commission · adjustments · withholding/tax deductions if legally required · provider fees if creator-borne under final contract · net payout · currency · payout date · provider payout reference · status

Commercial commission rate must remain distinguishable from tax or other legally required payout deductions.

---

## AL. Payout idempotency (frozen)

`PAYOUT_INSTRUCTION_IDEMPOTENCY = REQUIRED`

Deterministic uniqueness required for: commission creation · adjustment creation · payout batch creation · provider transfer instruction · provider payout event ingestion · webhook replay

Duplicate webhook or retry must **never** create duplicate creator money. Provider external IDs must bind durably to internal instructions.

---

## AM. Payout failure / returned

Future provider lifecycle must ingest: created · processing/in_transit · paid · failed · returned/canceled

On failure: do **not** mark commission unpaid/invalid. Use `PAYOUT_FAILED` or `PAYOUT_RETURNED`, preserve `PAYABLE` economics, block further payout if destination invalid, prompt provider re-onboarding/update, retry idempotently after resolution.

---

## AN. Termination / creator pause

Termination separates: future attribution · pending commissions · payable commissions · historical paid commissions

Severe violation may immediately stop **future** attribution. Must **not** automatically erase unrelated historical earnings. Each affected `PENDING` commission adjudicated under governing policy/evidence. `PAYABLE` protected except explicit lawful adjustment/recovery events.

---

## AO. Operational observability

Machine-first requires machine observability. Future operations must detect:

`PENDING` beyond expected `release_at` · `HOLD` without owner/reason · `PAYABLE` stuck outside batch · payout batch stuck · provider webhook mismatch · failed/returned payouts · duplicate event attempts · provider/KYC regressions · security holds · unresolved appeals

Use exception queues and alerting. No Human daily spreadsheet reconciliation workflow.

---

## AP. Dead-letter / replay (frozen)

External provider/webhook processing must be replay-safe. Failed processing → durable retry/dead-letter path. Replaying an event must reproduce the same financial result. No silent event loss.

---

## AQ. Human workload principle (reinforced)

`HUMAN_DOES_NOT_APPROVE_EVERY_PAYOUT = TRUE`

Normal financial reconciliation must **not** create proportional Human workload. Creator count must **not** directly determine Human workload. **Exception volume** determines Human workload.

---

## AR. R2-B2 checklist hardening

### P0 evidence received (Human-approved 2026-09-06)

| Classification | Status |
|---|---|
| `R2_B2_STRIPE_P0_1_BUSINESS_CLASSIFICATION` | **GREEN_WITH_CONDITION** |
| `R2_B2_STRIPE_P0_2_JP_CREATOR_COMMISSION` | **GREEN** |
| `R2_B2_STRIPE_P0_3_30_DAY_TRANSFER_MODEL` | **GREEN** |
| `R2_B2_CORE_STRIPE_ARCHITECTURE_FEASIBLE` | **TRUE** |

### Residual confirmation required (`R2_B2_STRIPE_RESIDUAL_CONFIRMATION`)

Before payout implementation and before provider final selection, R2-B2 must still confirm:

- **A.** Current recommended connected-account implementation model — Stripe said "Express"; exact configuration remains OPEN
- **B.** Negative-balance / losses responsibility — who bears Creator connected-account negative balances
- **C.** M55WEB formal account review — process/timing/evidence for specialist supportability review
- **D.** M55WEB Connect pricing model — account-specific applicable pricing model

Plus remaining Japan legal/tax classification:

- Japan legal/payment-deadline compatibility (`JAPAN_LEGAL_30_DAY_PAYMENT_COMPATIBILITY = OPEN`)
- Japan tax/withholding classification sufficient for R2 closure

`R2_B2_STRIPE_RESIDUAL_CONFIRMATION = A_D_ONLY`

`NO_BROAD_STRIPE_RESEARCH_REPLAY = TRUE`

Previously mapped provider topics such as payout controls, KYC, refund/dispute mechanics, transfer reversal, payout scheduling, destination updates, webhook/data boundaries and similar operational details remain implementation/reference requirements where applicable, but they are **NOT** additional Stripe support questions for this R2-B2 residual gate unless a new account-specific ambiguity or direct invalidator appears.

Until R2-B2 closure + R2 Final Human acceptance: `stripePayoutProviderStatus = UNSELECTED`

---

## AS. Explicit unresolved blockers

Do **not** disguise unresolved questions as decisions:

| Blocker | Owning gate |
|---|---|
| exact commission rounding | R6 |
| exact tax-base rounding | R6 |
| exact attribution expiry/window | R5 |
| exact payout threshold | R8 |
| exact payout cadence | R8 |
| exact appeal submission period/SLA | beta terms freeze |
| post-payout reserve amount/policy | R8 |
| cross-border creator support | R2-B2 |
| Japan tax/withholding classification | R2-B2 (classify) · R8 (implement) |
| negative-balance recovery model | R2-B2 (classify) · R8 (implement) |
| final Connect configuration | R2-B2 |

**R2-B2 CLASSIFIES · R6/R8 IMPLEMENT** — do not solve rounding in R2-B2; do not implement negative-balance/tax runtime in R2-B2.

No implementation may silently choose financial semantics.

---

Do **not** pull R6–R8 runtime implementation into R2.

---

## AU. External audit disposition (dated 2026-09-06)

Latest external audit (including Gemini) is **SUPPORTING EVIDENCE ONLY**. Do **not** create implementation authority from audit opinion alone. External audit alone is **not** an invalidator for frozen decisions.

**Absorbed:**

| Token | Meaning |
|---|---|
| `CREATOR_PAYOUT_BLOCK_REASON_MUST_BE_ACTIONABLE` | §AV |
| `FOUNDING_CREATOR_EXCEPTION_REVIEW_MUST_BE_HIGH_TRUST` | §AW |
| `EARNINGS_TRANSPARENCY_IS_A_CREATOR_ACQUISITION_ASSET` | §AX |

**Rejected absolute/unsafe language:**

- 完全勝利 · 絶対的な信頼 · リスクを完全に潰す
- Creator money is "safely stored"
- escrow-like wording
- competitors are exploitative
- Human-less means zero operational risk

**Not frozen from external audit alone:**

- universal 10.21% withholding rule
- specific tax/commission rounding convention
- unsupported legal conclusions

Tax/withholding classification remains R2-B2 work; payout/tax operational implementation remains R8. Rounding remains R6 (§AS).

---

## AV. Actionable payout-block UX (frozen)

`CREATOR_PAYOUT_BLOCK_REASON_MUST_BE_ACTIONABLE = TRUE`

Whenever payout is blocked, Creator-facing UX must answer:

1. Is the commission itself still valid?
2. Why is payout blocked?
3. What must the Creator do?
4. What will M55/Stripe do automatically next?
5. Is there an expected review/retry state?
6. Where can the Creator challenge an incorrect block?

**Example — `COMMISSION_PAYABLE` + `PAYOUT_BLOCKED_KYC`:**

- commission remains valid
- payout cannot proceed until Stripe/provider verification completes
- Creator sees required onboarding/verification steps
- system monitors provider readiness automatically
- appeal/discrepancy route available if block is incorrect

**Do NOT present as:** money confiscated · commission canceled · escrow · funds guaranteed safe

---

## AW. High-trust exception review — founding cohort (frozen)

`FOUNDING_CREATOR_EXCEPTION_REVIEW_MUST_BE_HIGH_TRUST = TRUE`

For the initial **20** Creator cohort, risk signals alone must **not** become automatic forfeiture:

- same device · same IP · velocity anomaly · device/payment cluster · content semantic flag

**Normal flow:**

```
risk signal → AUTO_HOLD → machine evidence → correction/evidence submission
→ machine re-scan → Human only if unresolved/material → explicit decision reason
```

Creator must understand why the case was held. No silent rejection.

---

## AX. Transparency as acquisition value (frozen)

`EARNINGS_TRANSPARENCY_IS_A_CREATOR_ACQUISITION_ASSET = TRUE`

Does **not** change commission economics.

Creator launch messaging may accurately emphasize:

- attributable performance is visible
- commission calculation is explainable
- status/reason codes are visible
- adjustments are traceable
- Creator can reconcile/export their own earnings data
- normal payouts do not depend on arbitrary per-payout Human approval

Public/Creator-facing copy must remain factual.

**Do NOT claim:** perfect attribution · zero mistakes · guaranteed earnings · guaranteed payout · absolute fraud prevention

---

## AY. R3 ownership — launch-readiness audit

R3 `M55-INFLUENCER-PRODUCT-LAUNCH-READINESS-CODEX-AUDIT` validates (does **not** implement R7):

- Creator onboarding comprehension
- Creator-facing Product Truth
- commission and 50/40/30 explanation
- `PENDING` / `HOLD` / `PAYABLE` comprehension
- KYC/payout block explanation (actionable framing)
- PR/disclosure clarity
- prohibited claims / no misleading earnings language
- refund/reversal explanation
- Creator support/dispute route
- earnings transparency positioning without guarantees
- Founder/Founding Creator narrative

---

## AZ. Expanded stage ownership — R5 / R6 / R7 / R8

### R5 `ATTRIBUTION_AND_COMPLIANCE`

Direct attribution evidence · one-purchase/one-Creator rule · multiple-touch precedence · General invite vs Creator attribution · signed tracking IDs · eligibility lock · self-referral · circular referral · duplicate attribution · fraud graph · content registry · content snapshots · content re-scan · disclosure checks · claims checks · `AUTO_PASS` · `AUTO_CANCEL_OBJECTIVE` · `AUTO_HOLD` · Human exception routing · Creator correction · appeal/discrepancy intake. **No payout execution.**

### R6 `COMMISSION_LEDGER`

Append-only commission ledger · immutable adjustments · `calculation_version` · `rate_schedule_version` · terms/policy versions · `COMMISSIONABLE_REVENUE` calculation · integer/exact money · rounding contract · purchase-event rate lock · `release_at` · `PENDING` · `HOLD` · `PAYABLE` · `REVERSED` · `ADJUSTED` · post-`PAYABLE` adjustment accounting · idempotent commission creation · financial replay safety. **Must not silently choose unresolved rounding/tax semantics.**

### R7 `CREATOR_DASHBOARD`

Creator trust/control UX surfaces:

**PERFORMANCE:** unique tracked visits · valid Free completions · eligible paid conversions · conversion rate · attributed sales

**EARNINGS:** estimated commission · `PENDING` · `HOLD` · `PAYABLE` · `POSTED` · adjustments

**PER-COMMISSION:** anonymous purchase reference · product · purchase time · amount collected · commissionable base · rate · commission · `release_at` · reason code · payout status

**PAYOUT BLOCK UX:** KYC/provider/security reason · commission still valid or not · exact Creator next action · automatic system next action

**COMPLIANCE:** registered content status · correction required · appeal/discrepancy status

**EXPORT:** machine-readable reconciliation export

Customer PII remains hidden. **Trust surface — not cosmetic analytics.**

### R8 `PAYOUT_AND_SETTLEMENT`

Stripe/provider account integration · hosted onboarding · KYC readiness · `payouts_enabled`/equivalent · provider requirements sync · commission/payout state separation · payout batching · threshold/cadence · payout instruction idempotency · provider transfer IDs · payout processing · posted · failed · returned · re-onboarding · destination-change security hold · account-takeover controls · provider webhook processing · dead-letter/replay · negative balance handling · refund/chargeback post-payout reconciliation · payout statement. **No bank account details stored directly by M55 unless later unavoidable and explicitly approved.**

Do **not** pull R6–R8 runtime implementation into R2.
