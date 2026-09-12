# M55 Creator Affiliate / Stripe / Tax-Legal SSOT

Status: **ACTIVE / HUMAN-APPROVED ARCHITECTURE CONTRACT (2026-09-09)**

Implementation status: **CREATOR CASH INFRASTRUCTURE NOT IMPLEMENTED**

Sole executable CURRENT/NEXT authority remains `docs/ssot/M55_EXECUTION_STATE.json`. This SSOT does not advance the execution gate, select the payout provider, create connected accounts, move money, or authorize Production cash activation.

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

`STRIPE_CONNECT_FLOW = SEPARATE_CHARGES_AND_TRANSFERS`

`STRIPE_ACCOUNT_API = ACCOUNTS_V2`

`STRIPE_CONNECTED_ACCOUNT_DASHBOARD = EXPRESS`

`STRIPE_CONNECT_FEES_BILLED_TO = M55_PLATFORM_BALANCE`

`STRIPE_CONNECT_LOSS_RESPONSIBILITY = APPLICATION`

`STRIPE_HOSTED_KYC_AND_BANK_DATA_PREFERRED = TRUE`

`M55_FULL_CREATOR_BANK_DATA_STORAGE = PROHIBITED_UNLESS_LATER_UNAVOIDABLE_AND_HUMAN_APPROVED`

Do not transfer Creator commission at customer-purchase time. Purchase attribution is not commission finality.

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

A Creator payout request is a **timing preference / early trigger** only. It does not approve a commission and cannot make an invalid commission valid.

`CREATOR_PAYOUT_REQUEST_IS_NOT_COMMISSION_APPROVAL = TRUE`

---

## E. Payout batching and small-balance economics

Never create one bank payout per purchase.

`PAYOUT_BATCHING_REQUIRED = TRUE`

M55 should aggregate valid `COMMISSION_PAYABLE` amounts before payout to reduce fixed per-payout cost and reconciliation load.

The following remain unresolved until R8/legal-tax closure:

- exact economic payout threshold;
- exact payout cadence;
- whether Creator may choose threshold/cadence options;
- exact early-payout mechanics;
- exact fee amount or fee formula;
- exact treatment when a balance is below the economic threshold near a legal deadline.

`ECONOMIC_PAYOUT_THRESHOLD = UNRESOLVED`

`LEGAL_PAYMENT_DEADLINE_OVERRIDES_ECONOMIC_THRESHOLD = TRUE_IF_APPLICABLE`

If an applicable statutory or contractual payment deadline arrives before the economic threshold, the deadline wins. No threshold/carry-over policy may be used to create an unlawful late payment.

---

## F. Payout-cost ownership: economic objective vs legal authority

Human economic requirement:

`M55_PAYOUT_COST_PASS_THROUGH_OBJECTIVE = HUMAN_APPROVED`

The goal is to avoid a business model where M55 permanently absorbs avoidable Creator bank-payout costs, especially for very small balances.

But:

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION = NOT_AUTHORIZED_PENDING_LEGAL_CLASSIFICATION`

Stripe billing and Creator fee policy are separate facts:

1. Under the M55-specific Stripe Support answer dated 2026-09-08, the observed Accounts v2 + Express Dashboard + Separate Charges and Transfers configuration uses platform-managed pricing and Connect charges are debited from the M55 platform Stripe balance.
2. Stripe's public Japan Connect pricing states that when the platform controls pricing, Stripe bills the platform and the platform can charge users fees in supported configurations.
3. Whether M55 may lawfully pass through a payout/service fee to a particular Creator depends on the exact contract/transaction classification and Japanese law.

If the Freelance Act applies, current JFTC Q&A states that making the freelancer bear the bank-transfer fee and deducting it from remuneration is a prohibited remuneration reduction regardless of agreement.

Therefore no implementation may silently convert a Stripe fee, bank fee or platform expense into a Creator deduction until R2-B2 closes the exact legal mechanics.

---

## G. Creator legal-relationship classification

R2-B2 must classify at minimum:

`CREATOR_RELATIONSHIP_CLASSIFICATION`

Candidate factual models:

- `AFFILIATE_ONLY` — voluntary link introduction; no specific work product/order;
- `SPONSORED_CREATOR` — M55 commissions a specific content/service/deliverable;
- any other legally supported classification identified by counsel.

M55 v1 target is `AFFILIATE_ONLY`, but the final legal conclusion must be based on contract and actual operation, not the label.

Official JFTC guidance describes an委託 as requesting another business to provide a specified service or create a specified information product; it also states that substantive involvement and transaction reality govern classification.

`COMMERCIAL_PRECEDENT_IS_NOT_LEGAL_SAFE_HARBOR = TRUE`

`FREELANCE_ACT_CATEGORICAL_AFFILIATE_EXCLUSION = NOT_CONFIRMED`

`AFFILIATE_SERVICE_CHARACTERIZATION = OPEN_PENDING_M55_FACT_PATTERN_CONFIRMATION`

Existing affiliate/creator platforms are implementation evidence, not proof that M55's exact contract is legally identical. A current major Japanese ASP (A8.net) expressly defines affiliate outcome compensation as consideration for advertising distribution; that commercial wording is evidence that "affiliate" is not, by name alone, outside the concept of a paid service.

---

## H. Tax / withholding fail-closed contract

M55 must not hard-code a universal withholding percentage for Affiliate Creator commission.

`UNIVERSAL_WITHHOLDING_RATE = PROHIBITED`

The National Tax Agency lists specific categories of remuneration subject to withholding. Exact treatment must be classified from the recipient and transaction facts.

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
- payout preference and next legal/contractual payout deadline where applicable;
- Stripe/KYC readiness;
- invoice/tax-profile status at an appropriate privacy-safe level;
- payout batch status;
- gross commission, legal tax deductions, any legally approved fee, and net payout;
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

Provider-independent implementation may proceed before all external classifications close, but it may not invent unresolved financial/legal semantics.

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
- Do not claim Affiliate v1 is definitively outside the Freelance Act until the exact relationship is professionally classified.
- Do not claim a competitor's operation proves M55 legality.
- Do not deduct a bank-transfer fee from remuneration when the Freelance Act applies.
- Do not hard-code universal 10.21% withholding.
- Do not treat Stripe pricing observed in 2026 as timeless.
- Do not use Creator inactivity or an economic threshold to violate an applicable payment deadline.
- Do not reduce valid earned commission merely because a Creator becomes highly successful.
- Do not move real Creator money until the activation blockers are closed.

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

### O-2. Required regulator-grade confirmation

Before using a legal conclusion that the Freelance Act does not apply — especially before deducting/passing through payout fees — M55 must obtain fact-pattern-specific confirmation.

Preferred primary-regulator route:

- JFTC official Freelance Act interpretation consultation desk;
- for Tokyo/Kanto, JFTC Freelance Transaction Fairness Office, 03-3581-5479 (telephone consultation);
- preserve the date, department, exact M55 fact pattern presented, exact answer, limits/caveats, and operator notes as dated evidence.

The fact pattern presented must be fixed and non-leading:

1. M55 sells its own digital reports.
2. Creator voluntarily joins an affiliate program.
3. M55 provides a unique URL.
4. Creator has no required post, deliverable, date, channel, hours, quota or exclusivity.
5. Creator may make zero introductions with no penalty.
6. Commission arises only on an eligible third-party purchase attributable to the URL.
7. No joining fee, inventory purchase, M55-product purchase or paid training is required to earn.
8. No Creator-recruitment/downline commission exists.
9. M55 only imposes compliance boundaries: law, Stripe rules, ad disclosure, claims policy, anti-fraud/self-referral.
10. Ask whether this exact relationship constitutes `役務の提供を委託` under Article 2(3), and separately what payout-fee rule follows from that classification.

`JFTC_M55_FACT_PATTERN_CONFIRMATION = REQUIRED_BEFORE_FREELANCE_ACT_EXCLUSION_IS_USED_AS_AUTHORITY`

`JFTC_M55_FACT_PATTERN_CONFIRMATION = REQUIRED_BEFORE_CREATOR_BANK_FEE_DEDUCTION_IF_EXCLUSION_IS_RELied_ON`

A written Japanese-law opinion may supplement regulator evidence; it does not permit changing the actual operating facts later without re-review.

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

But M55's **payer-side source-withholding** classification is not closed.

NTA rules require source withholding for certain remuneration to `外交員等`; NTA basic guidance also treats certain salespeople paid by volume/value as `外交員` remuneration. The research did not locate a current official NTA statement categorically including or excluding ordinary web affiliate commission.

`AFFILIATE_SOURCE_WITHHOLDING_SALES_AGENT_CLASSIFICATION = OPEN`

`NO_WITHHOLDING_ASSUMPTION = PROHIBITED`

`NO_UNIVERSAL_10_21_PERCENT_ASSUMPTION = PROHIBITED`

Before cash activation, M55 must obtain tax-specific confirmation for the exact Affiliate v1 contract. Preferred escalation:

- NTA Tax Consultation Center for source withholding; and
- where eligible and useful, NTA's pre-transaction written-answer procedure for a fixed future transaction with concrete documents.

`NTA_SOURCE_WITHHOLDING_CLASSIFICATION = REQUIRED_BEFORE_CASH_ACTIVATION`

### O-7. Consumption tax / invoice

Creator commission can be a taxable transaction depending on the recipient and transaction facts. M55 must retain entity/tax-residency/invoice-registration data and effective-dated accounting policy.

The 2026 invoice-transition percentages already recorded in §I remain dated policy evidence, not timeless constants.

### O-8. Payment Services Act

FSA describes a funds-transfer business as accepting a customer's request to move funds between distant persons and carrying out that transfer.

M55's target architecture is materially different: M55 pays **its own commission obligation** to its Creator and uses Stripe as the transfer/payout rail. M55 must not accept customer/Creator funds for onward remittance to third parties and must not represent the pending commission as escrow.

`M55_DOES_NOT_OFFER_THIRD_PARTY_REMITTANCE = TRUE`

`M55_DOES_NOT_OFFER_ESCROW = TRUE`

`PAYMENT_SERVICES_ACT_SELF_DEBT_PAYMENT_LOW_RISK_INFERENCE = TRUE_PENDING_FINAL_LEGAL_REVIEW`

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

The same rule applies to every competitor: **precedent informs design; regulator/counsel classification controls M55 legality.**

### O-11. Revised legal status matrix

| Area | Current M55 status | Required action |
|---|---|---|
| Freelance Act | **OPEN / NOT CATEGORICALLY EXCLUDED** | JFTC M55 fact-pattern consultation; counsel supplement if needed |
| Labor / employment | **LOW RISK BY DESIGN** | preserve no control/quotas/hours; re-review if operations change |
| 景品表示法 / stealth marketing | **APPLIES TO M55 ADVERTISER RESPONSIBILITY WHEN CONDITIONS MET** | disclosure + claims controls + monitoring |
| MLM / chain-sales | **LOW RISK BY DESIGN** | never add entry fee/required purchase/recruitment commission without re-review |
| Business-opportunity sales | **LOW RISK BY DESIGN** | no special financial burden as condition of earning |
| Creator income tax | **APPLIES** | Creator-facing tax notice; Creator remains responsible for own filing |
| M55 source withholding | **OPEN** | NTA/tax-adviser classification, including `外交員等` |
| Consumption tax / invoice | **APPLIES BY FACTS/STATUS** | tax profile + invoice verification + effective-dated policy |
| Payment Services Act | **LOW RISK INFERENCE UNDER OWN-DEBT + STRIPE RAIL** | no third-party remittance/escrow; final legal review |
| APPI / cookies | **APPLIES TO ATTRIBUTION DATA AS RELEVANT** | disclosure, minimization, retention and data-transfer controls |

This matrix is the current no-overclaim position until direct M55-specific regulator/tax evidence supersedes it.

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

Candidate payout equation:

```
NET_PAYOUT
  = GROSS_CREATOR_COMMISSION
  + append-only lawful adjustments
  - statutory withholding actually required
  - any separately lawful and Human-approved payout/service fee
```

The final fee term remains unresolved and cannot be activated by this equation alone.

`STATUTORY_WITHHOLDING_DOES_NOT_REDEFINE_COMMISSION_RATE = TRUE`

`NO_SILENT_CREATOR_DEDUCTION = TRUE`

### P-2. Creator income tax vs M55 payer duties

NTA's current filing guidance expressly lists affiliate income among income generally requiring filing as business income or miscellaneous income (business), depending on facts.

That is the Creator's own tax filing layer.

Separately, M55 has a payer-side withholding obligation **only if** the exact payment is legally within a source-withholding category. Current NTA materials list specific categories including `外交員等`, but the official research did not locate a categorical rule that ordinary web affiliate commission is always inside or always outside that category.

Therefore:

`AFFILIATE_SOURCE_WITHHOLDING_CLASSIFICATION = OPEN`

`NO_WITHHOLDING_ASSUMPTION = PROHIBITED`

`UNIVERSAL_WITHHOLDING_RATE = PROHIBITED`

`UNKNOWN_TAX_CLASSIFICATION_MUST_FAIL_CLOSED_BEFORE_LIVE_PAYOUT = TRUE`

If a payment is classified as `外交員等`, current NTA guidance uses a category-specific calculation with a monthly ¥120,000 deduction rule rather than a universal flat 10.21% on the whole amount. Do not generalize that formula to M55 until the exact classification closes.

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

### P-8. Payout fee guard remains unchanged

Stripe currently bills the M55 platform under the planned platform-managed configuration. Stripe's public pricing also states that platforms can charge users fees in supported configurations.

That technical ability is **not** sufficient legal authority to deduct a fee from Creator commission.

If the Freelance Act applies, current JFTC Q&A states that deducting bank-transfer fees from remuneration is prohibited regardless of agreement.

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION = NOT_AUTHORIZED_PENDING_LEGAL_CLASSIFICATION`

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

However:

`CREATOR_FEE_DEDUCTION_IMPLEMENTATION = STILL_NOT_AUTHORIZED`

Reason: M55 has not yet frozen the exact commercial fee term, disclosure mechanics, Stripe economic threshold/cadence, or other-law/contract analysis. R8 owns that implementation. The safe launch fallback remains M55-borne payout cost unless a separately lawful, clearly disclosed fee is later Human-approved.

### S-5. Closure status

`R2_B2_JAPAN_LEGAL_PAYMENT_DEADLINE = PUBLIC_EVIDENCE_CLOSURE_CANDIDATE`

`R2_B2_JAPAN_SOURCE_WITHHOLDING = PUBLIC_EVIDENCE_CLOSURE_CANDIDATE`

`R2_B2_PHONE_CONSULTATION = NOT_REQUIRED_BY_DEFAULT_CURRENT_FACTS`

Independent Grok/Codex review of PR #189 must confirm there is no overclaim. After that review, Control Tower may close the Japan legal/tax residual and request explicit Human R2 final acceptance.

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
