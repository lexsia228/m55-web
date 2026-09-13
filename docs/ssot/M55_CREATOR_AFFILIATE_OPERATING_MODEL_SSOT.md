# M55 Creator Affiliate Operating Model SSOT

**Canonical repo path:** `docs/ssot/M55_CREATOR_AFFILIATE_OPERATING_MODEL_SSOT.md`  
**Semantic source:** Human-frozen Rev4 FINAL (`M55-CREATOR-AFFILIATE-OPERATING-SSOT-REV4-FINAL-2026-09-13`)  
**SHA-256:** `42469924da5bccd0282032711da3d9d435fc6b4e983276060fb7d14524d3b5ad`  
**bytes:** `59368` · **lines:** `2298`  
**Repo integration date:** `2026-09-13`

```text
REPO_CANONICAL_INTEGRATION = PENDING
RUNTIME_IMPLEMENTATION = PENDING
PRODUCTION_CASH_ACTIVATION = FALSE
```

This file is the current Human-frozen semantic authority for the Creator Affiliate operating-model delta. The frozen Rev4 body below is preserved exactly.

Repo-local hierarchy (does **not** weaken or reopen Rev4):

- Sole executable CURRENT/NEXT remains `docs/ssot/M55_EXECUTION_STATE.json`. This docs-only gate does **not** advance CURRENT/NEXT.
- Current operator facts remain owned by `docs/ssot/M55_OPERATOR_BUSINESS_STATUS_SSOT.md`.
- Parent Creator Revenue program/roadmap authority: `docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md`.
- Supporting/implementation authorities reconciled to this operating-model delta: `docs/ssot/M55_CREATOR_AFFILIATE_STRIPE_TAX_LEGAL_SSOT.md`, `docs/ssot/M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md`, `docs/ssot/M55_CREATOR_AFFILIATE_BENCHMARK_TARGET_ARCHITECTURE_SSOT.md`.

Canonical persisted commission/payout **state vocabulary** remains the existing repo authority. Rev4 prose shorthand is mapped, not renamed:

```text
COMMISSION_PENDING_REVIEW (Rev4 prose) -> COMMISSION_PENDING_COMPLIANCE_REVIEW
COMMISSION_HOLD
COMMISSION_PAYABLE
COMMISSION_REVERSED
COMMISSION_ADJUSTED
PAYOUT_NOT_READY / PAYOUT_BLOCKED_* / PAYOUT_QUEUED / PAYOUT_PROCESSING / PAYOUT_POSTED / PAYOUT_FAILED / PAYOUT_RETURNED
```

Do not persist new synonyms merely to mirror Rev4 narrative wording.

---

# M55 Creator Affiliate Operating SSOT — Revision 4 FINAL

**Document ID:** `M55-CREATOR-AFFILIATE-OPERATING-SSOT-REV4-FINAL-2026-09-13`  
**Status:** `HUMAN_FROZEN / MUTUAL_AUDIT_GREEN / REPO_INTEGRATION_PENDING / PRODUCTION_CASH_NOT_YET_ACTIVE`  
**Decision date:** `2026-09-13`  
**Operator basis:** `CURRENT_M55_ACTUAL_STATE`  
**Primary objective:** `MAXIMIZE_M55_LONG_TERM_PROFIT_WITHIN_APPLICABLE_LAW_STRIPE_RULES_AND_CONTRACT`

---

## 0. Purpose

This is the commercial operating SSOT for M55 Creator Affiliate v1.

It is intentionally based on M55's **current actual operator state**, not hypothetical future company states.

Previously closed business decisions must not be reopened without a real invalidator.

This SSOT supersedes prior Creator Affiliate chat/work candidates where they conflict with this document.

---

## 1. CURRENT M55 OPERATOR FACTS — AUTHORITY

The operating model is frozen against the following current facts:

```text
M55_OPERATOR_COUNTRY = JAPAN
M55_OPERATOR_FORM = SOLE_PROPRIETOR
M55_EMPLOYEE_COUNT = 0
M55_USES_EMPLOYEES = FALSE
M55_SALARY_OR_WAGE_PAYMENTS = FALSE
M55_IS_SALARY_PAYER = FALSE

M55_PRODUCT_MODEL = DIRECT_TO_CONSUMER_DIGITAL_WEB_APP
M55_PRODUCT_PAYMENT_MODEL = ONE_TIME_PURCHASE

M55_PUBLIC_PRODUCT_FAMILY =
  M55_PREMIUM_REPORT_LIGHT
  M55_PREMIUM_REPORT_FULL
  ADDITIONAL_INTERPRETATION_WHERE_APPLICABLE

# Public availability is not Affiliate eligibility.
# Affiliate v1 eligibility is controlled only by §16A.
AFFILIATE_PRODUCT_ELIGIBILITY_AUTHORITY = ELIGIBLE_PRODUCT_POLICY_VERSION

CREATOR_PROGRAM_V1 = AFFILIATE_FIRST
CREATOR_PROGRAM_MODEL = URL_ONLY_VOLUNTARY_REFERRAL
```

These facts are not re-litigated during normal Creator implementation.

They change only if Human reports an actual operator-state change.

---

## 2. CURRENT JAPAN LEGAL OPERATING BRANCH

For the present M55 facts:

```text
M55_IS_SPECIFIED_COMMISSIONING_BUSINESS_OPERATOR_UNDER_FREELANCE_ACT = FALSE
```

Reason:

```text
M55 = individual business operator
M55 uses no employees
```

Therefore the Freelance Act obligations that depend on being a `特定業務委託事業者` are not treated as M55's current operating branch.

If the URL-only Affiliate relationship is classified as `業務委託`, M55 nevertheless uses an Article-3-ready electronic disclosure model from launch.

```text
FREELANCE_ACT_ART3_READY_DISCLOSURE = REQUIRED
ART5_REDUCTION_PROHIBITION_BRANCH_CURRENTLY_ACTIVE = FALSE
```

Initial electronic notice/Terms disclose at least:

```text
M55/operator identity
Creator identity
program participation/commissioning date
affiliate service scope
eligible referral definition
commission formula and rate schedule
commissionable-revenue definition
payment-success rate timestamp rule
attribution rule
review/hold rule
payout threshold
payout schedule and exact-date calculation rule
payout processing fee formula
refund/dispute/clawback treatment
prohibited conduct
termination/deactivation effects
tax treatment
appeal/contact method
```

Where an Article-3 item cannot be determined at the initial notice because the future sale/commission does not yet exist:

```text
ART3_UNDETERMINED_ITEM_RULE =
  disclose why the item is not yet determinable
  + when/how it will become determinable
  + immediately issue a linked supplemental electronic notice when determined
```

When a commission becomes PAYABLE or a payout instruction is locked, M55 issues a linked electronic record showing the exact applicable commission amount and exact payout due date for that settlement.

No mandatory posting, delivery date, work quota, exclusivity, or commissioned content is created by Creator Program v1.

---

## 3. NO PROFESSIONAL PRECLEARANCE GATE

Normal launch does not require prior permission or approval from JFTC, NTA, a lawyer, accountant, tax accountant, or other licensed professional.

```text
JFTC_PRECLEARANCE_REQUIRED = FALSE
NTA_PRECLEARANCE_REQUIRED = FALSE
LEGAL_COUNSEL_PRECLEARANCE_REQUIRED = FALSE
TAX_ACCOUNTANT_PRECLEARANCE_REQUIRED = FALSE

OPTIONAL_PROFESSIONAL_REVIEW = RISK_REDUCTION_ONLY
```

Escalation is allowed only when a genuinely new or ambiguous fact arises.

The following are not reasons to stop launch by themselves:

```text
"affiliate may possibly be business outsourcing"
"Creator may be a side-business worker"
"M55 is a sole proprietor"
"commission rate is 50%"
"Creator pays a disclosed payout processing fee"
```

---

## 4. PROGRAM MODEL

```text
CREATOR_PROGRAM_V1 = AFFILIATE_FIRST
CREATOR_PROGRAM_MODEL = URL_ONLY_VOLUNTARY_REFERRAL

MANDATORY_POSTING = FALSE
MANDATORY_DELIVERABLE = FALSE
MANDATORY_CONTENT_CREATION = FALSE
POSTING_QUOTA = FALSE
EXCLUSIVITY = FALSE

CREATOR_JOINING_FEE = FALSE
CREATOR_REQUIRED_PURCHASE = FALSE
CREATOR_INVENTORY_REQUIREMENT = FALSE

CREATOR_RECRUITMENT_COMMISSION = PROHIBITED
MULTI_LEVEL_COMMISSION = PROHIBITED
UPLINE_DOWNLINE = PROHIBITED

ONLY_ELIGIBLE_PAID_CUSTOMER_REVENUE_CREATES_CASH_COMMISSION = TRUE
FREE_USAGE_CREATES_CASH_COMMISSION = FALSE
```

Creator activity is voluntary promotion through an issued referral URL.

Creator is not:

```text
M55 employee
M55 agent with contracting authority
M55 customer-support representative
M55 medical/psychological professional
M55 legal representative
```

---

## 5. FOUNDING COHORT

```text
FOUNDING_CREATOR_COHORT_TARGET = 20
FOUNDING_CREATOR_APPROVAL = HUMAN_APPROVAL
```

Founding status does not override fraud, disclosure, KYC, tax-profile, or payout-readiness requirements.

---

## 6. COMMISSION RATE SCHEDULE

```text
FOUNDING_COMMISSION_RATE = 50%
FOUNDING_RATE_DURATION_DAYS = 180

TRANSITION_COMMISSION_RATE = 40%
TRANSITION_END_DAY = 365

STANDARD_COMMISSION_RATE = 30%
STANDARD_COMMISSION_START_DAY = 365
```

Exact half-open boundaries:

```text
50%:
FIRST_FINAL_CREATOR_APPROVED_AT
<= ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT
< FIRST_FINAL_CREATOR_APPROVED_AT + 180 days

40%:
FIRST_FINAL_CREATOR_APPROVED_AT + 180 days
<= ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT
< FIRST_FINAL_CREATOR_APPROVED_AT + 365 days

30%:
ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT
>= FIRST_FINAL_CREATOR_APPROVED_AT + 365 days
```

Rate authority:

```text
COMMISSION_RATE_EFFECTIVE_AT =
  ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT
```

The click date, checkout-start date, commission-processing date, statement date, or payout date must never determine the applicable rate.

Financial timestamps are authoritative UTC/absolute `TIMESTAMPTZ` instants. UI may display JST.

---

## 7. FOUNDING 50% REPLAY PROTECTION

The 50% founding period is available only once per Creator economic identity.

```text
FOUNDING_RATE_IDENTITY_SCOPE =
  ONCE_PER_CREATOR_ECONOMIC_IDENTITY

FOUNDING_RATE_RESET_ON_REAPPLICATION = FALSE
FOUNDING_RATE_RESET_ON_ACCOUNT_RECREATION = FALSE
FOUNDING_RATE_RESET_ON_NEW_EMAIL = FALSE
FOUNDING_RATE_RESET_ON_SOCIAL_HANDLE_CHANGE = FALSE
FOUNDING_RATE_RESET_ON_REFERRAL_TOKEN_CHANGE = FALSE
FOUNDING_RATE_RESET_ON_STRIPE_ACCOUNT_CHANGE = FALSE
FOUNDING_RATE_RESET_ON_DEACTIVATION = FALSE
FOUNDING_RATE_RESET_ON_REACTIVATION = FALSE

REJOIN_RATE =
  CONTINUE_ORIGINAL_CREATOR_RATE_EPOCH
```

Identity determination must not rely solely on IP address, email, cookie, or device.

Target identity model:

```text
creator_economic_identity_id
first_final_creator_approved_at
creator_membership_history
provider_account_history
tax_profile_history
terms_acceptance_history
dedupe_review_status
```

Stripe/KYC data may be used only to the extent actually exposed and lawfully usable by M55.

---

## 8. CREATOR ONBOARDING

Canonical onboarding:

```text
APPLICATION
→ CONDITIONAL_APPROVAL
→ CREATOR_TERMS_ACCEPTED
→ TAX_PROFILE_READY
→ STRIPE_HOSTED_ONBOARDING
→ PROVIDER_PAYOUT_READINESS_GREEN
→ IDENTITY_DEDUPLICATION_GREEN
→ FINAL_CREATOR_APPROVAL
→ REFERRAL_URL_ACTIVE
```

Founding clock begins at:

```text
FIRST_FINAL_CREATOR_APPROVED_AT
```

It does not start on application, account registration, or Stripe onboarding.

---

## 9. CREATOR TAX PROFILE — V1

Minimum data:

```text
tax_residency
payee_type
invoice_registration_status
invoice_registration_number_if_any
withholding_classification
tax_profile_effective_at
```

Launch scope:

```text
CREATOR_MINIMUM_AGE_YEARS = 18
V1_CASH_CREATOR_RESIDENCY = JAPAN_RESIDENT_ONLY
V1_PAYOUT_CURRENCY = JPY_ONLY
V1_PAYOUT_BANK_COUNTRY = JAPAN
NON_RESIDENT_CREATOR_CASH_PAYOUT = BLOCKED
MY_NUMBER_COLLECTION_V1 = OFF
```

My Number is not collected merely because someone is an ordinary v1 Affiliate. A separate statutory payment/withholding branch must explicitly authorize any future collection.

Nonresident support is a later tax-classification lane and does not block domestic launch.

---

## 10. CURRENT WITHHOLDING RULE

For the current M55 operator state:

```text
M55_IS_SALARY_PAYER = FALSE
```

For ordinary Japanese-resident URL-only Affiliate commission:

```text
DEFAULT_WITHHOLDING_RATE = 0
```

This rule is effective only for the ordinary Affiliate lane.

It must be reclassified if the payment itself changes character, including:

```text
salary/employment
sponsored article writing
model/performance work
speaker/appearance fee
other specifically source-withheld remuneration
nonresident payment
```

The Creator's personal income-tax filing remains the Creator's responsibility.

M55 does not assume whether a Creator filed a business-opening notification or tax return.

---

## 11. COMMISSIONABLE REVENUE


The commission percentage applies to a deterministic commission base. The launch formula must not double-subtract discounts, refunds, or chargebacks.

At the original eligible payment-success event:

```text
gross_customer_paid_jpy =
  ACTUAL_CUSTOMER_AMOUNT_COLLECTED_AFTER_DISCOUNTS
```

Therefore:

```text
DO_NOT_SUBTRACT_DISCOUNTS_AGAIN = TRUE
```

Initial commission base:

```text
commissionable_revenue_at_accrual_jpy =
  gross_customer_paid_jpy
  - commission_base_tax_exclusion_jpy
  - immediately_ineligible_amount_jpy
```

Refunds, chargebacks, and later reversals are **not** subtracted a second time from the original payment snapshot. They create later append-only recalculation/adjustment events against the remaining eligible revenue.

```text
REFUND_HANDLING = APPEND_ONLY_RECOMPUTE_DIFFERENCE
CHARGEBACK_HANDLING = APPEND_ONLY_RECOMPUTE_DIFFERENCE
```

Creator-facing wording must make clear that the rate applies to M55-defined eligible commissionable revenue, not blindly to the tax-inclusive customer sticker price.

M55 may additionally display per-SKU expected commission amounts.

---

## 12. JPY ROUNDING — FROZEN


All Creator financial ledger values are stored as integer JPY.

The tax/base exclusion is versioned per purchase.

Preferred authority:

```text
if authoritative_purchase_tax_amount_jpy exists:
    commission_base_tax_exclusion_jpy =
      authoritative_purchase_tax_amount_jpy
else:
    commission_base_tax_exclusion_jpy =
      FLOOR(
        gross_customer_paid_jpy
        * tax_rate_bps
        / (10_000 + tax_rate_bps)
      )
```

For the current 10% reference rate:

```text
tax_rate_bps = 1000
```

The fallback calculation is a commission-base calculation and must not be represented as proof of the amount M55 ultimately remits as consumption tax.

Commission:

```text
gross_commission_jpy =
  FLOOR(
    commissionable_revenue_at_accrual_jpy
    * commission_rate_basis_points
    / 10_000
  )
```

No fractional yen is carried into payout.

Partial refund / partial dispute:

```text
remaining_eligible_commissionable_jpy =
  recomputed eligible commissionable revenue after the partial reversal

remaining_commission_entitlement_jpy =
  FLOOR(
    remaining_eligible_commissionable_jpy
    * original_commission_rate_basis_points
    / 10_000
  )

adjustment_jpy =
  remaining_commission_entitlement_jpy
  - original_net_commission_entitlement_jpy
```

The difference is posted as an append-only adjustment.

A full refund or fully lost dispute must reverse the exact remaining commission entitlement attributable to that purchase.

---

## 13. COMMISSION CONSUMPTION-TAX CONTRACT

Creator-facing commission amounts are contractual total consideration.

```text
CREATOR_COMMISSION_QUOTED_AMOUNT =
  TAX_INCLUSIVE_TOTAL_CONTRACTUAL_CONSIDERATION

AUTOMATIC_PLUS_10_PERCENT_CLAIM =
  PROHIBITED
```

Creator registration under the invoice system does not automatically increase M55's contractual commission amount.

Invoice-registration status affects accounting/input-tax-credit treatment, not the agreed payout amount.

M55 statement/UI/Terms must use consistent wording.

---

## 14. ATTRIBUTION

```text
ATTRIBUTION_WINDOW_DAYS = 30
ATTRIBUTION_METHOD = LAST_QUALIFIED_DIRECT_CREATOR_TOUCH
MAX_CREATORS_PER_PURCHASE = 1
RETROACTIVE_ATTRIBUTION = PROHIBITED
```

Exact eligibility boundary:

```text
qualified_touch_at
<= attribution_locked_at
< qualified_touch_at + INTERVAL '30 days'
```

At lock time, choose the latest qualified direct touch. If timestamps are exactly equal, use a deterministic immutable tie-break key.

Flow:

```text
Creator referral URL
→ opaque referral token
→ server-side resolution
→ durable qualified touchpoint
→ Creator candidate
→ checkout-time revalidation
→ immutable purchase attribution snapshot
→ eligible payment succeeds
→ commission calculation snapshot
```

The attribution lock belongs to the specific checkout/purchase attempt and has an explicit expiry:

```text
ATTRIBUTION_LOCK_EXPIRES_AT =
  checkout/session expiry for that purchase attempt
```

An expired checkout/retry creates a new purchase attempt and must revalidate attribution. A stale lock cannot be reused indefinitely.

Stripe metadata is correlation-only. It is never the financial/attribution authority.

Attribution lock is immutable except for a documented correction event caused by objective system error.

---

## 15. EXISTING CUSTOMER AND UPGRADE RULES


```text
PRE_EXISTING_PAID_PURCHASE_RETROACTIVE_COMMISSION = PROHIBITED
```

Existing free user:

```text
COMMISSIONABLE_IF_CREATOR_CAUSES_FIRST_ELIGIBLE_PAID_CONVERSION = TRUE
```

Upgrade:

```text
UPGRADE_COMMISSION =
  ELIGIBLE_INCREMENTAL_REVENUE_ONLY
```

Upgrade calculation uses the **actual incremental amount collected for the upgrade transaction**, not a guessed catalogue-price difference.

```text
upgrade_gross_customer_paid_jpy =
  ACTUAL_INCREMENTAL_UPGRADE_PAYMENT_COLLECTED

upgrade_tax_exclusion_jpy =
  purchase-snapshot tax amount
  OR fallback tax formula

upgrade_commissionable_jpy =
  upgrade_gross_customer_paid_jpy
  - upgrade_tax_exclusion_jpy
  - immediately_ineligible_upgrade_amount_jpy
```

No Creator receives commission again on already-paid historical revenue.

Price changes, coupons, or later product repricing must not retroactively change a prior purchase snapshot.

---

## 16. CUSTOMER DISCOUNT

```text
REFERRAL_CUSTOMER_DISCOUNT_AT_LAUNCH = OFF
```

M55 does not combine a 50% founding Creator commission with a launch customer discount by default.

Discount experiments require separate commercial approval.

---



---


## 16A. V1 AFFILIATE PRODUCT ELIGIBILITY

Launch allowlist:

```text
AFFILIATE_ELIGIBLE_PRODUCTS_V1 =
  M55_PREMIUM_REPORT_LIGHT
  M55_PREMIUM_REPORT_FULL
```

```text
ADDITIONAL_INTERPRETATION_COMMISSION_ELIGIBLE_V1 = FALSE
```

Additional Interpretation or any future SKU becomes commissionable only through an explicit future `eligible_product_policy_version`.

Eligibility is snapshotted at payment success. Product retirement or later policy changes do not rewrite historical eligible purchases.

---

## 17. QUALIFIED TOUCH / ABUSE EXCLUSIONS

The following are not qualified Creator touches:

```text
SELF_REFERRAL
RELATED_PARTY_ABUSE
M55_BRAND_SEARCH_AD
COOKIE_STUFFING
COUPON_HIJACK
FORCED_REDIRECT
UNAUTHORIZED_INCENTIVE_TRAFFIC
FRAUDULENT_TRAFFIC
BROWSER_EXTENSION_HIJACK
```

Prohibited conduct includes:

```text
self purchase
circular purchase
fake customer
stolen-card/card-testing traffic
refund abuse
fake social identity
brand-keyword paid search
unauthorized cashback
coupon leakage/hijack
forced redirect
cookie stuffing
browser-extension overwrite
Creator/customer collusion
multi-account abuse
```

Family, same IP, VPN, or device similarity alone is not automatic proof.

Risk signals may trigger HOLD/Human review.

---

## 18. FRAUD REVIEW AND APPEAL

Fraud/compliance classification:

```text
AUTO_PASS
AUTO_DENY_OBJECTIVE
AUTO_HOLD
HUMAN_REVIEW
```

Every adverse decision requires:

```text
reason_code
rule_version
evidence_reference
decision_timestamp
reviewer_type
appeal_status
```

Creator receives a reasonable appeal path for non-objective fraud decisions.

Historical ledger evidence is immutable.

---

## 19. AFFILIATE DISCLOSURE

```text
AFFILIATE_DISCLOSURE_REQUIRED = TRUE
STEALTH_MARKETING = PROHIBITED
```

Creator guidance must require clear advertising disclosure where the M55 relationship influences the post/display.

Approved examples may include:

```text
広告
PR
プロモーション
アフィリエイトリンクを含みます
```

Disclosure must be clear in context, not hidden solely in a remote profile or visually obscure location.

---

## 20. PRODUCT CLAIMS

Creator must not claim or imply:

```text
medical diagnosis
clinical psychological diagnosis
treatment effect
guaranteed future
guaranteed romantic success
guaranteed financial success
guaranteed earnings
official M55 employment/agency status
```

M55 provides approved product facts and prohibited-claim examples in a Creator Sales Kit.

---

## 21. CREATOR SALES KIT

M55 should provide optional promotional assets to accelerate sales:

```text
X post examples
Instagram caption examples
TikTok/short-video description examples
YouTube description examples
blog/article examples
approved product screenshots
approved product facts
affiliate disclosure examples
prohibited claims
brand-bidding prohibition
```

Use is optional.

Creator is free to market independently within Terms.

---

## 22. CREATOR CONSOLE

Canonical `/creator` metrics:

```text
CLICKS
FREE_ANALYSIS_STARTS
ATTRIBUTED_PAID_PURCHASES
LIGHT_PURCHASES
FULL_PURCHASES
PENDING_COMMISSION
HELD_COMMISSION
PAYABLE_COMMISSION
PAID_COMMISSION
CLAWBACKS
NEXT_PAYOUT_ESTIMATE
FOUNDING_50_RATE_REMAINING
```

Creator Console does not expose unnecessary customer PII.

---

## 23. PRIVACY MINIMUM

Default Creator-visible data:

```text
anonymized_conversion_id
product_category
eligible_revenue_basis
commission_rate
commission_amount
commission_status
payout_status
reversal_reason_code
statement_version
```

Not Creator-visible by default:

```text
customer name
customer email
customer DOB
M55 analysis answers
relationship/sensitive profile data
raw Stripe customer/payment identity
full device/IP/fraud graph
bank account details
My Number
```

```text
MY_NUMBER_COLLECTION_V1 = OFF
```

Privacy deletion/account closure does not erase immutable financial evidence that M55 is required to retain for accounting, tax, dispute, fraud, or legal-defense purposes. Non-required profile data should be minimized/pseudonymized when no longer needed.

---

## 24. COMMISSION LIFECYCLE

Canonical eligible payment authority for v1 Stripe one-time purchases:

```text
ELIGIBLE_PAYMENT_OBJECT_TYPE = STRIPE_PAYMENT_INTENT
ELIGIBLE_PAYMENT_OBJECT_ID = stripe_payment_intent_id
```

The rate timestamp is the provider event timestamp of the canonical succeeded event:

```text
ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT =
  Event.created
  of the first accepted canonical
  payment_intent.succeeded event
  for ELIGIBLE_PAYMENT_OBJECT_ID
```

Persist:

```text
canonical_payment_succeeded_event_id
canonical_payment_succeeded_event_created_at
eligible_payment_object_id
```

Explicitly forbidden:

```text
PaymentIntent.created
webhook_received_at
M55_processing_started_at
M55_commission_created_at
```

`PaymentIntent.created` is the time the intent object was created, not the time payment succeeded.

Cross-check/fallback evidence when needed:

```text
Charge.created
of PaymentIntent.latest_charge
where charge.status = succeeded
```

The first accepted canonical succeeded event fixes the immutable rate timestamp. Later duplicate/replayed events cannot alter it.

A PaymentIntent can create at most one original commission accrual.

```text
ELIGIBLE_PURCHASE_CONFIRMED
→ COMMISSION_PENDING_REVIEW
→ optional COMMISSION_HOLD
→ COMMISSION_PAYABLE
```

Review window:

```text
COMMISSION_REVIEW_WINDOW_DAYS = 30
COMMISSION_REVIEW_ENDS_AT =
  ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT + INTERVAL '30 days'
```

The review window allows:

```text
refund checks
chargeback/dispute checks
fraud review
attribution validation
Creator compliance review
```

30 days is not a guarantee that a later refund or chargeback can never create an adjustment.

---

## 25. FINANCIAL AUTHORITY

```text
M55_COMMISSION_LEDGER_IS_FINANCIAL_AUTHORITY = TRUE
CREATOR_PAYABLE_BALANCE_IS_DERIVED_PROJECTION = TRUE
MUTABLE_WALLET_BALANCE_AUTHORITY = PROHIBITED
```

Ledger is append-only.

Required event families:

```text
COMMISSION_ACCRUED
COMMISSION_HELD
COMMISSION_RELEASED
COMMISSION_PAYABLE
COMMISSION_REVERSED
COMMISSION_ADJUSTED
CLAWBACK_ACCRUED
PAYOUT_QUEUED
PAYOUT_PROCESSING
PAYOUT_POSTED
PAYOUT_FAILED
PAYOUT_RETURNED
PAYOUT_FEE_CHARGED
PAYOUT_FEE_REVERSED
WITHHOLDING_RECORDED
TAX_ADJUSTMENT
```

No historical financial event is silently edited or deleted.

---

## 26. LATE REFUND / CHARGEBACK WATERFALL — CLOSED


Late refunds/disputes are handled by append-only adjustment.

Required recovery order:

```text
1. create CLAWBACK/REVERSAL event referencing original purchase/commission
2. offset against unpaid PENDING/PAYABLE commission
3. offset against future Creator commission
4. where available, reverse/recover the linked Stripe transfer before creating an external receivable
5. if another provider-side recovery path is permitted and balance is sufficient:
     provider-side recovery
6. if still unrecovered:
     Creator repayment receivable
7. hold future payouts until documented debt is resolved
8. final write-off only after M55 Human/accounting approval
```

Partial refund/dispute uses the same remaining-entitlement recomputation rule defined in §12.

Dispute lifecycle must distinguish at minimum:

```text
DISPUTE_OPENED
DISPUTE_WON
DISPUTE_LOST
PARTIAL_REFUND
FULL_REFUND
TRANSFER_REVERSAL
RECOVERY_POSTED
RECOVERY_WRITTEN_OFF
```

A dispute that is later won must release/reverse the corresponding hold or provisional clawback exactly once.

Prohibited:

```text
silent historical mutation
double recovery
negative bank payout
undocumented confiscation
```

---

## 27. PAYOUT POLICY

```text
STANDARD_PAYOUT_THRESHOLD_JPY = 20_000
STANDARD_PAYOUT_CADENCE = MONTHLY
STANDARD_PAYOUT_DAY_OF_MONTH = 15
STANDARD_PAYOUT_BATCH_CUTOFF = PRIOR_CALENDAR_MONTH_END_23_59_59_JST
PAYOUT_APPLICATION_REQUIRED = FALSE
BELOW_THRESHOLD_TREATMENT = CARRY_OVER_NO_FORFEITURE
```

Cutoff membership:

```text
STANDARD_BATCH_ELIGIBLE_ROW =
  commission ledger row with status = PAYABLE
  at or before the JST month-end cutoff
  and not already fully settled
```

Still-PENDING / still-HOLD rows at the cutoff do not enter that standard batch. They wait for a later batch after becoming PAYABLE.

All ledger timestamps remain `TIMESTAMPTZ`. Batch membership is evaluated using an explicit `Asia/Tokyo` calendar boundary; server-local timezone is never authority.

Settlement amount authority:

```text
SETTLEMENT_PAYABLE_JPY =
  MAX(
    aggregate eligible PAYABLE commission ledger balance
    after valid clawback/offset adjustments
    before payout-processing fee
    before withholding,
    0
  )
```

The ¥20,000 threshold and standard payout-fee formula use `SETTLEMENT_PAYABLE_JPY`.

Standard payout:

```text
if SETTLEMENT_PAYABLE_JPY >= 20_000 at the monthly cutoff:
    STANDARD_PAYOUT_DUE_AT =
      15th calendar day of the following month
```

If the scheduled date is a Japanese financial-institution holiday, the Terms pre-agree movement to the next banking business day.

The exact due date is stored on the payout instruction and shown in the Creator statement/supplemental notice.

Creator does not need to submit a withdrawal request.

---

## 28. TAIL SETTLEMENT

```text
TAIL_SETTLEMENT_TRIGGER_AGE_DAYS = 180
```

This remains completely separate from:

```text
FOUNDING_RATE_DURATION_DAYS = 180
```

Age anchor:

```text
TAIL_AGE_ANCHOR =
  OLDEST_UNSETTLED_PAYABLE_AT
```

New earnings, payout failure, missing bank information, or a retry must not reset the age of the underlying PAYABLE commission.

Tail settlement:

```text
TAIL_DUE_AT =
  OLDEST_UNSETTLED_PAYABLE_AT + INTERVAL '180 days'
```

The payout due-date authority is:

```text
PAYOUT_DUE_AT =
  earliest applicable date among:
    STANDARD_PAYOUT_DUE_AT when threshold is met
    TAIL_DUE_AT
    APPLICABLE_LEGAL_DUE_AT
```

At the 180-day tail date, M55 settles the legitimate PAYABLE amount even if it is below the normal ¥20,000 threshold.

There is no indefinite micro-balance carry and no forfeiture.

If the capped Creator fee does not fully recover provider cost on a very small tail payout, M55 absorbs that bounded residual cost for the forced tail settlement only. This is an exception, not the standard payout subsidy policy.

Recipient/provider information failures preserve the liability and the original age anchor. M55 must stop repeated paid attempts until the Creator corrects the blocking information.

---

## 29. STANDARD PAYOUT PROCESSING FEE — LAUNCH VALUE

M55 does not subsidize ordinary Creator payout operations by default.

```text
STANDARD_PAYOUT_FEE_BASE_JPY = 770
STANDARD_PAYOUT_FEE_BASE_PAYABLE_JPY = 20_000
STANDARD_PAYOUT_FEE_INCREMENT_BPS = 55
STANDARD_PAYOUT_PROCESSING_FEE_TAX_TREATMENT = TAX_INCLUSIVE_DISPLAY
```

Integer-safe launch formula:

```text
excess_jpy =
  MAX(SETTLEMENT_PAYABLE_JPY - 20_000, 0)

increment_tens =
  (excess_jpy * 55 + 99_999) // 100_000

STANDARD_PAYOUT_PROCESSING_FEE_JPY =
  770 + 10 * increment_tens
```

This is exactly the intended `CEIL_TO_10_JPY` calculation without floating-point ambiguity.

Illustrative schedule:

```text
SETTLEMENT PAYABLE ¥20,000  → fee ¥770
SETTLEMENT PAYABLE ¥30,000  → fee ¥830
SETTLEMENT PAYABLE ¥50,000  → fee ¥940
SETTLEMENT PAYABLE ¥100,000 → fee ¥1,210
SETTLEMENT PAYABLE ¥200,000 → fee ¥1,760
```

This is a disclosed M55 payout-processing/service fee. It is not represented as an exact pass-through of a Stripe invoice line item.

Contract/ledger treatment:

```text
PAYOUT_FEE_IS_SEPARATE_M55_SERVICE_CONSIDERATION = TRUE
CREATOR_AUTHORIZES_DISCLOSED_CONTRACTUAL_SETOFF_AT_PAYOUT = TRUE

Gross Commission / Adjustments
= Settlement Payable
- Payout Processing Fee
- applicable withholding
= Net Payout
```

The gross commission ledger remains intact; the payout fee is a separate event/revenue item.

Fee policy version:

```text
PAYOUT_FEE_POLICY_EFFECTIVE_AT = PAYOUT_INSTRUCTION_LOCKED_AT
```

A payout instruction stores its exact fee formula result and `payout_fee_policy_version`. Already-locked instructions are never repriced.

Retry semantics:

```text
PAYOUT_INSTRUCTION = stable economic settlement obligation
PAYOUT_ATTEMPT = provider attempt under that instruction

RETRY_SUCCESSOR_INHERITS_PARENT_FEE = TRUE
RETRY_SUCCESSOR_INHERITS_PARENT_FEE_POLICY_VERSION = TRUE
NEW_COMMISSION_IS_NOT_FOLDED_INTO_A_RETRY = TRUE
DOUBLE_PAYOUT_FEE = PROHIBITED
```

Fee recognition lifecycle:

```text
PAYOUT_FEE_PROVISIONAL
→ PAYOUT_FEE_CHARGED only when bank payout reaches provider success/paid state
→ PAYOUT_FEE_VOID/REVERSED if the economic settlement is canceled
```

A failed/returned payout does not generate a second Creator fee.

---

## 30. PAYOUT FEE ECONOMIC PRINCIPLE

```text
STANDARD_PAYOUT_COST_ECONOMIC_BEARER = CREATOR
M55_STANDARD_PAYOUT_SUBSIDY = PROHIBITED_BY_DEFAULT
```

Customer payment-processing fees remain M55's product-sales cost.

```text
CUSTOMER_CARD_PROCESSING_COST_BEARER = M55
CREATOR_PAYOUT_PROCESSING_COST_BEARER = CREATOR
```

The payout-processing fee is tax-inclusive Creator-facing consideration.

If M55 is a consumption-tax taxable operator, the accounting model must separately record any output tax embedded in the M55 payout-processing fee and any available input-tax credit on Stripe fees. If M55 is exempt, those entries differ.

The current M55 consumption-tax / qualified-invoice-issuer status is an operator fact that must be recorded before Production cash accounting is enabled. It does not reopen the Affiliate business architecture.

The 55 bps dynamic slope remains cost-covering under both the simple exempt-cash case and the taxable/ex-tax accounting case at the currently verified public Stripe fee stack.

---

## 31. LOW-BALANCE FORCED TAIL RULE — CLOSED

For a forced tail settlement, the Creator fee is capped to prevent fee-caused forfeiture.

```text
TAIL_EFFECTIVE_PAYOUT_FEE_JPY =
  MIN(
    STANDARD_PAYOUT_PROCESSING_FEE_JPY,
    FLOOR(SETTLEMENT_PAYABLE_JPY * 0.25)
  )
```

Therefore:

```text
TAIL_NET_PAYOUT >= 75% of legitimate SETTLEMENT_PAYABLE_JPY
```

Very small tail payouts can cost M55 more in Stripe fees than the capped Creator fee recovers. This is accepted as a bounded forced-tail exception so that M55 does not create an indefinite tiny liability or contradict the 180-day settlement promise.

```text
NEGATIVE_CREATOR_PAYOUT = PROHIBITED
FEE_CAUSED_FORFEITURE = PROHIBITED
TAIL_MICRO_BALANCE_INDEFINITE_CARRY = PROHIBITED
```

---

## 32. DEACTIVATION / TERMINATION

Deactivation stops future attribution and new earning.

It does not automatically erase legitimate historical PAYABLE commission.

```text
DEACTIVATED_CREATOR_NEW_ATTRIBUTION = OFF
HISTORICAL_LEGITIMATE_PAYABLE = PRESERVED
```

Fraud-related debt and documented clawbacks remain enforceable under the ledger.

---

## 33. DEATH / UNREACHABLE / BANK-DETAIL FAILURE

If payout cannot complete because Creator information is missing or invalid:

```text
COMMISSION_REMAINS_PAYABLE
AGE_DOES_NOT_RESET
FORFEITURE = FALSE
```

M55 issues reasonable notification/retry prompts.

Death/succession or long-term unreachability is handled as a payable-liability administration case, not as revenue conversion.

---

## 34. STRIPE TARGET ARCHITECTURE

```text
STRIPE_CONNECT = REQUIRED
STRIPE_ACCOUNTS_MODEL = ACCOUNTS_V2
CONNECTED_ACCOUNT_DASHBOARD = EXPRESS
CHARGE_MODEL = SEPARATE_CHARGES_AND_TRANSFERS

CUSTOMER_CHARGE_OWNER = M55_PLATFORM
FEES_COLLECTOR = APPLICATION
LOSSES_COLLECTOR = APPLICATION
```

M55 owns:

```text
customer charge
attribution authority
commission eligibility
commission ledger
refund/dispute decision
payout instruction authority
reconciliation
```

Stripe owns/assists with:

```text
hosted onboarding
KYC/provider requirements
connected account
bank payout infrastructure
provider payment/transfer/payout objects
```

Money-movement rule:

```text
NO_STRIPE_TRANSFER_BEFORE_PAYOUT_BATCH_LOCK = TRUE
```

Pending/review/payable commissions remain M55 ledger liabilities; M55 does not pre-transfer commission funds into the Creator's connected-account balance.

At a locked payout instruction:

```text
1. verify connected-account payout readiness
2. verify payout schedule/configuration
3. verify platform transfer liquidity
4. create the required net transfer(s)
5. create/reconcile the connected-account bank payout
6. mark posted only from provider-confirmed payout success
```

Connected-account payout schedule target:

```text
CONNECTED_ACCOUNT_PAYOUT_SCHEDULE_V1 = MANUAL
CONNECTED_ACCOUNT_MANUAL_HOLD_MAX_DAYS_JP = 90
```

M55 explicitly verifies/sets the connected-account schedule to manual and does not rely on a country default. Japan currently does not support daily automatic payouts and its public default is manual, but runtime correctness must not depend on that default remaining unchanged.

M55 initiates the bank payout immediately after the payout-batch transfer becomes available.

If a bank payout fails or is delayed after funds have been transferred to the connected account:

```text
RECONCILE_BEFORE_RETRY = TRUE
DO_NOT_LEAVE_SETTLEMENT_IDLE_PAST_MANUAL_HOLD_LIMIT = TRUE
```

The system must resolve/retry/recover the settlement before the applicable Stripe manual-holding limit. It must not silently leave funds on the connected-account balance beyond that limit.

Because an Express user may be able to create a manual payout in some configurations, the implementation reconciles provider payout state before retry if an M55-created payout races with a user-created payout. M55 does not depend on a Support-only restriction to be safe.

---

## 34A. PAYABLE LIQUIDITY COVERAGE

Creator PAYABLE commission is a liability, not free operating cash.

```text
CREATOR_PAYABLE_CASH_COVERAGE_RATIO = 100%
```

Before every transfer batch:

```text
PLATFORM_AVAILABLE_BALANCE_JPY
>= TOTAL_NET_CREATOR_TRANSFER_JPY_FOR_BATCH
```

If not:

```text
PAYOUT_STATE = BLOCKED_LIQUIDITY
DO_NOT_MARK_POSTED
RETAIN_OR_ADD_PLATFORM_FUNDS
EXPLICITLY_RETRY_AFTER_BALANCE_IS_AVAILABLE
```

Stripe transfer failures caused by insufficient platform balance are not assumed to auto-retry.

M55 may satisfy the liquidity requirement by retaining an appropriate Stripe platform minimum balance and/or using supported platform top-ups. This is liability funding, not Creator subsidy.

Do not rely on private-preview funds-segregation functionality for v1 correctness.

---

## 34B. PAYOUT BATCH COMPOSITION

A monthly/tail settlement must be reproducible from immutable ledger components.

Minimum model:

```text
payout_batch
payout_instruction
payout_batch_line
transfer_instruction
payout_attempt
payout_fee_charge
```

Required invariants:

```text
payout_batch_line UNIQUE(batch_id, commission_ledger_event_id)

SUM(applied_amount_jpy for a ledger event across finalized batches)
<= remaining unsettled amount of that ledger event

payout_instruction stores:
  Creator
  settlement payable snapshot
  payout fee policy version
  payout fee amount
  net transfer amount
  due_at
  state

payout_attempt belongs to exactly one stable payout_instruction
```

A late refund/chargeback is allocated back through batch lines to the original commission events so recovery cannot be double-counted.

---


## 35. STRIPE COST MODEL


Current public Japan pricing is not hard-coded as immutable account authority, but the 2026-09-12 independent audit and M55 cross-check confirmed the public platform-managed stack as separate additive components.

```text
ACTIVE_ACCOUNT_FEE_JPY = 200 per active payout month
PAYOUT_FEE = 0.25% of payout amount + JPY 250 per payout
FUNDS_ROUTING_PLATFORM_MANAGEMENT = 0.25% of payout volume
ACCOUNT_DEBIT = 1.5% if used
CUSTOMER_CARD_PROCESSING_PUBLIC_STANDARD = 3.6%
```

For a standard Creator payout:

```text
provider_payout_volume_jpy =
  gross_payable_jpy
  - creator_payout_processing_fee_jpy

public_connect_cost_before_jct ≈
  200
  + 250
  + 0.0025 * provider_payout_volume_jpy
  + 0.0025 * provider_payout_volume_jpy
```

Japanese consumption tax applies to Connect fees. Stripe's current Japan tax guidance also states that Visa/Mastercard payment-processing fees are subject to JCT from 2026-04-01, and disputes are taxable.

Therefore M55 must distinguish:

```text
STRIPE_PUBLIC_FEE_RATE
STRIPE_FEE_JCT
STRIPE_GROSS_CASH_COST
AVAILABLE_INPUT_TAX_CREDIT_IF_ANY
```

Cashflow/economic stress models must not assume `3.6%` is the whole gross card-processing cash outflow when JCT applies.

Current public Visa/Mastercard baseline for cash stress testing:

```text
CARD_FEE_PUBLIC_RATE = 3.6%
CARD_FEE_JCT_RATE = 10%
APPROX_GROSS_CARD_FEE_CASH_RATE = 3.96%
```

Invoice-level JCT rounding is authoritative.

Before production cash activation, M55 verifies the actual applicable account pricing and tax invoice in its own Stripe Dashboard / invoice / written pricing.

This is an operational verification, not an external-professional approval gate.

---

## 36. ACCOUNT DEBIT

```text
ACCOUNT_DEBIT_DEFAULT = OFF
```

It is not the standard Creator fee-recovery method because it adds cost and cannot be assumed to support negative balances.

Use only if a later, specific recovery case justifies it and the required provider consent/conditions are met.

Primary payout fee collection is through the single M55 payout settlement calculation.

Double fee collection is prohibited.

---

## 37. INSTANT PAYOUT

```text
JP_CREATOR_INSTANT_PAYOUT_V1 = OFF
```

M55 launch does not depend on Instant Payout.

---

## 38. PROVIDER MONEY SAFETY / IDEMPOTENCY

Creator money processing requires dedicated financial idempotency.

Minimum authorities:

```text
provider_event_receipt UNIQUE(provider, event_id)

purchase_attribution_snapshot UNIQUE(purchase_id)

commission_accrual UNIQUE(
  provider,
  eligible_payment_object_id
)
# commission policy version is an immutable snapshot column,
# NOT part of the uniqueness key.

commission_adjustment UNIQUE(
  provider,
  source_economic_object_type,
  source_economic_object_id,
  economic_transition
)

transfer_instruction UNIQUE(deterministic_transfer_key)

payout_instruction UNIQUE(deterministic_payout_key)

payout_fee_charge UNIQUE(payout_instruction_id)

payout_attempt UNIQUE(provider, provider_payout_id)
```

Adjustment source identity:

```text
REFUND source_economic_object_id = provider refund_id
DISPUTE source_economic_object_id = provider dispute_id
```

Never use only the PaymentIntent ID as the adjustment source ID.

Multiple partial refunds from the same PaymentIntent therefore remain distinct economic objects while duplicate delivery of the same refund/dispute cannot create a second adjustment.

The same successful PaymentIntent can never accrue a second original commission merely because the policy version changed.

Statement corrections remain versioned:

```text
creator_statement UNIQUE(creator_id, statement_period, statement_version)
superseded_statement_id -> prior immutable statement
```

Retry model:

```text
payout_instruction = stable economic settlement obligation
payout_attempt = one provider attempt

failed/returned attempt
→ same economic instruction chain
→ same locked composition
→ same fee
→ same fee policy version
```

If implementation creates a successor instruction row:

```text
successor.parent_payout_instruction_id = original.id
successor.inherited_payout_fee_charge_id = original fee charge/reference
successor.payout_fee_policy_version = original.payout_fee_policy_version
successor.settlement_composition = original locked composition

NO_NEW_PAYOUT_FEE_FOR_RETRY_CHAIN = TRUE
```

Newly accrued commissions are not added into a retry of an older instruction.

Required recovery cases:

```text
duplicate webhook
out-of-order webhook
DB success / provider call fail
provider success / DB acknowledgement fail
process crash after transfer
unknown acknowledgement
transfer reversal
payout failure
payout return
connected-account readiness regression
refund requested before payout but completed after payout
economic-identity merge after false-negative dedupe
fraud-ban appeal restoration
manual-payout race on connected account
insufficient platform balance
manual-hold-limit risk
```

Unknown money operations are reconciled with provider state before retry.

Payout-destination change requires re-authentication and Creator notification.

Bank-account legal-name mismatch requires a recoverable console/support path; after a failed bank payout caused by invalid destination data, automatic paid retries stop until the blocking information is corrected.

---

## 39. CREATOR STATEMENT


Each payout cycle produces a versioned statement with:

```text
eligible customer revenue
gross customer paid
commission-base tax exclusion
commissionable revenue
commission rate
gross commission
tax-inclusive contractual commission amount
holds
refund/reversal/clawback
gross payable commission
payout fee policy version
payout processing fee
withholding if any
net payout
Stripe transfer reference
Stripe payout reference where available
statement version
supersedes_statement_id where corrected
```

Evidence chain:

```text
purchase
→ attribution snapshot
→ commission calculation snapshot
→ append-only ledger
→ statement vN
→ transfer
→ payout
→ reconciliation
```

A correction creates statement `vN+1`; prior statements remain immutable evidence.

---

## 40. CREATOR TAX / INVOICE HANDLING

M55 supports both invoice-registered and non-registered Japanese resident Creators.

```text
INVOICE_REGISTRATION_REQUIRED_TO_JOIN = FALSE

M55_CONSUMPTION_TAX_STATUS =
  UNKNOWN_CURRENT_OPERATOR_FACT

M55_QUALIFIED_INVOICE_ISSUER_STATUS =
  UNKNOWN_CURRENT_OPERATOR_FACT
```

These two M55 operator facts must be recorded before Production cash accounting is enabled. No professional approval token is required; the system needs the actual factual status.

Creator invoice status does not change the advertised contractual commission amount.

If M55 is a taxable operator, input-tax-credit treatment is accounting-only and must use the applicable law/effective-date branch. For non-registered suppliers, the current 2026 transition changes from 80% through 2026-09-30 to 70% from 2026-10-01 under the 2026 reform.

M55 may implement Creator-confirmed self-billing / purchase-statement workflows, but lack of such automation does not change the contractual commission amount.

The payout-processing fee is separate M55 service revenue; if M55 is taxable, its embedded output-tax treatment must be recorded separately from Stripe input tax.

---

## 41. NO RETROACTIVE PROGRAM REDUCTION

```text
NO_RETROACTIVE_RATE_REDUCTION = TRUE
NO_RETROACTIVE_PAYOUT_FEE_INCREASE = TRUE
```

Future policy versions apply only prospectively.

Existing earned events retain the policy version and calculation snapshot applicable when earned.

Refund, chargeback, fraud, and objective correction use append-only adjustments and are not retroactive policy changes.

---

## 42. POLICY VERSIONING

Version all financial/commercial rules:

```text
commission_rate_policy_version
attribution_policy_version
eligible_product_policy_version
payout_policy_version
payout_fee_policy_version
tax_contract_version
terms_version
abuse_policy_version
```

Effective-time authorities:

```text
COMMISSION_POLICY_LOCKS_AT =
  ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT

ELIGIBLE_PRODUCT_POLICY_LOCKS_AT =
  ELIGIBLE_CUSTOMER_PAYMENT_SUCCEEDED_AT

PAYOUT_FEE_POLICY_LOCKS_AT =
  PAYOUT_INSTRUCTION_LOCKED_AT
```

Purchase/commission snapshots persist the exact versions used.

Material Creator Terms changes require acceptance before new qualifying touches/earnings under the new Terms version.

```text
MATERIAL_TERMS_REACCEPTANCE_REQUIRED_FOR_FUTURE_EARNINGS = TRUE
HISTORICAL_EARNINGS_REPRICED_BY_NEW_TERMS = FALSE
```

---

## 43. STRATEGIC CREATOR OVERRIDE

Default after day 365 remains 30%.

A later strategic Creator arrangement may use:

```text
STRATEGIC_CREATOR_POST_365_RATE = 35% to 40%
```

only if:

```text
separate Human approval = TRUE
economic justification = documented
prospective contract = accepted
```

This is not automatic and is not part of standard launch pricing.

---

## 44. LEGAL / TAX EPOCH INVALIDATORS

The current operating branch remains authoritative until a real change occurs.

Affected policies are re-evaluated only when one of these actually occurs:

```text
FIRST_EMPLOYEE_HIRED
SALARY_OR_WAGE_PAYMENTS_START
ENTITY_FORM_CHANGE
M55_INCORPORATION
AFFILIATE_TO_SPONSORED_CREATOR
MANDATORY_DELIVERABLE_ADDED
POSTING_QUOTA_ADDED
EXCLUSIVITY_ADDED
CREATOR_RECRUITMENT_COMMISSION_ADDED
APPLICABLE_LAW_CHANGE
JFTC_GUIDANCE_CHANGE
NTA_RULE_CHANGE
STRIPE_RULE_CHANGE
STRIPE_PRICING_CHANGE
```

Hypothetical future changes are not launch blockers today.

---

## 45. FIRST-EMPLOYEE SWITCH

If M55 later starts using an employee:

```text
CURRENT_NO_EMPLOYEE_LEGAL_BRANCH = INVALIDATED
```

At that point, affected future Creator contracting/payout-fee policy is reviewed before new affected transactions proceed.

Historical commission is not retroactively rewritten.

This future switch does not block present launch.

---

## 46. COMMERCIAL PRECEDENT — CONTEXT ONLY

M55 is not inventing Affiliate commerce.

Domestic commercial structures already include:

```text
seller-controlled affiliate commission rates
up to 50% commission
payout waiting/review periods
withdrawal/payout fees charged to introducers
Stripe Connect-based affiliate payout systems
single-link referral mechanics
```

These precedents support commercial normality.

They are not substitutes for M55's own Terms or applicable law.

---

## 47. REVENUE OBJECTIVE

```text
PRIMARY_BUSINESS_OBJECTIVE =
  MAXIMIZE_M55_LONG_TERM_PROFIT
  WITHIN_APPLICABLE_LAW_STRIPE_RULES_AND_CONTRACT
```

Creator economics are designed to align incentives:

```text
Creator wins by producing legitimate new paid customers.
M55 wins by paying high commission only on legitimate incremental paid revenue.
```

Profit defense:

```text
new customer GMV
Full-product mix
accurate attribution
anti-abuse controls
refund/dispute controls
payout-fee recovery
low operational burden
accurate accounting
```

M55 does not protect margin by silently reducing earned Creator commission.

---


## 47A. 2026-09-12 PUBLIC UNIT-ECONOMICS CROSS-CHECK

This section is evidence, not a replacement for account-specific billing.

Assumptions:

```text
customer price: tax-inclusive
commission-base tax exclusion: FLOOR(gross * 10 / 110)
card public standard: 3.6%
card-fee JCT cash stress: +10%
Connect payout cost: recovered separately through Creator payout fee
```

Approximate no-refund/no-dispute contribution before Connect payout settlement:

| SKU | Creator rate | Customer gross | Base exclusion | Commissionable | Creator commission | Card fee + JCT approx | M55 contribution |
|---|---:|---:|---:|---:|---:|---:|---:|
| Light | 50% | ¥1,000 | ¥90 | ¥910 | ¥455 | ¥39.60 | ¥415.40 |
| Light | 40% | ¥1,000 | ¥90 | ¥910 | ¥364 | ¥39.60 | ¥506.40 |
| Light | 30% | ¥1,000 | ¥90 | ¥910 | ¥273 | ¥39.60 | ¥597.40 |
| Full | 50% | ¥1,480 | ¥134 | ¥1,346 | ¥673 | ¥58.61 | ¥614.39 |
| Full | 40% | ¥1,480 | ¥134 | ¥1,346 | ¥538 | ¥58.61 | ¥749.39 |
| Full | 30% | ¥1,480 | ¥134 | ¥1,346 | ¥403 | ¥58.61 | ¥884.39 |

At 50%, a simple stress model that retains original card-processing cost gives approximately:

```text
Light:
  10% full refund expected contribution ≈ ¥369.90
  3% fully lost dispute expected contribution ≈ ¥352.25
  10% refund + 3% lost dispute combined ≈ ¥306.75

Full:
  10% full refund expected contribution ≈ ¥547.09
  3% fully lost dispute expected contribution ≈ ¥544.70
  10% refund + 3% lost dispute combined ≈ ¥477.40
```

Dispute stress assumes a public ¥1,500 dispute fee plus JCT and no double counting of mutually exclusive refund/dispute outcomes.

Conclusion:

```text
FOUNDING_50_PERCENT_PHASE_PUBLIC_STRESS_RESULT = PROFITABLE
```

Account-specific Stripe pricing still overrides the public baseline for Production.


## 48. COMMERCIALIZATION GATE

There is no external-professional preclearance gate.

Current commercial activation requires only M55-controlled implementation/verification:

```text
CREATOR_TERMS_PUBLISHED = TRUE
ART3_READY_DISCLOSURE_IMPLEMENTED = TRUE
ART3_SUPPLEMENTAL_NOTICE_PATH_GREEN = TRUE
CREATOR_TERMS_ACCEPTANCE_LOGGED = TRUE
MATERIAL_TERMS_REACCEPTANCE_GREEN = TRUE

CREATOR_MINIMUM_AGE_ENFORCED = TRUE
V1_JAPAN_RESIDENT_AND_JPY_SCOPE_GREEN = TRUE

REFERRAL_AND_ATTRIBUTION_RUNTIME_GREEN = TRUE
ATTRIBUTION_EXACT_BOUNDARY_GREEN = TRUE
ATTRIBUTION_LOCK_EXPIRY_GREEN = TRUE
ECONOMIC_IDENTITY_REPLAY_PROTECTION_GREEN = TRUE
ABUSE_CONTROLS_MINIMUM_GREEN = TRUE

V1_ELIGIBLE_PRODUCT_ALLOWLIST_GREEN = TRUE

CANONICAL_PAYMENT_SUCCESS_TIMESTAMP_GREEN = TRUE
ORIGINAL_COMMISSION_UNIQUENESS_GREEN = TRUE
COMMISSION_ADJUSTMENT_IDEMPOTENCY_GREEN = TRUE

COMMISSIONABLE_PIPELINE_NO_DOUBLE_DISCOUNT_GREEN = TRUE
TAX_BASE_ROUNDING_SNAPSHOT_GREEN = TRUE
UPGRADE_INCREMENTAL_CALC_GREEN = TRUE

APPEND_ONLY_COMMISSION_LEDGER_GREEN = TRUE
COMMISSION_30_DAY_REVIEW_GREEN = TRUE
LATE_CHARGEBACK_WATERFALL_GREEN = TRUE
PARTIAL_REFUND_DISPUTE_RECOMPUTE_GREEN = TRUE

PAYOUT_BATCHING_GREEN = TRUE
PAYOUT_BATCH_LINE_MAPPING_GREEN = TRUE
STANDARD_PAYOUT_EXACT_DUE_DATE_GREEN = TRUE
TAIL_180_DAY_EXACT_SETTLEMENT_GREEN = TRUE

PAYOUT_FEE_SINGLE_PATH_GREEN = TRUE
PAYOUT_FEE_INTEGER_FORMULA_GREEN = TRUE
PAYOUT_FEE_CONTRACTUAL_SETOFF_GREEN = TRUE
PAYOUT_FEE_POLICY_LOCK_GREEN = TRUE
PAYOUT_FEE_IDEMPOTENCY_GREEN = TRUE
PAYOUT_RETRY_INHERITANCE_GREEN = TRUE
DOUBLE_CHARGE_GUARD_GREEN = TRUE

STRIPE_CONNECT_ACCOUNTS_V2_GREEN = TRUE
CONNECTED_ACCOUNT_MANUAL_PAYOUT_SCHEDULE_GREEN = TRUE
NO_PREBATCH_TRANSFER_GREEN = TRUE
PAYOUT_MANUAL_RACE_RECONCILIATION_GREEN = TRUE

CREATOR_PAYABLE_LIQUIDITY_COVERAGE_GREEN = TRUE
PLATFORM_TRANSFER_BALANCE_PREFLIGHT_GREEN = TRUE

STRIPE_ACCOUNT_ACTUAL_PRICING_VERIFIED = TRUE
STRIPE_TAX_INVOICE_VERIFIED = TRUE
PROVIDER_IDEMPOTENCY_AND_RECONCILIATION_GREEN = TRUE

M55_CONSUMPTION_TAX_STATUS_OBSERVED = TRUE
M55_INVOICE_ISSUER_STATUS_OBSERVED = TRUE
PAYOUT_FEE_TAX_ACCOUNTING_BRANCH_GREEN = TRUE

CREATOR_STATEMENT_VERSIONING_GREEN = TRUE
PAYOUT_DESTINATION_CHANGE_SECURITY_GREEN = TRUE
BANK_ACCOUNT_MISMATCH_RECOVERY_GREEN = TRUE

CREATOR_STATEMENT_GREEN = TRUE
PRIVACY_MINIMUM_GREEN = TRUE
FINANCIAL_RECORD_RETENTION_GREEN = TRUE
STEALTH_MARKETING_DISCLOSURE_GREEN = TRUE
```

When these are GREEN:

```text
CASH_AFFILIATE_ACTIVATION =
  ELIGIBLE_FOR_HUMAN_PRODUCTION_GO
```

No lawyer/tax-accountant/JFTC/NTA approval token is required.

---

## 49. REPOSITORY INTEGRATION

This document is the current Human-frozen semantic authority.

Repo integration must be performed against **fresh `origin/main` at execution time**.

Do not merge a stale historical Operating Model branch wholesale.

Reconcile semantic deltas into the current Creator SSOT family, preserving current Git-first repository authority.

Expected target documents include, where they exist in fresh main:

```text
M55_CREATOR_AFFILIATE_OPERATING_MODEL_SSOT.md
M55_CREATOR_REVENUE_E2C2E_SSOT.md
M55_CREATOR_AFFILIATE_STRIPE_TAX_LEGAL_SSOT.md
M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md
M55_CREATOR_AFFILIATE_BENCHMARK_TARGET_ARCHITECTURE_SSOT.md
M55_OPERATOR_BUSINESS_STATUS_SSOT.md
docs/ssot/README.md
```

No runtime implementation should be mixed into a docs-only reconciliation gate unless explicitly authorized.

---

## 50. ROADMAP — FAST COMMERCIALIZATION ORDER

Do not repeat broad research.

Proceed:

```text
R2
CURRENT-OPERATOR SSOT RECONCILIATION
+ Creator Terms / disclosure / tax-contract language

→ R3
PROGRAM TRUTH
Creator-facing Terms
Creator Sales Kit
disclosure / prohibited claims

→ R4
economic identity
application/onboarding
referral token
50% clock
replay protection

→ R5
30-day last-qualified-touch attribution
checkout lock
anti-abuse
appeal
privacy

→ R6
commission calculation snapshot
append-only ledger
30-day review
refund/dispute/clawback

→ R7
Creator Console
statements
performance funnel

→ R8
Accounts v2 / Express
Separate Charges and Transfers
payout batching
dynamic standard payout processing fee (¥770 minimum; +55 bps above ¥20,000 gross payable)
reconciliation
provider failure handling
actual-pricing verification

→ HUMAN PRODUCTION GO
→ controlled Creator launch
→ first Founding cohort
→ measure GMV / Full mix / refunds / disputes / payout cost
→ optimize
```

No stage is allowed to reopen an unaffected CLOSED GREEN rule.

---

## 51. DO NOT REOPEN WITHOUT REAL INVALIDATOR

The following are final for v1:

```text
M55 current operator = Japan sole proprietor / zero employees / no salary
URL-only voluntary Affiliate
no mandatory posting/deliverable/quota/exclusivity
single-tier only
no recruitment commission
no joining fee
no required purchase
50% → 40% → 30%
50% once per economic identity
rate determined at eligible payment success
30-day last-qualified-direct-touch attribution
one Creator per purchase
no retroactive attribution
upgrade incremental revenue only
customer launch discount OFF
30-day commission review
append-only ledger
JPY 20,000 monthly automatic payout threshold
no payout application
carry-over / no forfeiture
180-day exact tail settlement with no indefinite micro-balance carry
Creator pays standard payout-processing fee
standard payout fee = JPY 770 minimum + integer-safe 55 bps above JPY 20,000 SETTLEMENT_PAYABLE, rounded up to JPY 10
forced-tail fee capped at 25% of payable
no negative payout
late-chargeback recovery waterfall
commission quoted amount is tax-inclusive total consideration
no automatic +10% commission claim
Japanese resident Creators only for v1 cash payout
ordinary resident Affiliate withholding default = 0 under current operator facts
PR/advertising disclosure required
brand bidding/self-referral/cookie stuffing/coupon hijack prohibited
customer PII minimized
Accounts v2 + Express + Separate Charges and Transfers
M55 owns customer charge
customer card processing cost belongs to M55
Creator payout processing cost belongs to Creator
Account Debit default OFF
Japan Instant Payout v1 OFF
no external professional preclearance gate
```

---

## 52. SUPERSEDED

The following prior concepts are superseded:

```text
STANDARD_PAYOUT_COST_BEARER = M55
→ SUPERSEDED

LEGAL_COUNSEL_PRECLEARANCE_REQUIRED = TRUE
→ SUPERSEDED

TAX_ACCOUNTANT_PRECLEARANCE_REQUIRED = TRUE
→ SUPERSEDED

JFTC_DIRECT_CONFIRMATION_REQUIRED = TRUE
→ SUPERSEDED

NTA_DIRECT_CONFIRMATION_REQUIRED = TRUE
→ SUPERSEDED

"CASH AFFILIATE cannot proceed until professional opinion"
→ SUPERSEDED

"URL-only classification debate must be resolved before building"
→ SUPERSEDED
```

---

## 53. FINAL CONTROL-TOWER STATE

```text
CURRENT_OPERATOR_FACTS = FROZEN
BUSINESS_ARCHITECTURE = FROZEN
LEGAL_OPERATING_BRANCH_FOR_CURRENT_FACTS = FROZEN
COMMISSION_ECONOMICS = FROZEN
ATTRIBUTION = FROZEN
PAYOUT_POLICY = FROZEN
PAYOUT_FEE = FROZEN
TAX_CONTRACT_INTENT = FROZEN
ABUSE_CONTROLS = FROZEN
LATE_CHARGEBACK_POLICY = FROZEN
STRIPE_TARGET_ARCHITECTURE = FROZEN

PROFESSIONAL_PRECLEARANCE = NOT_REQUIRED
REPEATED_BROAD_AUDIT = PROHIBITED_WITHOUT_INVALIDATOR

GROKBOT_REV4_DELTA_AUDIT = GREEN_WITH_PATCHES
GROKBOT_CLOSURE_FINAL_DELTA_AUDIT = GREEN_WITH_PATCHES
GROKBOT_NEW_REAL_BLOCKERS = NONE

PATCH_F1 = APPLIED
PATCH_F2 = APPLIED
PATCH_F3 = APPLIED
PATCH_F4 = APPLIED
PATCH_F5 = APPLIED
PATCH_F6 = APPLIED

REV4_FINAL_FREEZE = GREEN

REPO_CANONICAL_INTEGRATION = PENDING
RUNTIME_IMPLEMENTATION = PENDING
PRODUCTION_CASH_ACTIVATION = FALSE

NEXT_SINGLE_ACTION =
  R2_CURRENT_OPERATOR_CREATOR_AFFILIATE_SSOT_RECONCILIATION_FRESH_READ_ONLY_PREFLIGHT
```

Production cash activation remains FALSE only because runtime/provider/accounting gates have not yet been implemented and verified. It is not a business-design HOLD.

M55 remains on:

`COMPLETE → SELL → GROW → THEN DECIDE`

---

## 54. REV4 AUDIT TRAIL

Accepted external audit result:

```text
GROKBOT_EXTERNAL_AUDIT_2026_09_12 = GREEN_WITH_PATCHES
READY_FOR_REPO_RECONCILIATION = TRUE
READY_FOR_RUNTIME_IMPLEMENTATION = TRUE
READY_FOR_PRODUCTION_CASH_ACTIVATION = FALSE
```

External audit patches incorporated:

```text
R4_01 no discount double-subtraction
R4_02 deterministic tax-base rounding
R4_03 upgrade incremental calculation
R4_04 Stripe fee JCT/account invoice verification
R4_05 payout-fee unique idempotency
R4_08 operational playbooks / statement correction / security
```

Additional independent M55 cross-check patches incorporated:

```text
R4_X1 Stripe card-processing JCT gross-cash modeling
R4_X2 dynamic payout fee above ¥20,000 to prevent high-payout under-recovery
R4_X3 micro-tail ¥2,200 bank-payout minimum with no-forfeiture carry
R4_X4 refund/dispute stress preserving non-refunded processing fee
R4_X5 transfer reversal before external receivable where available
```

The following remain unchanged:

```text
50% → 40% → 30%
¥20,000 standard threshold
30-day review
180-day tail age
25% forced-tail fee cap
Founding cohort target 20
URL-only voluntary single-tier Affiliate
no external professional preclearance
```


## 55. CLOSURE-AUDIT DELTAS AFTER GROKBOT REV4 AUDIT

GROKBot accepted the Rev4 deltas and required two explicit patches:

```text
R4D_01 integer-only payout-fee formula
R4D_02 retry successor inherits original fee / no double fee
```

Both are incorporated.

Independent M55 closure audit found additional concrete holes that are not taste-based redesign:

```text
C01 exact Article-3 supplemental notice + exact payout due date
C02 exact 30-day attribution half-open boundary + stale checkout lock expiry
C03 explicit v1 eligible-product allowlist
C04 canonical Stripe payment-success timestamp
C05 original commission uniqueness must be payment-object unique, not policy-version unique
C06 refund/dispute economic-adjustment uniqueness
C07 exact monthly payout date and settlement-payable definition
C08 connected-account payout schedule; default daily payout is unsafe
C09 no transfer before payout-batch lock
C10 100% PAYABLE liability funding + platform-balance preflight
C11 immutable payout-batch-to-ledger mapping
C12 payout fee contractual setoff and tax/accounting separation
C13 payout fee version locks at payout instruction
C14 remove indefinite <¥2,200 carry; restore exact 180-day tail settlement
C15 current M55 consumption-tax/invoice status must be observed as facts before Production accounting
C16 age 18 / JP resident / JPY / JP bank launch scope
C17 My Number collection OFF for ordinary v1 Affiliate
C18 material Terms changes require reacceptance for future earnings
```

These do not reopen the frozen 50/40/30 rate schedule, ¥20,000 threshold, 30-day review, or Creator program architecture.


## 56. FINAL MUTUAL-AUDIT CLOSURE — 2026-09-13

GROKBot final delta result:

```text
FINAL_DELTA_VERDICT = GREEN_WITH_PATCHES
NEW_REAL_BLOCKERS = NONE
READY_FOR_REV4_FINAL_FREEZE = TRUE after F1-F6
READY_FOR_R2_REPO_RECONCILIATION = TRUE
READY_FOR_RUNTIME_IMPLEMENTATION = TRUE
READY_FOR_PRODUCTION_CASH_ACTIVATION = FALSE
```

Final precision patches incorporated:

```text
F1  Explicit MANUAL Stripe payout schedule; do not rely on Japan country default
F2  90-day manual-hold guard and reconciliation
F3  Refund/dispute adjustment source ID = provider refund_id/dispute_id
F4  Commission-rate timestamp = Event.created of canonical payment_intent.succeeded
    PaymentIntent.created is forbidden
F5  Standard batch membership = PAYABLE as of explicit JST month-end cutoff
F6  Public products separated from Affiliate v1 eligible-product allowlist
```

Independent primary-source cross-check confirmed:
- Stripe manual payouts for non-US/non-Thailand countries must be paid out within 90 days.
- Japan daily automatic payout is unavailable and public default is manual, but M55 still explicitly locks/verifies manual configuration.
- Stripe does not automatically retry failed transfers caused by insufficient platform available balance.
- Stripe `PaymentIntent.created` is object-creation time; `payment_intent.succeeded` is the success event.
- JFTC Article-3-ready disclosure requires amount/payment-date information and supplemental disclosure for legitimately undetermined items.

No rate, threshold, review-window, cohort, or current legal-branch reopening was required.

`REV4 FINAL = CLOSED GREEN`
