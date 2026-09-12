# M55 Operator / Business Status SSOT

Status: **ACTIVE / HUMAN-FROZEN OPERATING FACTS**

Human freeze date: **2026-09-10**

This SSOT owns durable M55 operator-form, staffing, payroll, pre-revenue, bookkeeping and compliance-trigger facts that can change legal/tax/provider obligations.

It does **not** own CURRENT/NEXT. Sole executable authority remains `docs/ssot/M55_EXECUTION_STATE.json`.

## A. Current Human-frozen facts

`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

`M55_BUILD_MODEL = SOLO_BUILD`

`M55_EMPLOYEES = NONE`

`M55_PAYS_SALARY_OR_WAGES = FALSE`

`M55_IS_SALARY_PAYER_FOR_WITHHOLDING = FALSE`

`M55_CURRENT_BUSINESS_REVENUE_STATUS = PRE_REVENUE_ZERO_BUSINESS_REVENUE`

`M55_CURRENT_OPERATING_PHASE = PRE_REVENUE_DEVELOPMENT`

"Zero business revenue" is an M55 business-state fact. It must not be generalized into claims about the Human's unrelated personal income, assets, tax liability or social-insurance status.

`PUBLIC_SALES_AVAILABILITY_IS_NOT_INFERRED_FROM_REVENUE_STATUS = TRUE`

A public page, Stripe account, or purchase path may exist before the first recognized M55 business revenue. Revenue status is not authority for live-product status.

## B. Tax commencement / opening-date firewall

Current official NTA guidance:
- a sole proprietor starting a business files the individual-business opening/closure notification by the income-tax return deadline for the year in which the business-start fact occurred;
- a blue-return application is generally due by March 15 of the year, or within two months after starting a business on/after January 16.

Important:

`FIRST_REVENUE_DATE_IS_NOT_AUTOMATIC_BUSINESS_START_DATE = TRUE`

Development/preparation activity can precede first revenue. M55 must not invent a business-start date from "first sale".

Current administrative facts not yet frozen in repo:

`M55_TAX_BUSINESS_START_DATE = UNKNOWN_PENDING_HUMAN_ADMIN_RECORD`

`M55_OPENING_NOTIFICATION_STATUS = UNKNOWN_PENDING_HUMAN_ADMIN_RECORD`

`M55_BLUE_RETURN_APPROVAL_STATUS = UNKNOWN_PENDING_HUMAN_ADMIN_RECORD`

These are **administrative fact checks**, not Creator Revenue architecture blockers.

Trigger:
- before the next applicable income-tax filing;
- before relying on a blue-loss carryforward;
- before changing any accounting policy based on a presumed opening date.

## C. Pre-revenue development / loss preservation

Zero revenue does **not** mean bookkeeping can be ignored.

Current NTA guidance:
- persons carrying on a business-income activity are subject to bookkeeping/document retention even when an income-tax return is not otherwise required;
- business-vs-business-related-miscellaneous-income classification remains a social-convention/fact test;
- maintaining transaction books/documents is an important factor in business-income classification;
- persistent small revenue or persistent losses without concrete profit-improvement activity can require individual classification;
- blue-return business losses may generally be carried forward for three years when the statutory requirements and filings are satisfied.

Therefore:

`PRE_REVENUE_BOOKKEEPING_REQUIRED = TRUE`

`PRE_REVENUE_COST_EVIDENCE_RETENTION_REQUIRED = TRUE`

`BUSINESS_INCOME_CLASSIFICATION_IS_FACT_DEPENDENT_NOT_AUTOMATIC = TRUE`

`ZERO_REVENUE_DOES_NOT_MEAN_NO_RETURN_IS_ALWAYS_SAFE = TRUE`

`BLUE_LOSS_CARRYFORWARD_REQUIRES_ELIGIBILITY_AND_REQUIRED_FILINGS = TRUE`

M55 should preserve evidence of genuine commercialization activity:
- product development;
- production/publication work;
- Stripe/provider preparation;
- pricing/product definition;
- customer-sale readiness;
- Creator Revenue planning;
- launch/revenue-safety work;
- actual business expenses and electronic receipts.

This is evidence of business activity, not a guarantee of tax classification.

### Development / opening costs

NTA materials recognize opening costs and certain development costs as deferred assets that can have specific amortization treatment. Ordinary expenses, fixed assets, software/intangibles and deferred assets can have different rules.

`DEVELOPMENT_COST_TAX_CLASSIFICATION = FACT_DEPENDENT`

`DO_NOT_AUTO_EXPENSE_ALL_DEVELOPMENT_COSTS = TRUE`

`DO_NOT_AUTO_CAPITALIZE_ALL_DEVELOPMENT_COSTS = TRUE`

Keep source documents and classify at filing/accounting time.

## D. Books / electronic transaction retention

For business-income activity, preserve required books and business documents under the current NTA retention rules.

Baseline:
- legal books: generally 7 years;
- other books/documents: preserve for the applicable statutory period;
- electronic transaction data corresponding to invoices, receipts, contracts, estimates, orders and similar documents must be retained electronically when exchanged electronically.

`ELECTRONIC_TRANSACTION_DATA_RETENTION_REQUIRED = TRUE`

`PRINT_ONLY_IS_NOT_SUFFICIENT_FOR_REQUIRED_ELECTRONIC_TRANSACTION_DATA = TRUE`

M55 must retain, where applicable:
- Stripe invoices/fee statements;
- Vercel/Supabase/Clerk/OpenAI/other vendor invoices and receipts;
- domain/hosting/tool receipts;
- contractor/Creator agreements;
- Creator payout/accounting statements;
- electronic purchase/sale evidence.

Exact retention format/process may use a simple compliant small-business method; enterprise tooling is not required merely because M55 is digital-first.

## E. Consumption tax / invoice status

Current NTA rule:
- a new sole proprietor generally has no base period and is ordinarily consumption-tax exempt in the opening year and next year, subject to statutory exceptions;
- invoice registration is voluntary;
- a previously exempt business that registers as a qualified invoice issuer becomes subject to consumption-tax filing/payment rules for the applicable period;
- current 2026 reform contains time-limited special rules for individual businesses that became taxable due to invoice registration.

Therefore:

`ZERO_REVENUE_DOES_NOT_REQUIRE_INVOICE_REGISTRATION = TRUE`

`INVOICE_REGISTRATION_MUST_NOT_BE_AUTOMATIC = TRUE`

`M55_CONSUMPTION_TAX_STATUS = UNKNOWN_PENDING_HUMAN_ADMIN_RECORD`

`M55_INVOICE_REGISTRATION_STATUS = UNKNOWN_PENDING_HUMAN_ADMIN_RECORD`

Do not register or deregister merely to simplify Creator Revenue. Decide from M55's actual customer/transaction mix and current tax status.

Creator invoice-registration status remains a separate R8/accounting input.

Re-review triggers:
- M55 registers/cancels invoice status;
- M55 becomes a consumption-tax taxable business by law/election;
- base-period/specified-period thresholds become relevant;
- tax reform changes.

## F. Freelance Act — current ordering-business role

Current Human facts: sole proprietor, no employees.

Current JFTC role split:
- M55 can be a broad `業務委託事業者` if it makes a covered delegation;
- because M55 uses no employees, M55 is not currently a `特定業務委託事業者`;
- when a transaction is covered, Article 3 transaction-condition disclosure remains required;
- the additional specified-orderer duties (including the 60-day payment-deadline framework) are not the current M55 branch.

`M55_CURRENT_JFTC_ROLE_IF_COVERED_DELEGATION = 業務委託事業者_NOT_特定業務委託事業者`

`FREELANCE_ACT_ARTICLE_3_DISCLOSURE = REQUIRED_IF_COVERED_TRANSACTION`

`FREELANCE_ACT_60_DAY_PAYMENT_DEADLINE = NOT_APPLICABLE_TO_CURRENT_M55_IF_AFFILIATE_IS_COVERED_DELEGATION`

Creator Program Truth / Terms should nevertheless provide explicit:
- parties;
- service/affiliate relationship;
- commission calculation;
- payment timing;
- refund/reversal treatment;
- applicable payment method;
- policy version;
- dispute/support route.

Re-review immediately if M55 starts "using employees" under the then-current JFTC definition or if Affiliate-first becomes a sponsored/commissioned deliverable model.

## G. Payer-side source withholding — current payer fact

Current NTA No.2793:
- an individual payer who is not a payer of salaries generally need not withhold on remuneration/fees, except specified cases such as hostess remuneration;
- blue-return family-employee salary counts as salary for this purpose.

Current Human fact:
`M55_IS_SALARY_PAYER_FOR_WITHHOLDING = FALSE`

Therefore:

`M55_CURRENT_SOURCE_WITHHOLDING_ON_JP_RESIDENT_ORDINARY_AFFILIATE_COMMISSION = NOT_REQUIRED_UNDER_CURRENT_PAYER_FACTS`

This is a **payer-fact exception for the current Japan-resident ordinary Affiliate payout branch**, not a timeless classification that affiliate commission can never be `外交員等`. Nonresident/foreign-recipient payouts remain a separate tax/treaty branch.

`NO_UNIVERSAL_WITHHOLDING_RATE = PROHIBITED`

Re-review before the next cash payout if M55 starts paying any salary/wages or becomes another entity form.

## H. Labour insurance / employment obligations

Current Human fact: zero employees.

Current MHLW rule:
- employing even one worker generally triggers labour-insurance/employment-insurance employer procedures as applicable.

Current M55:

`M55_EMPLOYER_LABOUR_INSURANCE_OBLIGATION = NOT_TRIGGERED_ZERO_EMPLOYEES`

Re-review trigger:

`FIRST_EMPLOYEE_HIRE = LABOUR_INSURANCE_AND_PAYROLL_REVIEW_TRIGGER`

Do not infer from "contractor" labels. If a worker is functionally an employee, labour-law classification follows the actual relationship.

## I. Employer health insurance / employees' pension

Current M55 has zero employees, so no employee-employer social-insurance establishment duty is triggered by current staffing.

`M55_EMPLOYER_HEALTH_PENSION_ESTABLISHMENT_OBLIGATION = NOT_TRIGGERED_ZERO_EMPLOYEES`

Current law generally makes certain individual establishments with five or more regular employees compulsory, and the 2025 pension reform expands the industry scope from October 2029, subject to transitional rules.

Re-review triggers:
- first employee: track headcount/status;
- fifth regular employee;
- October 2029 law transition if M55 has employees;
- entity conversion to corporation (corporate establishments are treated differently).

The Human's personal National Health Insurance / pension enrollment and personal premiums are outside this repo SSOT and must not be inferred or persisted here.

## J. Personal information protection

Zero revenue and zero employees do **not** create an APPI exemption.

Current PPC guidance:
- an individual or small business using a personal-information database for business can be a personal-information-handling business operator;
- number of persons in the database does not create a small-volume exemption;
- security measures should be proportionate to business size, nature, data volume and risk.

`APPI_SMALL_SOLO_BUSINESS_EXEMPTION = FALSE`

`APPI_APPLIES_WHEN_M55_USES_PERSONAL_INFORMATION_DATABASE_FOR_BUSINESS = TRUE`

Before/when collecting customer or Creator personal data, M55 must retain:
- specific purposes of use;
- security controls;
- vendor/processor oversight where required;
- access/deletion/disclosure workflows as applicable;
- breach response.

Creator/customer My Number remains prohibited unless a confirmed statutory tax workflow requires it.

## K. Specified Commercial Transactions Act / consumer sale

Zero business revenue is **not** an exemption once M55 advertises and accepts applications for paid online services.

Current CAA guidance:
- paid information services can be communication sales;
- landing/sales pages that allow application are advertising under the Act;
- individual businesses must provide required seller identity/contact/price/payment/provision/refund/cancellation information, subject to the statutory request-based omission mechanism;
- a mere shop/site name is not sufficient as the seller's legal name;
- a qualifying platform/virtual-office address/phone can be used only if the official conditions are actually satisfied.

`PRE_REVENUE_STATUS_DOES_NOT_WAIVE_TOKUSHOHO = TRUE`

`TOKUSHOHO_REQUIRED_BEFORE_OR_WITH_PAID_SALE_SURFACE = TRUE`

`SOLE_PROPRIETOR_SELLER_NAME_MUST_FOLLOW_CAA_RULE = TRUE`

`TOKUSHOHO_OMISSION_OR_VIRTUAL_OFFICE_USE_REQUIRES_EXACT_CAA_CONDITIONS = TRUE`

Re-review triggers:
- new paid product;
- price/billing/refund/delivery change;
- seller contact/address method change;
- subscription/recurring billing introduction;
- entity conversion.

## L. Stripe / provider identity

Current Stripe Japan guidance:
- sole proprietors should register using the individual's legal/personal name rather than merely a trade name;
- live activation requires a business profile, KYC information, bank account and Tokushoho disclosure;
- provider information must stay accurate.

`STRIPE_M55_BUSINESS_TYPE = SOLE_PROPRIETOR`

`STRIPE_SOLE_PROPRIETOR_LEGAL_NAME_ALIGNMENT_REQUIRED = TRUE`

`PRE_REVENUE_STATUS_MUST_NOT_BE_MISREPRESENTED_TO_PROVIDER = TRUE`

Revenue amount itself is not treated here as a provider prohibition. Provider supportability remains based on the actual current M55 business model and account review.

Re-review triggers:
- entity conversion;
- seller/representative identity change;
- bank account change;
- business description/product category change;
- Stripe requirement update.

## M. Local tax / jurisdiction-specific administration

National rules do not fully answer prefectural/municipal opening notifications or local individual-business-tax administration.

Example: Tokyo currently requires a sole proprietor starting business in Tokyo to file an individual-business-tax start notification within 15 days. Other jurisdictions can differ.

Therefore:

`LOCAL_TAX_JURISDICTION_SPECIFIC_REVIEW_REQUIRED = TRUE`

`M55_LOCAL_BUSINESS_START_NOTIFICATION_STATUS = UNKNOWN_PENDING_JURISDICTION_AND_HUMAN_ADMIN_RECORD`

Do not infer the Human's home or tax jurisdiction from chat metadata.

This is an operator-administration task, not a Creator Revenue architecture blocker.

## N. Current open administrative facts

These require Human records, not more broad web research:

- actual tax business-start date;
- national opening-notification filed/not filed;
- blue-return approval status;
- M55 consumption-tax status;
- M55 invoice-registration status;
- local-tax jurisdiction and local opening-notification status.

`OPERATOR_ADMIN_RECORD_RECONCILIATION_REQUIRED = TRUE`

No provider/DB/runtime mutation is needed to resolve these.

## O. Re-review trigger registry

Any of the following invalidates part of this SSOT and requires bounded re-review before the affected operation continues:

1. `FIRST_EMPLOYEE_HIRE`
2. `FIRST_SALARY_OR_WAGE_PAYMENT`
3. `FIFTH_REGULAR_EMPLOYEE`
4. `ENTITY_CONVERSION_FROM_SOLE_PROPRIETOR`
5. `M55_INVOICE_REGISTRATION_CHANGE`
6. `M55_CONSUMPTION_TAX_STATUS_CHANGE`
7. `FIRST_M55_BUSINESS_REVENUE`
8. `M55_BUSINESS_START_DATE_ADMIN_RECONCILED`
9. `SPONSORED_CREATOR_OR_FIXED_DELIVERABLE_MODEL`
10. `NONRESIDENT_CREATOR_CASH_PAYOUT`
11. `NEW_PAID_PRODUCT_OR_RECURRING_BILLING`
12. `SELLER_IDENTITY_ADDRESS_CONTACT_METHOD_CHANGE`
13. `PERSONAL_DATA_COLLECTION_SCOPE_EXPANDS_MATERIALLY`
14. `STRIPE_BUSINESS_TYPE_OR_ACCOUNT_REQUIREMENT_CHANGE`
15. `LOCAL_TAX_JURISDICTION_CHANGE`
16. `MATERIAL_JAPAN_LAW_OR_OFFICIAL_GUIDANCE_CHANGE`
17. `2029_SOCIAL_INSURANCE_TRANSITION_WITH_EMPLOYEES`

`NO_REVIEW_REPLAY_WITHOUT_TRIGGER = TRUE`

A trigger reopens only the affected legal/tax/ops branch; it does not reopen unrelated CLOSED GREEN product gates.
