# M55 Creator Affiliate Benchmark / Target Architecture SSOT

Status: **ACTIVE / HUMAN-APPROVED BENCHMARK FREEZE (2026-09-09)**

Implementation status: **CREATOR CASH INFRASTRUCTURE NOT IMPLEMENTED**

Sole executable CURRENT/NEXT authority remains `docs/ssot/M55_EXECUTION_STATE.json`.

This SSOT does not authorize Production cash activation, connected-account creation, Stripe mutation, DB migration, or roadmap reordering. It freezes which mature commercial patterns M55 will reuse and which architecture M55 will build.

Parent Creator Revenue authority: `docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md`

Human-frozen operating-model delta: `docs/ssot/M55_CREATOR_AFFILIATE_OPERATING_MODEL_SSOT.md`

Tax/legal fail-closed authority: `docs/ssot/M55_CREATOR_AFFILIATE_STRIPE_TAX_LEGAL_SSOT.md`

Benchmark composition evidence: `docs/evidence/M55_CREATOR_AFFILIATE_BENCHMARK_COMPOSITION_EVIDENCE_2026-09-09.md`

Benchmark-independence / Creator-acceptance evidence: `docs/evidence/M55_CREATOR_AFFILIATE_BENCHMARK_INDEPENDENCE_AND_CREATOR_ACCEPTANCE_EVIDENCE_2026-09-09.md`

Compliance/payout state authority: `docs/ssot/M55_CREATOR_COMPLIANCE_AND_PAYOUT_AUTOMATION_SSOT.md`

---

## A. Human decision

`AFFILIATE_BENCHMARK_SHORTLIST_V1 = FROZEN_SIX`

`TARGET_AFFILIATE_ARCHITECTURE = M55_NATIVE_CONTROL_PLANE_PLUS_STRIPE_MONEY_RAIL`

`THIRD_PARTY_AFFILIATE_SAAS_RUNTIME_DEPENDENCY_V1 = NONE_BY_DEFAULT`

M55 is not inventing a new affiliate business model. The target is a conventional direct single-tier affiliate system:

1. approved Creator receives a unique M55 referral URL;
2. Creator voluntarily shares it;
3. customer visits through the URL;
4. M55 preserves attribution evidence;
5. customer pays M55 through Stripe;
6. M55 observes the paid/refund/chargeback lifecycle;
7. M55 creates and reviews commission;
8. valid commission becomes `COMMISSION_PAYABLE`;
9. payable amounts are aggregated into a **derived Creator payable-balance projection** from the append-only commission ledger and payout/adjustment records;
10. Creator sees the balance/status in M55;
11. payout is batched according to the final threshold/cadence/legal rules;
12. Stripe Connect moves approved funds to the Creator payout rail;
13. provider events reconcile back into M55.

The differentiator is not the affiliate mechanism itself. M55 differentiates through product, conversion, high Creator economics, transparent accounting, machine-first compliance, Creator UX, and reliable payout operation.

`CREATOR_PAYABLE_BALANCE_IS_DERIVED_PROJECTION = TRUE`

`MUTABLE_CREATOR_WALLET_BALANCE_AS_FINANCIAL_AUTHORITY = PROHIBITED`

The append-only commission ledger plus explicit payout/adjustment records are financial authority. Any displayed/cacheable payable balance is a recomputable projection and may not become an independently mutable source of truth.

---

## B. Benchmark selection method

A benchmark is Core only when it materially covers one or more of:

- native or deep Stripe payment integration;
- referral URL / code attribution;
- commission generation and adjustment;
- refund/chargeback/fraud handling;
- balance/threshold/batch payout;
- Creator self-service analytics;
- Japan affiliate payout operations;
- Japan tax/invoice reporting;
- Japanese fortune/diagnostic/digital-report commercial similarity.

Redundant products are not added merely to increase the comparison count.

`BENCHMARK_COUNT_IS_NOT_A_QUALITY_METRIC = TRUE`

`NO_REPEAT_BROAD_COMPETITOR_SWEEP_WITHOUT_INVALIDATOR = TRUE`

---

## C. Frozen Core Six

### C-1. FirstPromoter — payout / fraud / operational scaling owner

**Why selected**

FirstPromoter is a mature Stripe-connected affiliate platform whose current product documents:

- referral-link/cookie attribution;
- Stripe sales tracking;
- one commission record per conversion with source/audit data;
- self-referral and fraud checks before commission;
- configurable review of suspicious/paid traffic;
- approved commissions accumulating into affiliate balance;
- threshold and eligibility controls;
- one-click affiliate payouts from the business's Stripe balance;
- affiliates connecting/verifying their own payout details through Stripe;
- batch payout scaling from small programs to thousands.

**M55 adopts**

- `UNIQUE_REFERRAL_TOKEN`;
- immutable source/audit evidence on attribution decisions;
- self-referral check before commission eligibility;
- objective flag reason codes;
- large/unusual automatic-approval cap or equivalent review trigger;
- payout balance aggregation;
- threshold/eligibility gate;
- affiliate self-onboarding to payout provider;
- batch payout rather than per-sale transfer;
- payout destination change / identity hardening.

**M55 does not copy**

- FirstPromoter as M55 accounting SSOT;
- its exact cookie window;
- its exact NET terms;
- its vendor-specific state names;
- its tax assumptions;
- automatic approval limits without M55 evidence.

**Authority role**

`BENCHMARK_FIRSTPROMOTER_ROLE = STRIPE_PAYOUT_FRAUD_AND_SCALE_PATTERN`

Current official evidence:
- https://firstpromoter.com/features/affiliate-payout
- https://firstpromoter.com/features/tracking
- https://help.firstpromoter.com/en/articles/8971513-how-to-pay-your-promoters
- https://help.firstpromoter.com/en/articles/13772161-fraud-protection-settings-in-firstpromoter
- https://docs.firstpromoter.com/how-it-works

---

### C-2. Rewardful — Stripe event / commission-adjustment / simple portal owner

**Why selected**

Rewardful is designed for affiliate/referral programs connected directly to Stripe. Current documentation shows:

- personalized referral links;
- visitor/lead/conversion tracking;
- Stripe event/webhook observation;
- commissions changing when billing events change, including refunds/cancellations;
- personalized affiliate dashboard for links/stats;
- payout thresholds in Rewardful's own affiliate program;
- payout tooling around Stripe-derived commission data.

**M55 adopts**

- Stripe event observation as the purchase truth input;
- referral identity carried through the purchase path;
- automatic commission adjustment command on refund/cancellation;
- simple Creator-facing link/stats surface;
- separation between transaction observation and later payout.

**M55 does not copy**

- Rewardful as runtime dependency by default;
- Rewardful commission database as M55 ledger;
- its 60-day cookie window;
- its $50 threshold;
- recurring-SaaS assumptions not applicable to M55 buy-once products.

**Authority role**

`BENCHMARK_REWARDFUL_ROLE = STRIPE_ATTRIBUTION_EVENT_AND_ADJUSTMENT_PATTERN`

Current official evidence:
- https://help.rewardful.com/en/articles/14852640-integration-with-stripe-payment-links-method-a
- https://help.rewardful.com/en/articles/6684154-integration-with-stripe-payment-links-method-b
- https://www.rewardful.com/articles/how-rewardful-pays-affiliate-commissions
- https://www.rewardful.com/rewardful-affiliate-program-get-started

---

### C-3. Shopify Collabs — hold / refund / dispute / Creator analytics owner

**Why selected**

Shopify Collabs demonstrates a large-scale Creator affiliate lifecycle:

- unique affiliate links or discount codes;
- Creator sales analytics;
- commission marked Pending during a merchant-selected holding period;
- holding period configurable 1–90 days, with 30-day default;
- canceled/refunded orders automatically cancel Pending commission;
- merchant dispute while commission is Pending;
- payout schedule/threshold;
- Creator-side payout activation;
- visits, sales, conversion and earned commission visible to Creator.

**M55 adopts**

- purchase commission begins Pending rather than paid;
- objective refund/cancellation reversal before PAYABLE;
- explicit dispute / discrepancy path;
- Creator analytics: visits, conversions, sales, earned;
- visible upcoming/pending payout;
- scheduled payout with threshold/batching.

**M55 does not copy**

- Hyperwallet;
- Shopify billing/tax handling;
- $25 threshold;
- twice-monthly cadence;
- open-access Creator enrollment;
- Shopify's exact dispute semantics.

**Authority role**

`BENCHMARK_SHOPIFY_COLLABS_ROLE = HOLD_REFUND_DISPUTE_AND_CREATOR_ANALYTICS_PATTERN`

Current official evidence:
- https://help.shopify.com/ja/manual/promoting-marketing/collabs/merchants/payments
- https://help.shopify.com/ja/manual/promoting-marketing/collabs/creators/payments
- https://help.shopify.com/ja/manual/promoting-marketing/collabs/merchants/managing-creators

---

### C-4. A8.net — Japan payout preference / threshold / carry-over owner

**Why selected**

A8.net is a mature Japanese affiliate operating precedent. Current help documents:

- 5,000-yen payout mode;
- 1,000-yen payout mode;
- carry-over mode;
- Creator/media member requesting next payout while in carry-over once balance reaches 1,000 yen;
- payout of the accumulated balance rather than arbitrary partial payout;
- bank-transfer fees currently borne by the media member and deducted from outcome compensation.

**M55 adopts as pattern**

- Creator-selectable payout preference;
- economic threshold;
- carry-over/aggregation concept;
- full-balance payout rather than arbitrary micro-withdrawals by default;
- clear fee/payout disclosure;
- payout preference stored as durable state.

**M55 must not copy blindly**

- indefinite carry-over if an applicable payment deadline forbids it;
- A8's exact 1,000/5,000-yen thresholds;
- A8's exact transfer fees;
- Creator-fee deduction before M55 legal classification is closed.

**Authority role**

`BENCHMARK_A8_ROLE = JAPAN_PAYOUT_THRESHOLD_CARRYOVER_AND_PREFERENCE_PATTERN`

Current official evidence:
- https://support.a8.net/as/payment/
- https://support.a8.net/a8/as/faq/2013/09/post_168.html
- https://support.a8.net/a8/as/faq/2008/05/as_3.html

---

### C-5. ValueCommerce — Japan approval / payment / reporting / invoice owner

**Why selected**

ValueCommerce provides a mature Japan affiliate accounting precedent:

- outcome compensation paid for actions through affiliate advertising;
- order approval before payment;
- payment on the 15th of the month two months after approval;
- minimum payout amount of 1,000 yen;
- balances below threshold carry forward;
- aggregation across sites under the same contractor ID;
- payout reports;
- invoice-system-aware payment statement/tax calculation;
- ValueCommerce currently bears bank-transfer fees.

**M55 adopts**

- separate generated / reviewed / approved / paid stages;
- approved-balance aggregation;
- payout report/statement;
- invoice/tax status in the payment accounting layer;
- tax calculation effective at payout/accounting stage rather than hidden inside commission rate;
- durable report export for tax/reconciliation.

**M55 does not copy**

- the exact 1,000-yen threshold;
- exact payment date;
- ValueCommerce's fee-bearing policy;
- its advertiser/site contractual structure.

**Authority role**

`BENCHMARK_VALUECOMMERCE_ROLE = JAPAN_APPROVAL_PAYMENT_REPORT_AND_INVOICE_PATTERN`

Current official evidence:
- https://help.valuecommerce.ne.jp/aff/transactions/comission/01/
- https://help.valuecommerce.ne.jp/aff/transactions/comission/02/
- https://help.valuecommerce.ne.jp/aff/transactions/finance/01/
- https://help.valuecommerce.ne.jp/aff/transactions/finance/04/

---

### C-6. 開運メーカー — Japan fortune / digital-report / affiliate commercial owner

**Why selected**

This is the closest Japanese product-category precedent identified in the bounded benchmark:

- Japanese fortune/diagnostic service;
- paid premium detailed reports;
- Stripe processing stated in current terms/pricing;
- affiliate program;
- free affiliate registration;
- 20% outcome commission;
- dedicated referral links;
- links shareable on SNS/blog;
- realtime dashboard for clicks, conversions and reward amounts.

It proves the commercial combination `fortune/digital report + Stripe + referral link + affiliate commission + dashboard` is not a novel M55 invention.

**M55 adopts**

- keep the Creator proposition simple;
- dedicated shareable URL;
- free participation for approved Creators;
- realtime click/conversion/reward visibility;
- product-category-appropriate social distribution;
- Creator value proposition centered on outcome commission.

**M55 does not copy**

- 20% rate;
- its product claims;
- its legal/tax assumptions;
- its exact payout mechanics;
- its open/approval policy.

**Authority role**

`BENCHMARK_KAIUN_MAKER_ROLE = JAPAN_FORTUNE_DIGITAL_REPORT_AFFILIATE_COMMERCIAL_PRECEDENT`

Current official evidence:
- https://makers.tokyo/fortune/affiliate
- https://makers.tokyo/fortune/pricing
- https://makers.tokyo/fortune/terms

---

## D. Secondary comparators — evidence only

The following are intentionally **not** architecture owners.

### Hint

Useful for:
- Japan digital-content affiliate commission;
- 10–50% configurable rate precedent;
- platform fee on affiliate reward;
- 5,000-yen withdrawal threshold;
- withdrawal fee;
- explicit affiliate disclosure / anti-stealth-marketing rules.

Not Core because its marketplace/Creator-owned-content structure differs materially from M55 selling M55-owned reports.

Evidence:
- https://hintmarket.jp/terms
- https://hintmarket.jp/guidelines
- https://hintmarket.jp/tokutei

### PromoteKit / Tolt / Dub / PartnerStack / impact.com

Useful as market evidence for modern affiliate tooling.

Not Core because they are redundant with stronger selected owners, introduce enterprise or vendor-specific complexity, or add no M55-critical pattern not already represented in the Core Six.

`SECONDARY_BENCHMARKS_DO_NOT_REOPEN_ARCHITECTURE = TRUE`

---

## E. M55 target architecture — responsibility split

### E-1. M55 control plane

M55 owns the business/accounting truth:

1. Creator application/invite/approval;
2. Creator program state;
3. unique referral token and URL;
4. click/landing attribution evidence;
5. attribution decision;
6. purchase-to-Creator link;
7. commission rate selection at purchase event;
8. commission calculation;
9. compliance/refund/chargeback/fraud classification;
10. append-only commission ledger;
11. payable balance aggregation;
12. payout preference;
13. payout instruction;
14. Creator Revenue Console;
15. tax/legal profile and policy version;
16. payout statement;
17. provider reconciliation;
18. discrepancy/appeal evidence;
19. operator observability and audit.

`M55_COMMISSION_LEDGER_IS_FINANCIAL_AUTHORITY = TRUE`

No affiliate SaaS balance may replace this ledger.

### E-2. Stripe money rail

Stripe target role:

1. M55 customer payment processing;
2. platform charge;
3. connected-account onboarding;
4. provider KYC / requirements;
5. bank details where supported;
6. M55-to-connected-account Connect transfer after PAYABLE;
7. connected-account payout to bank;
8. payout/failure/return/provider events;
9. provider-side risk/compliance requirements;
10. payout/balance infrastructure.

M55-specific Stripe configuration evidence remains in the tax/legal and Stripe support SSOTs.

`STRIPE_IS_MONEY_RAIL_NOT_AFFILIATE_LEDGER = TRUE`

---

## F. Canonical event flow

```
CREATOR_APPROVED
  -> AFFILIATE_LINK_ISSUED

AFFILIATE_LINK_CLICKED
  -> ATTRIBUTION_EVIDENCE_RECORDED

CUSTOMER_CHECKOUT_STARTED
  -> ATTRIBUTION_CANDIDATE_BOUND

STRIPE_PAYMENT_SUCCEEDED
  -> PURCHASE_OBSERVED
  -> ATTRIBUTION_DECIDED
  -> COMMISSION_CREATED(PENDING)

refund / chargeback / fraud / self-referral / duplicate
  -> HOLD / REVERSE / ADJUST command

objective review clears
  -> COMMISSION_PAYABLE

PAYABLE rows
  -> CREATOR_PAYABLE_BALANCE

balance + preference + legal/provider readiness
  -> PAYOUT_BATCH_PLANNED
  -> PAYOUT_QUEUED

Stripe Connect
  -> TRANSFER
  -> PAYOUT_PROCESSING
  -> PAYOUT_POSTED | PAYOUT_FAILED | PAYOUT_RETURNED

provider event
  -> M55 RECONCILIATION

event delivery order
  -> NON_AUTHORITATIVE
  -> idempotent state/reconciliation rules determine financial effect
```

No customer-purchase event directly sends Creator money.

`PURCHASE_TIME_CREATOR_TRANSFER = PROHIBITED`

`PROVIDER_EVENT_DELIVERY_ORDER_IS_NON_AUTHORITATIVE = TRUE`

---

## G. Attribution contract direction

Benchmarks prove that cookies/referral tokens are conventional, but M55 must not blindly copy one vendor's window.

Required future R5 implementation detail (token format, cookie role, authenticated continuity, coupon fallback, privacy/retention) remains R5 work. Benchmark-specific window values remain non-normative.

Active M55 target direction is no longer deferred:

`ATTRIBUTION_WINDOW_DAYS = 30`

`ATTRIBUTION_METHOD = LAST_QUALIFIED_DIRECT_CREATOR_TOUCH`

`ONE_PURCHASE_MAX_ONE_CREATOR = REQUIRED`

`RETROACTIVE_ATTRIBUTION = PROHIBITED`

Exact lock/expiry/no-retroactive-correction principles are owned by `docs/ssot/M55_CREATOR_AFFILIATE_OPERATING_MODEL_SSOT.md` §14. This benchmark SSOT must not reselect a competing window or click model.

`ATTRIBUTION_CORRECTION_MUST_BE_AUDITED = TRUE`

---

## H. Commission contract direction

M55 does not copy benchmark rates.

Existing Human-approved M55 schedule remains the 50% / 40% / 30% exact half-open schedule — see Creator Affiliate Operating Model SSOT:

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

Commission rate must be selected and locked using the approved M55 rate rule at the purchase/commission event, then carried through the append-only ledger.

`BENCHMARK_COMMISSION_RATES_ARE_NON_NORMATIVE = TRUE`

`NO_RETROACTIVE_RATE_CHANGE_FOR_VALID_COMMISSION = TRUE`

---

## I. Review / refund / fraud direction

The combined benchmark standard is:

- commission begins Pending;
- refund/cancel/chargeback changes commission through explicit state/adjustment;
- self-referral is checked before payout eligibility;
- suspicious traffic can HOLD rather than disappear;
- every flag has reason/evidence;
- valid high volume is not fraud by itself;
- payout does not occur until commission is PAYABLE.

M55 retains the canonical commission states from the Compliance SSOT.

`FIRSTPROMOTER_FRAUD_PATTERN = ADAPT`

`SHOPIFY_PENDING_REFUND_PATTERN = ADAPT`

`SILENT_COMMISSION_DELETION = PROHIBITED`

---

## J. Payout direction

Combined precedent:

- aggregate commissions;
- use a threshold/cadence;
- expose payout status to Creator;
- M55 v1 does **not** authorize Creator-requested early-trigger / on-demand payout; A8-style payout-preference UX is benchmark evidence only / **not authorized**;
- automate at scale;
- use provider-hosted payout details;
- reconcile batches;
- preserve statements.

M55 exact threshold, cadence and fee are no longer unresolved. Active target values are frozen by Rev4 Operating Model; benchmark-specific competitor values remain non-normative.

`PAYOUT_BATCHING_REQUIRED = TRUE`

`STANDARD_PAYOUT_THRESHOLD_JPY = 20_000`

`STANDARD_PAYOUT_CADENCE = MONTHLY`

`STANDARD_PAYOUT_DAY_OF_MONTH = 15`

`STANDARD_PAYOUT_BATCH_CUTOFF = PRIOR_CALENDAR_MONTH_END_23_59_59_JST`

`STANDARD_PAYOUT_FEE_BASE_JPY = 770`

`STANDARD_PAYOUT_FEE_BASE_PAYABLE_JPY = 20_000`

`STANDARD_PAYOUT_FEE_INCREMENT_BPS = 55`

```text
excess_jpy = MAX(SETTLEMENT_PAYABLE_JPY - 20_000, 0)
increment_tens = (excess_jpy * 55 + 99_999) // 100_000
STANDARD_PAYOUT_PROCESSING_FEE_JPY = 770 + 10 * increment_tens
```

Forced-tail effective fee = `MIN(standard fee, FLOOR(SETTLEMENT_PAYABLE_JPY * 0.25))`.

`STRIPE_CONNECT = REQUIRED`

`STRIPE_ACCOUNTS_MODEL = ACCOUNTS_V2`

`CONNECTED_ACCOUNT_DASHBOARD = EXPRESS`

`CHARGE_MODEL = SEPARATE_CHARGES_AND_TRANSFERS`

`M55_COMMISSION_LEDGER_IS_FINANCIAL_AUTHORITY = TRUE`

Stripe remains the money rail. M55 ledger remains financial authority. Runtime/provider mutation and Production cash activation remain unauthorized in this docs gate.

Benchmark fee policies are commercial evidence only.

---

## K. Creator Revenue Console target

At minimum, M55 should combine the strongest benchmark UX:

From Rewardful / 開運メーカー:
- referral links;
- clicks;
- conversions;
- commission visibility.

From Shopify Collabs:
- visits;
- conversion rate;
- sales;
- earned;
- Pending/upcoming payout visibility.

From A8:
- payout preference / carry-over concept.

From ValueCommerce:
- payment report / accounting statement.

From FirstPromoter:
- balance and payout lifecycle.

Target panels:

1. Overview;
2. Referral links;
3. Traffic / conversions;
4. Commission activity;
5. Pending / Hold / Payable;
6. Adjustments/refunds;
7. Payout balance;
8. Payout preference;
9. KYC/provider readiness;
10. Tax/invoice profile;
11. Payout history/statements;
12. Discrepancy/appeal.

`CREATOR_REVENUE_CONSOLE_IS_CONTROL_SURFACE_NOT_COSMETIC_ANALYTICS = TRUE`

---

## L. Runtime dependency decision

M55 should copy **patterns**, not create unnecessary vendor lock-in.

Default v1:

- no Rewardful runtime dependency;
- no FirstPromoter runtime dependency;
- no Shopify Collabs runtime dependency;
- no A8/ValueCommerce external dependency;
- Stripe remains the leading payout/payment provider candidate under existing R2-B2 authority;
- M55 native database/contracts own affiliate truth.

Reasons:

- M55 already needs custom 50/40/30 tenure economics;
- custom 30-day compliance model;
- canonical commission/payout orthogonal states;
- append-only ledger;
- M55-specific Product Truth / claims enforcement;
- Japanese tax/invoice profile;
- Creator dashboard;
- provider-neutral payout port;
- future scale and audit control.

`THIRD_PARTY_AFFILIATE_SAAS_RUNTIME_DEPENDENCY_V1 = NONE_BY_DEFAULT`

A future buy-vs-build change requires a separate Human decision and must prove it does not weaken M55 ledger/control authority.

---

## M. REUSE / ADAPT / BUILD / DEFER matrix

| Surface | Decision | Pattern owner |
|---|---|---|
| Unique affiliate URL | **BUILD / standard pattern** | Rewardful · FirstPromoter · 開運メーカー |
| Click/referral tracking | **BUILD / ADAPT** | Rewardful · FirstPromoter |
| Stripe purchase observation | **REUSE M55 Stripe/webhook patterns + ADAPT** | Rewardful · FirstPromoter |
| Attribution evidence | **BUILD** | FirstPromoter audit pattern |
| Self-referral/fraud | **BUILD / ADAPT** | FirstPromoter |
| Pending review | **BUILD / ADAPT** | Shopify Collabs |
| Refund/cancel adjustment | **REUSE/ADAPT existing M55 events** | Rewardful · Shopify |
| Commission pure calculation | **BUILD** | M55-specific |
| Append-only ledger | **BUILD** | M55-specific |
| Creator balance aggregation | **BUILD / ADAPT** | FirstPromoter |
| Economic threshold | **DEFER value / BUILD mechanism** | A8 · ValueCommerce · Shopify |
| Payout preference | **BUILD / ADAPT** | A8 |
| Creator analytics | **BUILD / ADAPT** | Shopify · Rewardful · 開運メーカー |
| Payout report/statement | **BUILD / ADAPT** | ValueCommerce |
| Tax/invoice profile | **BUILD** | ValueCommerce precedent + M55 tax SSOT |
| Stripe connected onboarding | **ADAPT Stripe** | M55 Stripe Support · FirstPromoter pattern |
| Transfer/payout rail | **ADAPT Stripe** | Stripe · FirstPromoter pattern |
| Payout reconciliation | **BUILD** | M55-specific |
| Legal fee pass-through | **DEFER** | tax/legal SSOT |
| Exact attribution window | **DEFER R5** | benchmarks non-normative |
| Exact rounding | **DEFER R6** | M55-specific |
| Exact threshold/cadence | **DEFER R8** | benchmarks non-normative |

---

## N. Rejected designs

`REJECT_AFFILIATE_SAAS_AS_M55_FINANCIAL_SSOT = TRUE`

`REJECT_PURCHASE_TIME_CREATOR_TRANSFER = TRUE`

`REJECT_ONE_PAYOUT_PER_PURCHASE = TRUE`

`REJECT_UNAUDITED_MANUAL_ATTRIBUTION_OVERWRITE = TRUE`

`REJECT_SILENT_COMMISSION_DELETION = TRUE`

`REJECT_OPEN_MLM_OR_RECURSIVE_RECRUITMENT = TRUE`

`REJECT_COMPETITOR_THRESHOLD_AS_BLIND_CONSTANT = TRUE`

`REJECT_COMPETITOR_FEE_POLICY_AS_LEGAL_SAFE_HARBOR = TRUE`

`REJECT_BROAD_COMPETITOR_RESEARCH_LOOP = TRUE`

---

## O. Development order generated by the benchmark

This benchmark does not reorder R2→R8.

Inside existing authority, zero-regret provider-independent work remains:

1. canonical commission/payout/reason contracts;
2. event/idempotency schema;
3. provider-neutral payout port;
4. purchase observation adapter;
5. refund/adjust command;
6. anti-false-reuse guards;
7. adversarial test scaffolds.

Future owning stages then add:

- R4 Creator participation/link foundation;
- R5 attribution/compliance;
- R6 deterministic commission ledger;
- R7 Creator Revenue Console;
- R8 Stripe payout/tax/reconciliation implementation.

`BENCHMARK_DOES_NOT_AUTHORIZE_FUTURE_STAGE_RUNTIME_EARLY = TRUE`

---

## P. Evidence freshness / no-regression

Benchmark facts are current as researched on 2026-09-09 and must be treated as dated evidence.

Pricing, thresholds and vendor capabilities can change.

At implementation time:
- re-verify only the specific vendor/provider fact that materially affects implementation;
- do not rerun the entire market benchmark;
- do not weaken M55 controls merely because a benchmark uses a simpler model;
- use current Stripe M55 account evidence over generic vendor claims.

`BENCHMARK_FREEZE_DATE = 2026-09-09`

`BENCHMARK_COMPOSITION_EVIDENCE_REQUIRED_FOR_MONEY_SURFACES = TRUE`

`BENCHMARK_SOURCE_TO_M55_TRACEABILITY_REQUIRED = TRUE`

`BROAD_BENCHMARK_RESEARCH_REOPEN_REQUIRES_REAL_INVALIDATOR = TRUE`

---

## Q. Benchmark independence / no-copy contract (Human-approved 2026-09-09)

M55 deliberately uses **multiple public benchmarks** to identify ordinary affiliate patterns. It must not clone a single competitor's protected expression, brand, source code, confidential implementation, or distinctive UI.

`BENCHMARK_PATTERN_ADOPTION_NOT_EXPRESSION_COPYING = TRUE`

`NO_THIRD_PARTY_CODE_COPY = TRUE`

`NO_THIRD_PARTY_TERMS_TEXT_COPY = TRUE`

`NO_PIXEL_LEVEL_COMPETITOR_UI_CLONE = TRUE`

`NO_COMPETITOR_TRADEMARK_OR_LOGO_USE = TRUE`

`NO_NONPUBLIC_COMPETITOR_INFORMATION_USE = TRUE`

`M55_IMPLEMENTATION_MUST_BE_INDEPENDENTLY_AUTHORED = TRUE`

Legal evidence basis is recorded in the benchmark-independence evidence pack. In summary:

- Japanese copyright protects creative **expression**, not unexpressed ideas as such.
- Business-method ideas alone are not patentable merely as ideas, but ICT-implemented business-related inventions can be patentable.
- images / graphical designs can be protected under the Design Act when registered.
- trademarks protect source-identifying marks.
- the Unfair Competition Prevention Act protects, among other things, famous/well-known source indications, certain imitated product forms, and trade secrets.

Therefore M55 may use ordinary public affiliate patterns such as:

`unique referral link -> attribution -> commission pending -> refund/fraud review -> payable balance -> batch payout -> statement`

but must create its own:
- database schema;
- state machine implementation;
- copywriting;
- terms text;
- visual hierarchy;
- information architecture details;
- dashboard component design;
- brand;
- code;
- anti-fraud rules;
- payout policy values.

`MULTI_SOURCE_PATTERN_SYNTHESIS_REQUIRED = TRUE`

No implementation review should say "copy FirstPromoter" or "copy A8". It should say:
`ADAPT_PUBLIC_STANDARD_PATTERN_TO_M55_CONTRACT`.

### Q-1. Targeted IP check before runtime

Standard affiliate concepts do not by themselves remove patent/design/trademark risk.

Before a nonstandard technical mechanism or externally similar UI becomes runtime authority, the owning implementation gate should perform a targeted public-rights check appropriate to that surface, including J-PlatPat search when warranted.

`TARGETED_IP_RIGHTS_CHECK_REQUIRED_BEFORE_DISTINCTIVE_EXTERNAL_RUNTIME = TRUE`

This is not a standing requirement to obtain a legal opinion for every ordinary CRUD screen. Escalate when the implementation materially resembles a known vendor-specific technical mechanism, distinctive registered design, protected mark, or non-public implementation.

### Q-2. Creator acceptance contract

M55 must be easy for an Affiliate Creator to understand before they publish the first link.

Minimum Creator-facing "Program Truth" before activation:

1. participation is free / approved participation model;
2. exact eligible M55 products;
3. exact 50% / 40% / 30% schedule and when each period begins/ends;
4. the commission base definition (`COMMISSIONABLE_REVENUE`);
5. attribution rule/window once R5 freezes it;
6. what makes a conversion Pending / Hold / Payable / Reversed / Adjusted;
7. refund/chargeback treatment;
8. self-referral / duplicate / fraud policy;
9. payout threshold/cadence once R8 freezes it;
10. gross commission -> lawful deductions -> net payout;
11. tax/invoice/KYC readiness requirements;
12. next expected payout/status;
13. payout failure/return handling;
14. dispute/appeal/support path;
15. advertising disclosure/prohibited-claims rules;
16. policy/rate version and effective date;
17. no retroactive rate reduction for already-earned valid commission;
18. exportable statement/history.

`CREATOR_PROGRAM_TRUTH_REQUIRED_BEFORE_FIRST_AFFILIATE_LINK = TRUE`

`CREATOR_EARNINGS_EXPLAINABILITY_REQUIRED = TRUE`

`CREATOR_DISPUTE_PATH_REQUIRED = TRUE`

`NO_RETROACTIVE_CREATOR_RATE_REWRITE = TRUE`

### Q-3. Creator Revenue Console synthesis

M55 should combine the strongest public operating patterns without copying visual expression:

- **開運メーカー / Rewardful**: simple unique-link proposition + clicks/conversions/reward visibility;
- **Shopify Collabs**: Pending/holding/refund/dispute/upcoming payout visibility;
- **FirstPromoter**: payout eligibility, fraud/security hardening, provider onboarding;
- **A8.net**: familiar Japan payout preference/carry-over concepts;
- **ValueCommerce**: detailed payout/accounting reports and invoice-oriented payment statement.

M55-specific Console target:

```
OVERVIEW
- clicks
- eligible conversions
- attributed sales
- conversion rate

COMMISSION
- COMMISSIONABLE_REVENUE
- applicable rate
- gross commission
- Pending / Hold / Payable
- Reversed / Adjusted + reason

PAYOUT
- payable projection
- tax/KYC/provider readiness
- next payout
- payout preference
- payout history
- failed/returned state

ACCOUNTING
- statutory withholding if any
- lawful fee if any
- net payout
- invoice/tax profile
- statement/export

SUPPORT
- discrepancy/appeal
- payout issue
- policy/rate version
```

No competitor's color system, component geometry, labels, screen arrangement, or copy is normative.

`CREATOR_CONSOLE_FUNCTIONAL_PATTERN = MULTI_BENCHMARK_SYNTHESIS`

`CREATOR_CONSOLE_VISUAL_EXPRESSION = M55_ORIGINAL_REQUIRED`

### Q-4. Affiliate motivation / trust

M55's Creator proposition should be explicit and stable:

- high introductory rate;
- no recruitment/downline compensation;
- no conversion-count cliff;
- no required inventory/purchase;
- no mandatory posting quota;
- no hidden financial deduction;
- clear reason codes;
- visible payout status;
- valid high volume is treated as success, not automatic fraud;
- security/KYC/tax blocks do not erase valid commission;
- published policy changes are effective-dated and do not rewrite already-earned commission.

`CREATOR_TRUST_IS_FINANCIAL_PRODUCT_QUALITY = TRUE`

### Q-5. Evidence provenance

Every future Creator-money UI or rule must map:
`public benchmark pattern -> M55 requirement -> M55-specific rule -> original implementation -> test/runtime evidence`.

The mapping must also identify:
- source not copied;
- source-specific value rejected;
- M55-specific value owner;
- legal/tax/provider authority where money changes.

`BENCHMARK_TO_M55_PROVENANCE_REQUIRED = TRUE`

## R. Creator acceptance evidence / privacy-safe transparency (Control-Tower third audit 2026-09-09)

`CREATOR_PROGRAM_TRUTH_ACK_REQUIRED_BEFORE_FIRST_AFFILIATE_LINK = TRUE`

`CREATOR_MATERIAL_POLICY_CHANGE_NOTICE_REQUIRED = TRUE`

`ALREADY_EARNED_COMMISSION_USES_GOVERNING_EVENT_POLICY_VERSION = TRUE`

`CREATOR_REVENUE_CONSOLE_CUSTOMER_PII_DISCLOSURE = PROHIBITED_BY_DEFAULT`

The Creator Program Truth is both a UX surface and a durable financial-contract evidence surface. The final implementation must record the accepted versions that govern a Creator's earnings and payout rules.

Creator transparency must use privacy-safe transaction/event references. The affiliate dashboard is not a customer CRM and must not expose purchaser identity or private M55 content merely to explain commission.
