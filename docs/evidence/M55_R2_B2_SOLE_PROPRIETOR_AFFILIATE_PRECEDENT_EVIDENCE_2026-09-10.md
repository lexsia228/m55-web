# M55 R2-B2 — Sole Proprietor + Mature Affiliate Precedent Evidence — 2026-09-10

Status: PRIMARY-SOURCE + MARKET-PRECEDENT MAPPING

Human fact:
`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

## 1. Why this changes R2-B2

M55 payer-side legal/tax analysis must use individual-business rules, not corporation rules.

Two factual switches now control the residual branches:

`M55_USES_EMPLOYEES_FOR_FREELANCE_ACT = UNKNOWN_PENDING_HUMAN_FACT_CONFIRMATION`

`M55_IS_SALARY_PAYER_FOR_WITHHOLDING = UNKNOWN_PENDING_HUMAN_FACT_CONFIRMATION`

## 2. NTA source-withholding rule for individual payer

NTA No.2793:
https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2793.htm

Current rule summarized:
- a person paying covered remuneration normally withholds;
- but when the payer is an **individual** who is **not a payer of salaries**, source withholding is generally not required, except specified cases such as hostess remuneration;
- if the individual does pay salaries, the normal withholding classification for covered remuneration matters.

M55 consequence:

`SOURCE_WITHHOLDING_DEPENDS_FIRST_ON_M55_SALARY_PAYER_STATUS = TRUE`

Do not spend time classifying ordinary affiliate commission as `外交員等` if the individual-payer/no-salary-payer exception already resolves the payer obligation for the intended launch facts.

## 3. JFTC rule for sole-proprietor ordering business

JFTC Q&A:
https://www.jftc.go.jp/fllaw_limited/fllaw_qa.html

JFTC current special site:
https://www.jftc.go.jp/freelancelaw_2025/index.html

Current role split:
- ordering sole proprietor without employees = `業務委託事業者`; if the transaction is covered, transaction terms must be disclosed;
- ordering sole proprietor using employees = may be `特定業務委託事業者`, triggering additional duties.

JFTC Q9 expressly states that an ordering business without employees does not later retroactively gain the additional `特定業務委託事業者` obligations for an already-made delegation merely because it later starts using employees; transaction-condition disclosure still applies.

M55 consequence:

`FREELANCE_ACT_PAYMENT_DEADLINE_DEPENDS_FIRST_ON_M55_EMPLOYEE_STATUS = TRUE`

## 4. Mature affiliate market pattern

### A8.net
- outcome confirmation before payout;
- monthly aggregation;
- 1,000 / 5,000 / carry-over payout modes;
- scheduled later bank payout;
- reports.

Sources:
https://support.a8.net/as/payment/
https://www.a8.net/campus/campus-blog/1175-transfer.html

### ValueCommerce
- advertiser approval before payout;
- 1,000-yen threshold/carry-over;
- later scheduled payout;
- no bank transfer fee;
- invoice-aware payout report.

Sources:
https://www.valuecommerce.ne.jp/stepup/guide/comission/
https://help.valuecommerce.ne.jp/aff/transactions/comission/02/

### Amazon Associates Japan
- minimum bank-transfer threshold;
- automatic carry-over;
- payout-method/security controls.

Sources:
https://affiliate.amazon.co.jp/help/node/topic/GP8Z3AZ27ZFHTEUL
https://affiliate.amazon.co.jp/help/node/topic/GKDG94FQSRXSJCGK

## 5. M55 synthesis

Ordinary target:

```
affiliate link
-> conversion recorded
-> validation/refund/fraud review
-> commission approved/PAYABLE
-> aggregate balance
-> threshold/cadence policy
-> batch payout
-> statement/history
```

This is not a novel M55 invention.

`AFFILIATE_LIFECYCLE_MARKET_PRECEDENT = STRONG`

`M55_COPYRIGHT_EXPRESSION_REMAINS_ORIGINAL = REQUIRED`

`COMPETITOR_TAX_OR_FEE_POLICY_IS_NOT_M55_LEGAL_AUTHORITY = TRUE`

## 6. Efficient closure decision tree

A. M55 uses no employees + pays no salaries:
- use JFTC no-employee ordering-business branch;
- use NTA individual/no-salary-payer branch;
- no default phone call;
- preserve transaction terms, payout transparency, tax profile and safe accounting.

B. M55 uses employees OR pays salaries:
- only the triggered branch gets bounded JFTC/NTA/tax-adviser confirmation.

C. Unclear facts:
- Human answers the factual switch first; do not perform broad legal research.

`EVIDENCE_FIRST_BEFORE_PHONE = TRUE`
