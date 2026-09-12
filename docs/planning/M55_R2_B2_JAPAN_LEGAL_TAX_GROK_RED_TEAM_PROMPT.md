# Grok — M55 R2-B2 Japan Legal/Tax Consultation Packet Red-Team

READ-ONLY ONLY.

Repository: lexsia228/m55-web
Authority: current branch containing this prompt.

Read:
- AGENTS.md
- docs/ssot/M55_EXECUTION_STATE.json
- docs/ssot/M55_CREATOR_REVENUE_E2C2E_SSOT.md
- docs/ssot/M55_CREATOR_AFFILIATE_STRIPE_TAX_LEGAL_SSOT.md
- docs/evidence/M55_R2_B2_JAPAN_LEGAL_TAX_CLOSURE_RESEARCH_2026-09-10.md
- docs/planning/M55_R2_B2_JFTC_NTA_HUMAN_CONSULTATION_PACKET_2026-09-10.md

Objective:
Find missing fact-pattern questions that could cause M55 to misclassify:
- Freelance Act applicability;
- 60-day payment deadline anchor;
- fee deduction;
- individual source withholding / 外交員等;
- payment reports/My Number;
- corporate vs individual treatment.

Do not invent legal answers.
Do not reopen Stripe A/B/D.
Do not mutate repo.

Return:
- FINAL CLASSIFICATION: GREEN / YELLOW / RED
- MISSING QUESTIONS
- OVERCLAIMS
- FALSE-POSITIVE WARNINGS
- CONSULTATION PACKET VERDICT
- CLEAN-STATE PROOF

End: END_R2B2_JAPAN_LEGAL_TAX_GROK_RED_TEAM

## Sole-proprietor correction to audit

Human fact:
`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

Audit whether:
- NTA No.2793 individual-payer/no-salary-payer exception is represented correctly;
- JFTC no-employee ordering-business role split is represented correctly;
- employee/payroll status is left as a factual switch rather than invented;
- competitor evidence is used only for ordinary operating patterns;
- phone consultation is conditional fallback, not an unnecessary default.

Flag any remaining corporation assumption as P1/P2 depending materiality.

## Expanded operator-status audit — mandatory

Read `docs/ssot/M55_OPERATOR_BUSINESS_STATUS_SSOT.md` and the new pre-revenue evidence.

Red-team:
- opening/blue-return unknown facts are not falsely closed;
- zero revenue does not erase bookkeeping/electronic retention;
- business-income classification is not overclaimed;
- invoice registration is not auto-recommended;
- labour/social-insurance triggers are accurately scoped;
- APPI/Tokushoho are not incorrectly waived by small scale or zero revenue;
- Stripe sole-proprietor identity rule is correctly represented;
- local tax is kept jurisdiction-dependent;
- personal social-insurance status is not persisted/inferred;
- re-review triggers are complete and scoped.
