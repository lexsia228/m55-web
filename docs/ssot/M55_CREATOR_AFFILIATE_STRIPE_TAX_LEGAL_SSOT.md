# M55 Creator Affiliate / Stripe / Tax-Legal SSOT

Status: **ACTIVE / HUMAN-APPROVED ARCHITECTURE CONTRACT (2026-09-09; Rev4 reconciled 2026-09-13)**

Implementation status: **CREATOR CASH INFRASTRUCTURE NOT IMPLEMENTED**

Sole executable CURRENT/NEXT authority remains `docs/ssot/M55_EXECUTION_STATE.json`. This SSOT does not advance the execution gate, create connected accounts, move money, or authorize Production cash activation.

Human-frozen operating-model delta: `docs/ssot/M55_CREATOR_AFFILIATE_OPERATING_MODEL_SSOT.md`

Parent roadmap authority: `docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md`

Compliance/payout state authority: `docs/ssot/M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md`

Stripe primary evidence: `docs/evidence/M55_R2_B2_STRIPE_SUPPORT_EVIDENCE_2026-09-08.md`

Commercial/legal/tax primary evidence pack: `docs/evidence/M55_CREATOR_REVENUE_COMMERCIAL_LEGAL_TAX_EVIDENCE_2026-09-09.md`

---

## A. Human-approved v1 business model

`CREATOR_PROGRAM_V1 = AFFILIATE_FIRST`

M55 v1 is designed around a Creator-specific URL/direct link. A Creator may introduce M55 to another user. If the attributed user makes an eligible paid purchase, M55 may create a commission under the published Creator contract.

Affiliate v1 intentionally does **not** require:

- a minimum number of posts;
- a fixed posting date/time;
- a commissioned video, article, image or other creative deliverable;
- a fixed working schedule;
- recruitment of other Creators;
- downline/upline or recursive compensation;
- purchase/inventory/joining fee as a condition of earning.

The Creator chooses whether, when, where and how to introduce M55, subject to mandatory safety/compliance boundaries.

`AFFILIATE_V1_MANDATORY_DELIVERABLE = NONE`

`AFFILIATE_V1_MANDATORY_POSTING_SCHEDULE = NONE`

`AFFILIATE_V1_RECRUITMENT_COMMISSION = PROHIBITED`

This is a **design fact**, not a legal conclusion that the Freelance Act can never apply. Contract labels do not override transaction reality.

---

## B. Mandatory Creator safeguards

M55 may require every Affiliate Creator to comply with:

- M55 Creator terms;
- Stripe rules and connected-account requirements;
- applicable Japanese law;
- clear advertising / PR disclosure when legally required;
- M55 approved-claims and prohibited-claims policy;
- no guaranteed fortune/future/result claims;
- no psychic/supernatural-authority overclaim prohibited by M55 Product Truth;
- no self-referral, circular-referral, duplicate-identity/payment abuse or fraud;
- no deceptive earnings claim;
- refund/chargeback/eligibility rules.

These safeguards do not silently convert Affiliate v1 into a sponsored-content work order. If M55 later commissions a specific deliverable, post, campaign, script, date or production service, that relationship must enter a separately classified `SPONSORED_CREATOR` contract.

`AFFILIATE_CREATOR_AND_SPONSORED_CREATOR_MUST_NOT_BE_SILENTLY_MIXED = TRUE`

---

## C. Stripe reverse-designed money flow

Human-approved target architecture:

```
Customer
  -> M55 paid product
  -> Stripe charge on M55 platform
  -> M55 attribution decision
  -> M55 commission calculation
  -> M55 compliance/refund/fraud review
  -> COMMISSION_PAYABLE
  -> aggregate payout batch
  -> Stripe Connect transfer: M55 platform -> Creator connected account
  -> Stripe payout: Creator connected account -> Creator bank
  -> Stripe/provider event -> M55 reconciliation
```

`CUSTOMER_CHARGE_OWNER = M55_PLATFORM`

`AFFILIATE_ATTRIBUTION_OWNER = M55`

`COMMISSION_LEDGER_OWNER = M55`

`STRIPE_CONNECT = REQUIRED`

`STRIPE_CONNECT_FLOW = SEPARATE_CHARGES_AND_TRANSFERS`

`STRIPE_ACCOUNT_API = ACCOUNTS_V2`

`STRIPE_CONNECTED_ACCOUNT_DASHBOARD = EXPRESS`

`STRIPE_CONNECT_FEES_BILLED_TO = M55_PLATFORM_BALANCE`

`STRIPE_CONNECT_LOSS_RESPONSIBILITY = APPLICATION`

`STRIPE_HOSTED_KYC_AND_BANK_DATA_PREFERRED = TRUE`

`M55_FULL_CREATOR_BANK_DATA_STORAGE = PROHIBITED_UNLESS_LATER_UNAVOIDABLE_AND_HUMAN_APPROVED`

Do not transfer Creator commission at customer-purchase time. Purchase attribution is not commission finality.

`NO_STRIPE_TRANSFER_BEFORE_PAYOUT_BATCH_LOCK = TRUE`

`CONNECTED_ACCOUNT_PAYOUT_SCHEDULE_V1 = MANUAL`

`CONNECTED_ACCOUNT_MANUAL_HOLD_MAX_DAYS_JP = 90`

`CREATOR_PAYABLE_CASH_COVERAGE_RATIO = 100%`

Launch cash scope:

```text
V1_CASH_CREATOR_RESIDENCY = JAPAN_RESIDENT_ONLY
V1_PAYOUT_CURRENCY = JPY_ONLY
V1_PAYOUT_BANK_COUNTRY = JAPAN
NON_RESIDENT_CREATOR_CASH_PAYOUT = BLOCKED
MY_NUMBER_COLLECTION_V1 = OFF
CREATOR_MINIMUM_AGE_YEARS = 18
```

---

## D. Commission and payout separation

Commission validity and payout readiness are orthogonal.

Canonical commission states remain:

- `COMMISSION_PENDING_COMPLIANCE_REVIEW`
- `COMMISSION_HOLD`
- `COMMISSION_PAYABLE`
- `COMMISSION_REVERSED`
- `COMMISSION_ADJUSTED`

Canonical payout states remain:

- `PAYOUT_NOT_READY`
- `PAYOUT_BLOCKED_KYC`
- `PAYOUT_BLOCKED_PROVIDER`
- `PAYOUT_BLOCKED_SECURITY`
- `PAYOUT_QUEUED`
- `PAYOUT_PROCESSING`
- `PAYOUT_POSTED`
- `PAYOUT_FAILED`
- `PAYOUT_RETURNED`

`PAYOUT_APPLICATION_REQUIRED = FALSE`.

Standard and tail settlements follow the frozen due-date rules.

No Creator-requested early-trigger payout is authorized in v1. A Creator request cannot approve a commission and cannot make an invalid commission valid.

---

## E. Payout batching and small-balance economics

Never create one bank payout per purchase.

`PAYOUT_BATCHING_REQUIRED = TRUE`

M55 should aggregate valid `COMMISSION_PAYABLE` amounts before payout to reduce fixed per-payout cost and reconciliation load.

The following payout economics are frozen by Rev4 Operating Model for the current operator branch. R8 implements them; they are not unresolved design questions.

`PAYOUT_BATCHING_REQUIRED = TRUE`

`STANDARD_PAYOUT_THRESHOLD_JPY = 20_000`

`STANDARD_PAYOUT_CADENCE = MONTHLY`

`STANDARD_PAYOUT_DAY_OF_MONTH = 15`

`STANDARD_PAYOUT_BATCH_CUTOFF = PRIOR_CALENDAR_MONTH_END_23_59_59_JST`

`PAYOUT_APPLICATION_REQUIRED = FALSE`

`BELOW_THRESHOLD_TREATMENT = CARRY_OVER_NO_FORFEITURE`

`TAIL_SETTLEMENT_TRIGGER_AGE_DAYS = 180`

`TAIL_AGE_ANCHOR = OLDEST_UNSETTLED_PAYABLE_AT`

`PAYOUT_DUE_AT = earliest applicable of STANDARD_PAYOUT_DUE_AT / TAIL_DUE_AT / APPLICABLE_LEGAL_DUE_AT`

Founding 180-day rate window and tail-settlement 180-day age are separately named.

`LEGAL_PAYMENT_DEADLINE_OVERRIDES_ECONOMIC_THRESHOLD = TRUE_IF_APPLICABLE`

If an applicable statutory or contractual payment deadline arrives before the economic threshold, the deadline wins. No threshold/carry-over policy may be used to create an unlawful late payment.

---

## F. Payout-cost ownership: economic objective vs legal authority

Human economic requirement:

`M55_PAYOUT_COST_PASS_THROUGH_OBJECTIVE = HUMAN_APPROVED`

`STANDARD_PAYOUT_COST_ECONOMIC_BEARER = CREATOR`

`M55_STANDARD_PAYOUT_SUBSIDY = PROHIBITED_BY_DEFAULT`

The goal is to avoid a business model where M55 permanently absorbs avoidable Creator bank-payout costs, especially for very small balances. Forced-tail residual M55 cost is a bounded exception only.

Under the current operating branch, the standard payout-processing fee is a separate disclosed M55 service consideration with contractual payout setoff:

```text
STANDARD_PAYOUT_FEE_BASE_JPY = 770
STANDARD_PAYOUT_FEE_BASE_PAYABLE_JPY = 20_000
STANDARD_PAYOUT_FEE_INCREMENT_BPS = 55
excess_jpy = MAX(SETTLEMENT_PAYABLE_JPY - 20_000, 0)
increment_tens = (excess_jpy * 55 + 99_999) // 100_000
STANDARD_PAYOUT_PROCESSING_FEE_JPY = 770 + 10 * increment_tens
TAIL_EFFECTIVE_PAYOUT_FEE_JPY = MIN(standard fee, FLOOR(SETTLEMENT_PAYABLE_JPY * 0.25))
PAYOUT_FEE_IS_SEPARATE_M55_SERVICE_CONSIDERATION = TRUE
CREATOR_AUTHORIZES_DISCLOSED_CONTRACTUAL_SETOFF_AT_PAYOUT = TRUE
DOUBLE_PAYOUT_FEE = PROHIBITED
```

Fee policy locks at payout-instruction lock. One fee per economic instruction/retry chain. No negative payout. No fee-caused forfeiture.

Stripe billing and Creator fee policy remain separate facts:

1. Under the M55-specific Stripe Support answer dated 2026-09-08, the observed Accounts v2 + Express Dashboard + Separate Charges and Transfers configuration uses platform-managed pricing and Connect charges are debited from the M55 platform Stripe balance.
2. The Creator-facing fee is M55 service consideration, not an exact Stripe invoice line-item pass-through.
3. Current Stripe account pricing/tax invoice must still be verified before Production cash activation.

Re-review is required if employee/entity/relationship/law facts change. Article 5 reduction-prohibition / bank-fee deduction rules are not the current no-employee operating branch, but they remain a future invalidator if M55 becomes a `特定業務委託事業者`.

---

## G. Creator legal-relationship classification

R2-B2 classified current-operator relationship facts. v1 remains `AFFILIATE_ONLY`. Any later Sponsored Creator work order requires a separate classification. Counsel identification of other models is optional risk reduction, not a launch token.

M55 v1 target is `AFFILIATE_ONLY`. Current operating branch:

```text
M55_IS_SPECIFIED_COMMISSIONING_BUSINESS_OPERATOR_UNDER_FREELANCE_ACT = FALSE
FREELANCE_ACT_ART3_READY_DISCLOSURE = REQUIRED
JFTC_PRECLEARANCE_REQUIRED = FALSE
NTA_PRECLEARANCE_REQUIRED = FALSE
LEGAL_COUNSEL_PRECLEARANCE_REQUIRED = FALSE
TAX_ACCOUNTANT_PRECLEARANCE_REQUIRED = FALSE
OPTIONAL_PROFESSIONAL_REVIEW = RISK_REDUCTION_ONLY
```

Normal launch does **not** require prior JFTC, NTA, counsel, or tax-accountant approval. External professional review is risk-reduction only and is not a launch prerequisite.

`COMMERCIAL_PRECEDENT_IS_NOT_LEGAL_SAFE_HARBOR = TRUE`

`FREELANCE_ACT_CATEGORICAL_AFFILIATE_EXCLUSION = NOT_CONFIRMED`

The absence of a categorical affiliate exclusion is **not** a current design blocker. Article-3-ready electronic disclosure is still required if the relationship is covered delegation.

---

## H. Tax / withholding fail-closed contract

M55 must not hard-code a universal withholding percentage for Affiliate Creator commission.

`UNIVERSAL_WITHHOLDING_RATE = PROHIBITED`

For ordinary Japanese-resident URL-only Affiliate commission under current no-salary-payer facts:

```text
DEFAULT_WITHHOLDING_RATE = 0
```

This is fail-closed to reclassification if the payment character changes (salary/employment, sponsored writing, model/performance, speaker fee, other specifically source-withheld remuneration) or if the recipient is nonresident / M55 becomes a salary payer.

Exact treatment for other branches must still be classified from the recipient and transaction facts. Creator tax profile remains required. No universal withholding percentage is assumed.

`CREATOR_TAX_PROFILE_REQUIRED_BEFORE_CASH_ACTIVATION = TRUE`

Creator-facing commission amounts are contractual total consideration:

```text
CREATOR_COMMISSION_QUOTED_AMOUNT = TAX_INCLUSIVE_TOTAL_CONTRACTUAL_CONSIDERATION
AUTOMATIC_PLUS_10_PERCENT_CLAIM = PROHIBITED
```

M55 consumption-tax status and qualified-invoice-issuer status are factual activation/accounting inputs, not external-professional approval tokens.

Minimum Creator tax profile:

- `creator_entity_type` — individual / corporation;
- `tax_residency`;
- `invoice_registration_status`;
- `invoice_registration_number` when applicable;
- `invoice_status_verified_at`;
- `withholding_classification`;
- `withholding_policy_version`;
- `consumption_tax_policy_version`;
- `tax_profile_last_confirmed_at`.

`CREATOR_TAX_PROFILE_REQUIRED_BEFORE_CASH_ACTIVATION = TRUE`

Tax status must be re-confirmable on material change and periodically. Exact refresh cadence is unresolved.

---

## I. Consumption tax / invoice fail-closed contract

Do not infer a Creator's consumption-tax status only from M55 commission volume.

NTA guidance states that a business can become a consumption-tax taxable person based on the ¥10 million base-period / specified-period rules, and an invoice-registered business is taxable regardless of that base-period sales threshold.

M55 therefore needs Creator self-declaration plus verifiable invoice-registration status where relevant.

Policy must be effective-dated. The 2026 tax reform changed the transitional input-tax-credit percentage for purchases from non-invoice issuers to:

- 70% from 2026-10 for 2 years;
- 50% from 2028-10 for 2 years;
- 30% from 2030-10 for 1 year;
- 0% from 2031-10 onward,

subject to then-current law and M55's actual accounting classification.

`TAX_POLICY_MUST_BE_VERSIONED = TRUE`

Do not embed these percentages as timeless constants outside a versioned tax-policy layer.

---

## J. High-earner / high-volume Creator design

A Creator reaching large legitimate volume is a success case, not an automatic violation.

`HIGH_VOLUME_ALONE_IS_NOT_COMMISSION_INVALIDATION = TRUE`

`NO_RETROACTIVE_RATE_REDUCTION_FOR_SUCCESS_VOLUME = TRUE`

High volume may increase:

- tax-profile verification;
- invoice-status verification;
- KYC/provider requirements monitoring;
- attribution anomaly review;
- self/circular-referral review;
- chargeback/refund monitoring;
- payout reconciliation;
- accounting evidence retention;
- security/ATO controls.

It must not, by itself:

- erase valid commission;
- silently lower a frozen applicable commission rate;
- create an arbitrary payout forfeiture;
- substitute Human suspicion for objective evidence.

Exact enhanced-review thresholds are unresolved and must not be invented before sufficient data/legal-tax design.

---

## K. Creator Revenue Console minimum contract

Future M55 Creator Revenue Console must show enough information for the Creator and M55 to reconcile money:

- attributed visits / eligible conversions;
- eligible sales base;
- estimated commission;
- pending / hold / payable commission;
- reason codes for hold/adjustment;
- payable balance;
- next frozen standard/tail/legal payout due date where applicable; no Creator-requested early-trigger payout in v1;
- Stripe/KYC readiness;
- invoice/tax-profile status at an appropriate privacy-safe level;
- payout batch status;
- Gross Payable Commission, Payout Processing Fee, statutory withholding if actually required, and Net Payout;
- payout history / provider reference.

No amount may silently disappear.

---

## L. Activation blockers

Actual Creator cash activation is prohibited until all of the following are GREEN:

1. Affiliate v1 legal relationship classification for the exact M55 contract/operation.
2. Japan payment-deadline classification.
3. Exact legality/contract mechanics of any Creator-borne payout/platform fee.
4. Japan withholding classification for intended Creator categories, including whether an individual Affiliate Creator could fall within the Income Tax Act/NTA `外交員等` source-withholding category.
5. Consumption-tax/invoice accounting treatment and evidence requirements.
6. Creator terms and disclosure contract.
7. R6 deterministic money/rounding contract.
8. R8 current Stripe account/configuration/capability/price reconciliation.
9. KYC/payout readiness fail-closed implementation.
10. Commission/payout ledger and reconciliation evidence.
11. Explicit Human activation approval.

`ACTUAL_CASH_ACTIVATION_FAIL_CLOSED = TRUE`

Provider-independent implementation may proceed under the frozen current-operator legal/tax branch.

Implementation must not invent facts that remain account-specific or operator-specific.

Production activation still requires:
- actual Stripe account pricing/tax-invoice evidence
- actual M55 consumption-tax / qualified-invoice factual status needed by accounting
- runtime money-safety controls
- required Production evidence
- explicit Human Production GO

No lawyer/tax-accountant/regulator confirmation is a routine activation prerequisite.

---

## M. Dated primary/official evidence

Stripe M55-specific primary evidence:
- Gmail thread with Stripe Support / Kuriyama, 2026-09-06 through 2026-09-08.
- Durable repo evidence: `docs/evidence/M55_R2_B2_STRIPE_SUPPORT_EVIDENCE_2026-09-08.md`.

Current Stripe public evidence:
- https://stripe.com/jp/connect/pricing
- https://docs.stripe.com/connect/separate-charges-and-transfers
- https://docs.stripe.com/connect/accounts-v2

Japan Freelance Act / JFTC:
- https://www.jftc.go.jp/fllaw_limited/fllaw_qa.html
- https://www.jftc.go.jp/houdou/pressrelease/2026/jun/260618_spc.html

Japan tax / NTA:
- https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2792.htm
- https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2793.htm
- https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6531.htm
- https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/invoice-review/index.htm

All external facts are dated evidence, not timeless constants. Re-verify at R8/activation and after relevant law/provider changes.

---

## N. No-regression / no-overclaim

- Do not relabel Affiliate v1 as a sponsored work order without an actual product/business change.
- Do not claim a categorical Freelance Act exclusion that official sources do not state. Current operating branch is frozen for present no-employee facts; Article-3-ready disclosure remains required if covered delegation.
- Do not claim a competitor's operation proves M55 legality.
- Do not treat the current disclosed M55 payout-processing service consideration as an Article 5 bank-fee deduction. If M55 later becomes a `特定業務委託事業者`, re-review before live payout.
- Do not hard-code universal 10.21% withholding.
- Do not treat Stripe pricing observed in 2026 as timeless; verify actual account pricing/tax invoice before Production cash activation.
- Do not use Creator inactivity or an economic threshold to violate an applicable payment deadline.
- Do not reduce valid earned commission merely because a Creator becomes highly successful.
- Do not move real Creator money until runtime/provider/accounting activation gates are closed. External professional approval is **not** one of those gates.

---

## O. 2026-09-09 deep Japan-law audit — categorical-exclusion correction

**Result:** the research did **not** locate an official JFTC/MHLW statement that ordinary affiliate commission is categorically outside the Freelance Act.

That absence matters. M55 must not convert a plausible business intuition into a legal fact.

### O-1. Freelance Act

The statute defines `業務委託` to include a business entrusting another business to provide services for its business.

Current JFTC Q&A provides useful boundary evidence:

- merely requesting the loan of an existing car/space is outside the Act because the requester is not specifying the content/specifications of a manufactured item, information product, or service;
- a service used by the ordering business is covered when the business specifies the service content and requests it;
- creation of software/video/design/music/text is an outsourcing relationship when specifications, theme or concept are specified;
- whether a platform is substantively outsourcing is judged from the contract and transaction reality, including involvement in the content, counterparty selection, remuneration decision, nature of the monetary claim, and responsibility on default.

M55 Affiliate v1 deliberately removes strong outsourcing characteristics: no mandatory post, no fixed date, no creative deliverable, no work quota, no working hours, no exclusivity, and no obligation to introduce anyone.

Those facts are **favorable but not conclusive**. Paying only when a referred customer buys can still be characterized as consideration for advertising/referral services depending on the exact contract and actual operation.

`FREELANCE_ACT_CATEGORICAL_AFFILIATE_EXCLUSION = NOT_CONFIRMED`

`M55_AFFILIATE_FACT_PATTERN_IS_LOWER_OUTSOURCING_RISK_THAN_SPONSORED_CREATOR = TRUE`

`CONTRACT_LABEL_DOES_NOT_CONTROL = TRUE`

### O-2. Current legal branch — no professional preclearance gate

Current M55 facts: individual sole proprietor, no employees, not current `特定業務委託事業者`.

```text
JFTC_PRECLEARANCE_REQUIRED = FALSE
NTA_PRECLEARANCE_REQUIRED = FALSE
LEGAL_COUNSEL_PRECLEARANCE_REQUIRED = FALSE
TAX_ACCOUNTANT_PRECLEARANCE_REQUIRED = FALSE
OPTIONAL_PROFESSIONAL_REVIEW = RISK_REDUCTION_ONLY
```

Normal launch does not require a JFTC fact-pattern consultation, NTA pre-transaction written answer, or counsel classification token.

Historical 2026-09-09 research recommended JFTC/NTA confirmation as risk reduction. That recommendation is **SUPERSEDED** as a launch prerequisite. Optional professional review remains allowed when a genuinely new or ambiguous fact arises.

`JFTC_M55_FACT_PATTERN_CONFIRMATION = NOT_REQUIRED_FOR_CURRENT_OPERATING_BRANCH` — SUPERSEDED as a launch gate.

If employee/entity/relationship/law facts change, the current branch is invalidated and must be re-reviewed.

### O-3. Labor/employment law

MHLW worker-status guidance focuses on subordination: freedom to accept/refuse work, concrete direction/supervision, time/place restraint, and labor-compensation characteristics.

M55 Affiliate v1's no-work-order/no-hours/no-quota/no-exclusivity design is low-risk by those factors, but actual operation still controls.

`LABOR_WORKER_STATUS_RISK = LOW_BY_DESIGN_NOT_CATEGORICALLY_ZERO`

### O-4. Advertising / stealth-marketing law

This is a **real applicable compliance area**, not a theoretical one.

CAA guidance states that the regulated party for stealth marketing is the advertiser whose product/service is being promoted; influencers/affiliates are generally not themselves the regulated advertiser. Affiliate pages/posts must make the advertising nature clear where the display is the advertiser's display.

Therefore M55 must retain:

`AFFILIATE_AD_DISCLOSURE_REQUIRED_WHEN_APPLICABLE = TRUE`

`M55_ADVERTISER_COMPLIANCE_RESPONSIBILITY = REQUIRED`

`PROHIBITED_CLAIMS_ENFORCEMENT = REQUIRED`

### O-5. MLM / business-opportunity-sales boundary

CAA guidance on chain-sales and business-opportunity-sales requires, among other elements, a special financial burden imposed on the participant.

M55 Affiliate v1 must preserve:

`NO_CREATOR_ENTRY_FEE_OR_REQUIRED_PURCHASE = TRUE`

`NO_REQUIRED_INVENTORY = TRUE`

`NO_PAID_TRAINING_REQUIRED_TO_EARN = TRUE`

`NO_CREATOR_RECRUITMENT_COMMISSION = TRUE`

These are hard anti-regression controls. Adding a joining fee, mandatory M55 purchase, starter kit or recruitment/downline reward can materially change the legal analysis and requires a new gate.

### O-6. Creator income tax

NTA explicitly lists affiliate income as income that is generally reportable as business income or miscellaneous income (business), depending on the facts.

High earnings do not create a new tax category merely because the amount is high.

M55's **payer-side source-withholding** for ordinary JP-resident URL-only Affiliate commission under current no-salary-payer facts is:

```text
DEFAULT_WITHHOLDING_RATE = 0
```

`NO_UNIVERSAL_WITHHOLDING_RATE = STILL_PROHIBITED`

`NTA_PRECLEARANCE_REQUIRED = FALSE`

`NTA_SOURCE_WITHHOLDING_CLASSIFICATION = FROZEN_FOR_CURRENT_NO_SALARY_PAYER_JP_RESIDENT_ORDINARY_AFFILIATE`

This must be reclassified if payment character / nonresident / salary-payer facts change. Historical "REQUIRED_BEFORE_CASH_ACTIVATION" language is **SUPERSEDED** as a launch prerequisite.

### O-7. Consumption tax / invoice

Creator commission can be a taxable transaction depending on the recipient and transaction facts. M55 must retain entity/tax-residency/invoice-registration data and effective-dated accounting policy.

The 2026 invoice-transition percentages already recorded in §I remain dated policy evidence, not timeless constants.

### O-8. Payment Services Act

FSA describes a funds-transfer business as accepting a customer's request to move funds between distant persons and carrying out that transfer.

M55's target architecture is materially different: M55 pays **its own commission obligation** to its Creator and uses Stripe as the transfer/payout rail. M55 must not accept customer/Creator funds for onward remittance to third parties and must not represent the pending commission as escrow.

`M55_DOES_NOT_OFFER_THIRD_PARTY_REMITTANCE = TRUE`

`M55_DOES_NOT_OFFER_ESCROW = TRUE`

`PAYMENT_SERVICES_ACT_SELF_DEBT_PAYMENT_LOW_RISK_INFERENCE = TRUE_UNDER_CURRENT_OWN_COMMISSION_OBLIGATION`

### O-9. Privacy / attribution tracking

PPC guidance treats web browsing history and, generally, cookie/device identifiers as personal-related information unless they already qualify as personal information.

Affiliate attribution therefore requires a privacy-safe server-side evidence model, purpose disclosure, retention policy, access control and lawful handling of any third-party data transfer.

`AFFILIATE_ATTRIBUTION_PRIVACY_COMPLIANCE = REQUIRED`

### O-10. Commercial precedents: use correctly

A8.net currently operates a mature Japanese affiliate model with:

- outcome generation -> advertiser approval -> confirmed commission;
- payment thresholds/carry-over;
- Creator/media-borne bank transfer fees;
- a dashboard and payout process.

But A8's current terms also define outcome compensation as consideration for advertising distribution and impose media obligations such as ad distribution and inducing user actions.

Therefore:

`A8_PRECEDENT_SUPPORTS_COMMERCIAL_FEASIBILITY = TRUE`

`A8_PRECEDENT_PROVES_FREELANCE_ACT_EXCLUSION = FALSE`

`A8_PRECEDENT_PROVES_M55_FEE_DEDUCTION_LEGALITY = FALSE`

The same rule applies to every competitor: **precedent informs design; current-operator facts plus Rev4 Operating Model control M55's current operating branch.** Regulator/counsel review is optional risk reduction, not a launch token.

### O-11. Revised legal status matrix

| Area | Current M55 status | Required action |
|---|---|---|
| Freelance Act | **CURRENT BRANCH FROZEN** — individual / no employees / not `特定業務委託事業者`; Article-3-ready disclosure still required if covered delegation | professional preclearance **NOT REQUIRED**; re-review on employee/entity/relationship/law change |
| Labor / employment | **LOW RISK BY DESIGN** | preserve no control/quotas/hours; re-review if operations change |
| 景品表示法 / stealth marketing | **APPLIES TO M55 ADVERTISER RESPONSIBILITY WHEN CONDITIONS MET** | disclosure + claims controls + monitoring |
| MLM / chain-sales | **LOW RISK BY DESIGN** | never add entry fee/required purchase/recruitment commission without re-review |
| Business-opportunity sales | **LOW RISK BY DESIGN** | no special financial burden as condition of earning |
| Creator income tax | **APPLIES** | Creator-facing tax notice; Creator remains responsible for own filing |
| M55 source withholding | **CURRENT BRANCH FROZEN** — ordinary JP-resident URL-only Affiliate `DEFAULT_WITHHOLDING_RATE = 0` under no-salary-payer facts | fail-closed reclassification if payment character / nonresident / salary-payer facts change; no universal percentage |
| Consumption tax / invoice | **APPLIES BY FACTS/STATUS** | tax profile + invoice verification + effective-dated policy; not an external-professional approval token |
| Payment Services Act | **LOW RISK INFERENCE UNDER OWN-DEBT + STRIPE RAIL** | no third-party remittance/escrow; no launch-blocking professional review token |
| APPI / cookies | **APPLIES TO ATTRIBUTION DATA AS RELEVANT** | disclosure, minimization, retention and data-transfer controls |

This matrix is the current operating-branch position. Optional professional review is risk reduction only. Re-review on a real operator/law invalidator.

---

## P. Commercial / legal / tax evidence freeze — 2026-09-09

### P-1. Commission contract firewall

`COMMISSION_RATE_IS_GROSS_COMMERCIAL_RATE = TRUE`

Define:

```
GROSS_CREATOR_COMMISSION
  = COMMISSIONABLE_REVENUE
  × applicable frozen Creator commission rate
```

This is the Creator's commercial commission before any payer-side statutory withholding that is actually required.

`NET_OF_TAX_COMMISSION_GUARANTEE = PROHIBITED`

NTA guidance shows that when a source-withholding payment is contracted as a **net take-home amount**, the payer must gross up the payment amount to compute withholding. M55 therefore must not contract 50% / 40% / 30% as an after-tax/net-of-withholding guarantee.

Creator-facing payout display / settlement equation:

```text
Gross Payable Commission
- Payout Processing Fee
= Net Payout
```

The Payout Processing Fee is charged at payout-settlement level, not per referral/sale.

The standard Creator payout-processing fee is frozen by the Rev4 Operating Model.

Launch formula:
- base = JPY 770 at JPY 20,000 SETTLEMENT_PAYABLE
- + integer-safe 55 bps on the amount above JPY 20,000
- rounded up to JPY 10
- forced-tail effective fee = MIN(standard fee, FLOOR(SETTLEMENT_PAYABLE_JPY * 0.25))

Statutory withholding, if actually required on a reclassified branch, is a separate payout/tax layer and does not redefine the commercial rate.

Production use remains gated by runtime implementation, actual Stripe account pricing/tax-invoice verification, and the applicable M55 accounting configuration.

`STATUTORY_WITHHOLDING_DOES_NOT_REDEFINE_COMMISSION_RATE = TRUE`

`NO_SILENT_CREATOR_DEDUCTION = TRUE`

### P-2. Creator income tax vs M55 payer duties

NTA's current filing guidance expressly lists affiliate income among income generally requiring filing as business income or miscellaneous income (business), depending on facts.

That is the Creator's own tax filing layer.

Separately, M55 has a payer-side withholding obligation **only if** the exact payment is legally within a source-withholding category. Current NTA materials list specific categories including `外交員等`, but the official research did not locate a categorical rule that ordinary web affiliate commission is always inside or always outside that category.

Therefore, for the **current** no-salary-payer Japan-resident ordinary URL-only Affiliate branch:

```text
DEFAULT_WITHHOLDING_RATE = 0
AFFILIATE_SOURCE_WITHHOLDING_CLASSIFICATION = NOT_REQUIRED_TO_DETERMINE_CURRENT_M55_PAYER_OBLIGATION
UNIVERSAL_WITHHOLDING_RATE = PROHIBITED
UNKNOWN_TAX_CLASSIFICATION_MUST_FAIL_CLOSED_BEFORE_LIVE_PAYOUT = TRUE
```

If a **different** payment is later classified as `外交員等` or another specifically withheld category, current NTA guidance uses a category-specific calculation with a monthly ¥120,000 deduction rule rather than a universal flat 10.21% on the whole amount. Do not generalize that formula to ordinary Affiliate v1. Nonresident cash payout remains blocked.

### P-3. Tax readiness as an orthogonal control

Minimum tax-readiness values for implementation planning:

- `TAX_PROFILE_UNVERIFIED`
- `TAX_CLASSIFICATION_PENDING`
- `TAX_READY`
- `TAX_REVIEW_REQUIRED`

Tax readiness does not change whether a valid commission is economically earned.

A valid `COMMISSION_PAYABLE` may coexist with tax payout not-ready status. No live transfer/payout may proceed while tax treatment required for that payment is unknown.

Non-Japan tax residency must enter `TAX_REVIEW_REQUIRED` before payout until the applicable domestic-source/treaty classification is implemented.

### P-4. Consumption tax / invoice firewall

Creator consumption-tax status must not be inferred from M55 payouts alone.

Current NTA rules include:

- base-period taxable-sales tests around ¥10 million;
- specified-period rules;
- invoice-registered businesses being taxable even when the base-period threshold is not exceeded.

For M55:

`CREATOR_INVOICE_STATUS_REQUIRED_FOR_ACCOUNTING = TRUE`

`M55_ONLY_PAYOUT_VOLUME_IS_NOT_TAX_STATUS_AUTHORITY = TRUE`

`NO_RETROACTIVE_COMMISSION_RATE_REDUCTION_FOR_INVOICE_STATUS = TRUE`

Invoice registration may affect M55's own input-tax-credit economics; it is not a reason to silently rewrite a commission that was already earned under the governing rate schedule.

Current 2026 reform evidence for purchases from non-invoice issuers is effective-dated: 70% from 2026-10 for two years, 50% from 2028-10 for two years, 30% from 2030-10 for one year, then 0% from 2031-10, subject to current statutory conditions/limits. Do not hard-code these as timeless business constants.

### P-5. Self-billing / payout statement candidate

NTA permits a purchaser-created `仕入明細書` / similar statement to count among invoice-preservation documents when required fields are present and the counterparty confirms the contents.

Accepted confirmation examples include electronic confirmation and, under an agreed framework, deemed confirmation after a defined period with no correction notice.

Therefore R8 may evaluate:

`CREATOR_SELF_BILLING_STATEMENT = PREFERRED_CANDIDATE_NOT_YET_IMPLEMENTED`

Target: M55 generates a monthly Creator payout/accounting statement from the immutable commission ledger, tax profile, invoice registration status, and payout batch; the Creator can confirm/correct it electronically.

This is an operational candidate, not a claim that every Creator/payment automatically creates an input-tax-credit entitlement.

### P-6. Customer sales / Specified Commercial Transactions Act safety

M55 customer sale safety and Creator payout safety are separate layers.

For M55 online paid reports, current CAA guidance requires communication-sale disclosures including applicable items such as:

- selling price / service consideration; if M55 collects consumption tax, displayed price means tax-inclusive price;
- other customer-borne charges if any;
- payment timing and method;
- product delivery / service provision timing;
- application period or special sales conditions when applicable;
- cancellation / withdrawal / refund terms;
- seller/business identity, address, phone, and responsible representative/operator information as required.

Internet final-confirmation screens must allow the customer to clearly review the required transaction information, and the customer must be able to confirm/correct the application contents.

`REVENUE_SAFETY_TOKUSHOHO_DISPLAY_REQUIRED = TRUE`

`FINAL_CONFIRMATION_SCREEN_COMMERCIAL_TERMS_REQUIRED = TRUE`

`REFUND_CANCELLATION_TERMS_MUST_BE_EXPLICIT = TRUE`

Do not market mail-order purchases as having a blanket statutory cooling-off right. Do not use the absence of a general mail-order cooling-off rule to override any mandatory law or M55's published refund terms.

### P-7. Affiliate / influencer advertising disclosure

CAA stealth-marketing guidance identifies the advertiser as the regulated party when it is involved in determining a display, while influencers/affiliates acting for the advertiser are generally not themselves the regulated advertiser.

CAA also states that affiliate disclosures must be clear from the overall display; a small or inconspicuous notice can be insufficient, and video disclosure only at the beginning can be insufficient depending on the presentation.

M55 policy:

`M55_AFFILIATE_PROMOTION_DISCLOSURE_REQUIRED = TRUE`

Whenever a Creator chooses to publish promotional content containing an M55 affiliate relationship/link, M55 requires a clear, conspicuous advertising/affiliate disclosure appropriate to the medium.

This is a compliance condition, not a posting quota or commissioned deliverable.

### P-8. Payout fee under current operating branch

Stripe currently bills the M55 platform under the planned platform-managed configuration.

The Creator-facing standard payout-processing fee is a separate disclosed M55 service consideration with contractual payout setoff under the current no-employee operating branch. Exact Rev4 integer formula and forced-tail cap are operating-model authority.

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION` as a pending-legal-classification hold is **SUPERSEDED** for the current branch.

Re-review if M55 becomes a `特定業務委託事業者`, hires employees, changes entity form, or commissions a Sponsored Creator work order.

### P-9. Evidence maintenance

Money/tax/commercial implementation must retain:

- source/evidence date;
- policy effective date;
- `rate_schedule_version`;
- `calculation_version`;
- `withholding_policy_version`;
- `consumption_tax_policy_version`;
- Creator entity/residency/invoice snapshot used;
- gross commission;
- adjustments;
- withholding amount and classification if any;
- lawful fee if any;
- net payout;
- provider transfer/payout IDs;
- accounting/self-billing statement reference.

`MONEY_DECISION_SOURCE_TRACEABILITY = REQUIRED`

## Q. Payer tax-compliance operational firewall (Control-Tower third audit 2026-09-09)

`WITHHOLDING_REMITTANCE_OBLIGATION = CLASSIFICATION_DEPENDENT`

`PAYER_INFORMATION_RETURN_OBLIGATION = CLASSIFICATION_DEPENDENT`

`MY_NUMBER_COLLECTION_BEFORE_REQUIREMENT_CONFIRMED = PROHIBITED`

`MY_NUMBER_IN_CREATOR_VISIBLE_STATEMENT = PROHIBITED`

`STATUTORY_WITHHOLDING_IS_NOT_COMMISSION_ADJUSTMENT = TRUE`

If final tax classification creates payer-side withholding, M55 must implement the corresponding remittance calendar/accounting and any statutory payment-report workflow before that payment path becomes live.

If the resulting statutory-report workflow requires My Number:

`SEPARATE_RESTRICTED_TAX_ID_VAULT_REQUIRED = TRUE`

No ordinary Creator profile, analytics property, Stripe metadata, application log, or Creator-visible payout statement may become a My Number storage channel.

These controls are conditional architecture only. They do not classify ordinary M55 Affiliate commission as `外交員等`.

## R. Late-classification tax correction firewall (Codex independent review 2026-09-09)

Codex independent review of PR #187 identified one nonblocking P2: late discovery that a past payout required withholding was not explicitly separated from ordinary commission correction.

Freeze:

`LATE_DISCOVERED_WITHHOLDING_CORRECTION_REQUIRES_SEPARATE_TAX_EVENT = TRUE`

`ORIGINAL_COMMISSION_AND_PAYOUT_HISTORY_REMAINS_IMMUTABLE = TRUE`

`AUTOMATIC_CREATOR_CLAWBACK_FOR_LATE_WITHHOLDING = PROHIBITED_WITHOUT_EXPLICIT_LEGAL_CONTRACT_AUTHORITY`

`AUTOMATIC_FUTURE_COMMISSION_OFFSET_FOR_LATE_WITHHOLDING = PROHIBITED_WITHOUT_EXPLICIT_LEGAL_CONTRACT_AUTHORITY`

`PAST_PAYOUT_POSTED_DOES_NOT_CLOSE_LATE_TAX_REMITTANCE_LIABILITY = TRUE`

`STATUTORY_REPORT_CORRECTION_STATUS_MUST_BE_OBSERVABLE_IF_APPLICABLE = TRUE`

This contract is deliberately conservative:

- it preserves the commercial commission and original payout history;
- it treats payer tax/remittance correction as a distinct M55 liability/workflow;
- it does not assume M55 has a legal right to recover tax from the Creator;
- it does not assume M55 lacks such a right in every future fact pattern;
- the exact recovery treatment, if any, must be supported by the then-applicable law/contract and explicitly Human-approved before runtime.

Owning implementation gate: R8 `PAYOUT_AND_SETTLEMENT`.

## S. M55 sole-proprietor payer facts / current legal-tax closure candidate — Human-approved 2026-09-10

### S-1. Human-frozen payer facts

`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

`M55_BUILD_MODEL = SOLO_BUILD`

`M55_EMPLOYEES = NONE`

`M55_PAYS_SALARY_OR_WAGES = FALSE`

`M55_IS_SALARY_PAYER_FOR_WITHHOLDING = FALSE`

These facts are current M55 operating authority. Generic references to "company", "corporation", or "platform company" do not override them.

### S-2. Freelance Act branch under current facts

Current JFTC Q2/Q3/Q9 and the official applicability chart establish:

- an individual ordering business using employees can be a `特定業務委託事業者`;
- an individual ordering business not using employees is not in that specified-orderer category;
- if the transaction is otherwise covered, an ordering business without employees still gives the Article 3 transaction-condition notice;
- the current JFTC definition of "uses employees" generally requires a worker scheduled for at least 20 hours/week and expected to be employed for at least 31 days.

M55 currently uses **no employees**.

Therefore:

`FREELANCE_ACT_M55_ORDERER_ROLE_IF_AFFILIATE_IS_COVERED_DELEGATION = 業務委託事業者_NOT_特定業務委託事業者_CURRENT_FACTS`

`FREELANCE_ACT_ARTICLE_3_TRANSACTION_TERMS_DISCLOSURE = REQUIRED_IF_AFFILIATE_IS_COVERED_業務委託`

`JAPAN_LEGAL_60_DAY_PAYMENT_COMPATIBILITY = NOT_A_CURRENT_M55_REQUIREMENT_IF_AFFILIATE_IS_COVERED_DELEGATION`

M55 should nevertheless use clear written/electronic Program Truth/Creator Terms with compensation calculation, payment timing, refund/reversal treatment, dispute path, and policy versions. This is both a conservative Article 3-compatible design and Creator trust requirement.

The exact Affiliate-first `業務委託` characterization may remain a legal taxonomy question, but it is no longer a blocker for the 60-day payment-deadline architecture under the current no-employee payer facts.

### S-3. Source withholding branch under current facts

NTA No.2793 states that where the remuneration payer is an individual and is not a payer of salaries, source withholding is generally not required, except specified cases such as hostess remuneration. NTA expressly notes that salary payments include blue-return family-employee salary (`青色専従者給与`).

M55 currently pays **no salary or wages**.

Therefore:

`NTA_SOURCE_WITHHOLDING_M55_CURRENT_PAYER_FACT_PATTERN = CLOSED_NO_WITHHOLDING_REQUIRED_FOR_JP_RESIDENT_ORDINARY_AFFILIATE_PAYMENT`

`AFFILIATE_SOURCE_WITHHOLDING_SALES_AGENT_CLASSIFICATION = NOT_REQUIRED_TO_DETERMINE_CURRENT_M55_PAYER_OBLIGATION`

`NO_UNIVERSAL_WITHHOLDING_RATE = STILL_PROHIBITED`

Do not translate this into a timeless statement that "affiliate commission is never subject to withholding." It is a **payer-fact exception for the current Japan-resident ordinary Affiliate payout branch**. Nonresident/foreign-recipient payouts remain separately blocked pending tax/treaty classification. If M55 becomes a salary payer, the payment-category analysis reopens before the next live payout.

### S-4. Fee policy

Because M55 is not currently a `特定業務委託事業者`, the Freelance Act Article 5 reduction prohibition / Q78 bank-transfer-fee example is not the current M55 payer branch.

The standard payout-processing fee is frozen by Rev4 as a separate disclosed M55 service consideration with contractual payout setoff. Exact integer formula, one-fee-per-instruction, retry inheritance, and forced-tail 25% cap are operating-model authority.

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION = AUTHORIZED_UNDER_CURRENT_OPERATING_BRANCH_AS_DISCLOSED_M55_SERVICE_SETOFF`

Future re-review remains required if employee/entity/relationship/law facts change.

### S-5. Closure status

`R2_B2_JAPAN_LEGAL_PAYMENT_DEADLINE = FROZEN_FOR_PRESENT_OPERATOR_FACTS`

`R2_B2_JAPAN_SOURCE_WITHHOLDING = FROZEN_FOR_PRESENT_OPERATOR_FACTS`

`R2_B2_PHONE_CONSULTATION = NOT_REQUIRED`

`PROFESSIONAL_PRECLEARANCE = NOT_REQUIRED`

PR **#189 is MERGED**. Do not treat it as pending independent review. Current operator legal/tax design is frozen for present facts. External professional/JFTC/NTA preclearance is not required. Actual tax/admin facts and Stripe account pricing/tax invoice are activation evidence inputs, not business-design blockers. R2 remains ACTIVE until repo/Terms/reconciliation closure under existing executable authority.

### S-6. Hard invalidators

`M55_EMPLOYEE_STATUS_CHANGE_REOPENS_FREELANCE_ACT_BRANCH = TRUE`

`M55_SALARY_PAYER_STATUS_CHANGE_REOPENS_WITHHOLDING_BRANCH = TRUE`

`M55_ENTITY_FORM_CHANGE_REOPENS_PAYER_FORM_ANALYSIS = TRUE`

`SPONSORED_CREATOR_RELATIONSHIP_REQUIRES_SEPARATE_CLASSIFICATION = TRUE`

## T. Pre-revenue / operator-status dependency — Human-approved 2026-09-10

Normative operating-fact authority: `docs/ssot/M55_OPERATOR_BUSINESS_STATUS_SSOT.md`.

Current M55 business state:
`PRE_REVENUE_ZERO_BUSINESS_REVENUE`.

This does **not** remove:
- bookkeeping/electronic-transaction retention;
- Tokushoho duties on paid-sale surfaces;
- APPI duties when personal data is used for business;
- Stripe/KYC identity accuracy.

It does affect:
- current consumption-tax/base-period analysis;
- source-withholding payer branch;
- employee/employer obligations;
- loss/evidence preservation.

Unknown administrative records (opening date, opening notification, blue-return status, M55 invoice/consumption-tax status) are tracked in the operator SSOT and must not be invented here.
