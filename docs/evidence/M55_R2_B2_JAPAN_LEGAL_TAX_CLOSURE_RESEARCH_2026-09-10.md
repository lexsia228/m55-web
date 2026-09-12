# M55 R2-B2 Japan Legal / Tax Closure Research — 2026-09-10

Status: PRIMARY-SOURCE EVIDENCE / NOT YET R2-B2 CLOSED

Repository authority: main @ `228bf19abc0a9a26dec751618b0d8836d0da3e65`
Current executable gate remains `REVENUE_SAFETY_E2E`.

Purpose: reduce the remaining R2-B2 Japan legal/tax questions to the smallest evidence-backed fact matrix required before R2 final Human acceptance. Human correction 2026-09-10: **M55 operator is a sole proprietor, not a corporation.**

## 1. What is already closed

Stripe/provider:
- Accounts v2 / Express / Separate Charges and Transfers: closed for architecture.
- Platform bears fees/losses/negative-balance responsibility: closed for architecture.
- Stripe C support follow-up: completed / no M55 action required.
- Stripe final account approval: not represented as permanent/final approval.

Commercial/tax architecture:
- 50/40/30 = gross commercial commission on `COMMISSIONABLE_REVENUE`.
- no after-tax/net guarantee.
- no silent deductions.
- unknown tax classification blocks live payout without erasing valid commission.
- invoice/consumption-tax profile is effective-dated.
- My Number must not be collected speculatively.
- late-discovered withholding is a separate tax/accounting correction event.

## 2. Freelance Act — official evidence

Primary sources:
- JFTC Act text:
  https://www.jftc.go.jp/fllaw.html
- JFTC Freelance Act Q&A:
  https://www.jftc.go.jp/fllaw_limited/fllaw_qa.html
- JFTC consultation desk:
  https://www.jftc.go.jp/soudan/soudan/freelance.html

Supported current findings:
- the Act can cover a business asking another business to provide services for its business;
- JFTC Q26 states even services used by the ordering business itself can be covered when the service content is specified;
- there is no official categorical affiliate exclusion found;
- if the Act applies, transaction terms must be disclosed electronically/in writing;
- payment deadline is within 60 days of service receipt/completion, as short as possible;
- bank-transfer fee deduction from remuneration is prohibited regardless of agreement;
- already-fixed remuneration cannot be retroactively reduced by changing the calculation formula;
- recruiting multiple freelancers via web/SNS can trigger accurate/current recruitment-information obligations.

M55 fact pattern intentionally reduces outsourcing characteristics:
- Affiliate-first only;
- no mandatory post count;
- no fixed posting schedule;
- no deliverable;
- no required copy;
- zero referrals allowed with no penalty;
- no exclusivity;
- no inventory/purchase/training requirement;
- direct single-tier only;
- commission only on eligible attributed paid purchases.

Unresolved legal issue:
`FREELANCE_ACT_M55_AFFILIATE_FACT_PATTERN = REQUIRES_JFTC_CONFIRMATION`

Critical sub-question:
If this relationship is covered, what is the legally relevant `役務の提供を受けた日` / payment-deadline anchor for an ongoing voluntary performance-based affiliate relationship?

## 3. 30-day review compatibility

The ordinary JFTC payment rule, when applicable, is within 60 days from the legally relevant service-receipt/completion date.

M55's 30-day compliance review is not inherently incompatible with a 60-day outer limit, but **approval/PAYABLE date cannot be assumed to reset the statutory clock**.

`COMMISSION_APPROVAL_DATE_IS_NOT_ASSUMED_LEGAL_DEADLINE_START = TRUE`

Required JFTC confirmation:
- whether the service event is the attributed conversion, a promotion/service period, another event, or fact-dependent;
- whether monthly batching can be used without causing any covered service to exceed the legal deadline.

## 4. Creator-borne payout/transfer fee

If the Freelance Act applies, JFTC Q78 states bank-transfer fees cannot be deducted from remuneration regardless of agreement.

Stripe technical ability to charge platform/users is not legal authority for M55 to deduct Creator payout costs.

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION = NOT_AUTHORIZED_PENDING_LEGAL_CLASSIFICATION`

Safe launch fallback:
`R2_B2_SAFE_FALLBACK_CREATOR_BANK_TRANSFER_FEE = M55_BORNE`

This is a fallback, not a permanent economic policy.

## 5. Source withholding — resident corporation vs resident individual

Primary sources:
- NTA No.2793:
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2793.htm
- NTA No.2804:
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2804.htm
- NTA Income Tax Basic Circular 204-22 / 204-22-2:
  https://www.nta.go.jp/law/tsutatsu/kihon/shotoku/36/04.htm
- NTA consultation:
  https://www.nta.go.jp/taxes/shiraberu/shirabekata/9200.htm

### Japan resident corporate Creator

NTA No.2793 states that source withholding on payments to domestic corporations is generally limited to horse-racing prizes under the cited corporate rule.

Therefore for ordinary M55 affiliate commission:

`JP_DOMESTIC_CORPORATE_CREATOR_WITHHOLDING = NO_SOURCE_WITHHOLDING_EXPECTED_UNDER_CURRENT_NTA_GENERAL_RULE`

This does not remove possible information-return/accounting duties if a payment category independently creates them.

### Japan resident individual Creator

NTA requires withholding only when the remuneration is actually in a statutory category.

NTA explicitly includes `外交員等`; its basic circular also treats certain salespeople paid according to handling quantity/value as `外交員` remuneration.

No official NTA source located by this review categorically includes or excludes ordinary web affiliate commission.

Therefore:

`JP_RESIDENT_INDIVIDUAL_AFFILIATE_WITHHOLDING = REQUIRES_NTA_OR_TAX_ADVISER_CLASSIFICATION`

Do not use:
- universal zero;
- universal 10.21%;
- universal `外交員等`.

## 6. Corporate/individual onboarding consequence

Candidate fail-closed architecture for later Human approval:

- Japan resident corporation: withholding generally not required under current NTA general rule; verify entity status.
- Japan resident individual: tax classification required before first cash payout; one-time/profile-versioned review, not Human approval per payout.
- nonresident/foreign entity: `TAX_REVIEW_REQUIRED`; cross-border payout remains blocked until R8/treaty classification.

This candidate does not itself close R2-B2.

## 7. Consumption tax / invoice

Current evidence remains sufficient for architecture:
- Creator tax/invoice status is profile-based;
- M55 payout volume alone is not authority;
- invoice status is verified/effective-dated;
- self-billing/purchaser-created statement remains R8 candidate;
- invoice status must not retroactively reduce earned commission.

No additional broad tax research is required for R2-B2 absent a new invalidator.

## 8. Exact remaining blockers to R2-B2 closure

A. JFTC fact-pattern confirmation:
1. Does M55 Affiliate-first v1 constitute `役務の提供を委託` on the stated facts?
2. If yes, what event/period starts the payment-deadline clock for success-fee affiliate activity?
3. Does the 30-day review + batch payout design remain compliant if final payout occurs within the applicable statutory deadline?
4. Is any Creator-borne payout/service fee permissible, distinguishing bank-transfer fee from a separately contracted service fee?

B. NTA/tax-adviser classification:
1. For a Japan-resident individual, does M55 Affiliate-first performance commission fall within `外交員等` or another source-withholding category?
2. If yes, what calculation/timing/payment-report treatment applies to this exact structure?
3. If no, confirm no payer-side source withholding on ordinary affiliate commission under these facts.

## 9. R2-B2 closure rule

Do not close R2-B2 from inference alone.

`R2_B2_JAPAN_LEGAL_TAX_PUBLIC_RESEARCH = COMPLETE`

`R2_B2_JFTC_FACT_PATTERN_CONFIRMATION = REQUIRED`

`R2_B2_NTA_OR_TAX_ADVISER_WITHHOLDING_CONFIRMATION = REQUIRED_FOR_INDIVIDUAL_CASH`

`R2_B2_STRIPE_RESEARCH_REPLAY = PROHIBITED_ABSENT_INVALIDATOR`

After the two bounded confirmations, Control Tower should update the SSOT and request explicit Human R2 final acceptance.

## 10. M55 operator-form correction — sole proprietor

`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

The previous draft used company/corporation wording as a generic payer description. That is corrected.

For Japanese source-withholding and Freelance Act analysis, two factual switches now control most of the residual risk:

1. `M55_USES_EMPLOYEES_FOR_FREELANCE_ACT = UNKNOWN_PENDING_HUMAN_FACT_CONFIRMATION`
2. `M55_IS_SALARY_PAYER_FOR_WITHHOLDING = UNKNOWN_PENDING_HUMAN_FACT_CONFIRMATION`

Do not infer either from the phrase "sole proprietor".

### 10.1 Source-withholding consequence

NTA No.2793 states that when the payer is an **individual** and is **not a payer of salaries**, source withholding on covered remuneration is generally not required, except specified cases such as hostess remuneration.

Therefore:

`SOLE_PROPRIETOR_NO_SALARY_PAYER_SOURCE_WITHHOLDING_FALLBACK = NO_WITHHOLDING_REQUIRED_FOR_ORDINARY_AFFILIATE_PAYMENT_UNDER_CURRENT_NTA_GENERAL_RULE`

If M55 **does pay salaries** (including salary treatment that makes the proprietor a salary payer), the affiliate-payment category must still be classified before cash activation.

The old corporation-vs-individual Creator branch remains relevant to the **recipient**, but M55's own payer form is now correctly sole proprietor.

### 10.2 Freelance Act consequence

JFTC Q2/Q9 and the official applicability chart distinguish:
- a sole-proprietor ordering business **without employees**: `業務委託事業者`; transaction-condition disclosure remains required if the transaction is otherwise covered;
- a sole-proprietor ordering business **using employees**: may be `特定業務委託事業者`, triggering additional duties such as payment deadline and other protections.

Therefore:

`SOLE_PROPRIETOR_NO_EMPLOYEE_FREELANCE_ACT_PAYMENT_DEADLINE = NOT_APPLICABLE_UNDER_CURRENT_JFTC_ROLE_SPLIT`

`SOLE_PROPRIETOR_NO_EMPLOYEE_TRANSACTION_TERMS_DISCLOSURE = REQUIRED_IF_COVERED_TRANSACTION`

Employee status must be checked under JFTC's definition, not everyday language.

## 11. Mature Japanese affiliate operating precedent

These precedents support the **operating model**, not legal safe-harbor:

### A8.net
Public current help documents:
- outcome occurs -> advertiser validates -> commission is confirmed;
- monthly closing;
- payment after confirmation;
- 1,000 / 5,000 / carry-over modes;
- scheduled bank payout;
- payout/report visibility.

Sources:
- https://support.a8.net/as/payment/
- https://www.a8.net/campus/campus-blog/1175-transfer.html

M55 treatment:
- adopt: `PENDING -> APPROVED/PAYABLE -> BATCH PAYOUT` pattern, threshold/carry-over concept, reportability;
- reject: A8's exact thresholds, exact timing, bank-fee policy as automatic M55 constants.

### ValueCommerce
Public current help documents:
- advertiser approval precedes payout;
- 1,000-yen minimum with carry-over;
- payout on scheduled later date;
- bank transfer fee is free;
- payment report is invoice-system aware.

Sources:
- https://www.valuecommerce.ne.jp/stepup/guide/comission/
- https://help.valuecommerce.ne.jp/aff/transactions/comission/02/

M55 treatment:
- adopt: approval-before-payment, scheduled batching, no-surprise accounting statement, invoice-aware report;
- reject: exact threshold/timing as M55 legal constants.

### Amazon Associates Japan
Public current help documents:
- bank-transfer minimum;
- automatic carry-over below threshold;
- account-level payout method/security management.

Sources:
- https://affiliate.amazon.co.jp/help/node/topic/GP8Z3AZ27ZFHTEUL
- https://affiliate.amazon.co.jp/help/node/topic/GKDG94FQSRXSJCGK

M55 treatment:
- adopt: threshold/carry-over and payout-method security patterns;
- reject: Amazon-specific values and platform rules.

### Evidence conclusion

`M55_AFFILIATE_OPERATING_MODEL_IS_ORDINARY_MARKET_PATTERN = TRUE`

`MATURE_AFFILIATE_PRECEDENT_SUPPORTS_APPROVAL_THEN_BATCH_PAYOUT = TRUE`

`COMPETITOR_PRECEDENT_DOES_NOT_OVERRIDE_M55_PAYER_FORM_OR_JAPANESE_LAW = TRUE`

This materially reduces invention risk: M55 is not creating a novel payout lifecycle. The remaining work is to map ordinary patterns to the sole-proprietor-specific statutory branches.

## 12. Evidence-first closure rule

Before calling JFTC/NTA, confirm only these M55 facts:

- Does M55 currently "use employees" under JFTC's statutory definition?
- Is M55 currently a payer of salaries for NTA source-withholding purposes?

If both are NO:
- the Freelance Act 60-day payment deadline issue is not the controlling JFTC obligation under the current role split;
- the NTA payer-side source-withholding issue is substantially closed by the individual-payer/no-salary-payer rule;
- remaining R2-B2 work can focus on transaction-condition disclosure, accounting/invoice profile, and safe payout mechanics.

`R2_B2_PHONE_CONSULTATION = CONDITIONAL_FALLBACK_NOT_DEFAULT`

Use phone/adviser consultation only if:
- either factual switch is YES/unclear;
- a new fact invalidates the public-rule mapping;
- or Control Tower/Codex/Grok finds an authority ambiguity that cannot be resolved from official sources.
