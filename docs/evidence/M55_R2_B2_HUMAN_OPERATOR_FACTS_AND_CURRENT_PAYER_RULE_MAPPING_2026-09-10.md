# M55 R2-B2 — Human Operator Facts + Current Payer Rule Mapping — 2026-09-10

Status: HUMAN-FROZEN FACTS + PRIMARY-SOURCE APPLICABILITY MAPPING

## Human-frozen M55 facts

`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

`M55_BUILD_MODEL = SOLO_BUILD`

`M55_EMPLOYEES = NONE`

`M55_PAYS_SALARY_OR_WAGES = FALSE`

`M55_IS_SALARY_PAYER_FOR_WITHHOLDING = FALSE`

These facts replace any stale generic "company/corporation" assumption.

## JFTC mapping

Official sources:
- https://www.jftc.go.jp/fllaw_limited/fllaw_qa.html
- https://www.jftc.go.jp/freelancelaw_2025/

Current JFTC Q2:
- individual ordering business using employees can be a `特定業務委託事業者`;
- `業務委託事業者` is the broader ordering-business category.

Current JFTC Q3:
- "uses employees" generally means a worker with at least 20 scheduled hours/week and expected employment of at least 31 days.

Current JFTC Q9:
- an ordering business without employees does not have the `特定業務委託事業者` duties for the delegation;
- Article 3 transaction-condition disclosure still applies if the transaction is covered.

M55 uses no employees.

Mapping:

`M55_CURRENT_JFTC_ROLE_IF_COVERED_DELEGATION = 業務委託事業者_NOT_特定業務委託事業者`

`M55_CURRENT_FREELANCE_ACT_DUTY = ARTICLE_3_DISCLOSURE_IF_COVERED_TRANSACTION`

`M55_CURRENT_FREELANCE_ACT_60_DAY_DEADLINE = NOT_APPLICABLE_IF_AFFILIATE_IS_COVERED_DELEGATION`

This does not claim the Affiliate relationship is definitively a covered `業務委託`; M55 will provide clear Creator terms regardless.

## NTA mapping

Official source:
https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2793.htm

NTA No.2793 states:
- an individual remuneration payer who is not a payer of salaries generally does not have to withhold on covered remuneration/fees;
- specified exceptions exist, including hostess remuneration;
- salary includes blue-return family-employee salary (`青色専従者給与`).

M55 pays no salary/wages.

Mapping:

`M55_CURRENT_NTA_PAYER_EXCEPTION = INDIVIDUAL_NO_SALARY_PAYER`

`M55_CURRENT_SOURCE_WITHHOLDING_ON_JP_RESIDENT_ORDINARY_AFFILIATE_COMMISSION = NOT_REQUIRED`

This is not a timeless legal statement about affiliate commission. It is limited to the current Japan-resident ordinary Affiliate payout branch. Nonresident/foreign-recipient payouts remain separately classified. If M55 becomes a salary payer, the payment category (including possible `外交員等`) must be classified before the next payout.

## R2-B2 impact

The previously open questions:
- Freelance Act 60-day payment compatibility;
- individual Creator payer-side source withholding;

are now **public-evidence closure candidates under current M55 operating facts**.

Still required:
- PR #189 Grok/Codex independent review;
- clear Creator terms / Program Truth;
- consumption-tax/invoice profile handling;
- R8 fee/threshold/cadence implementation;
- explicit Human R2 final acceptance.

No phone consultation is required by default unless the independent review finds an unresolved authority issue or the frozen facts change.
