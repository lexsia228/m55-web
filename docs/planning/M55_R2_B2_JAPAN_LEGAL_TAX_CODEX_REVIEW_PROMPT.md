# Codex — M55 R2-B2 Japan Legal/Tax Packet Independent Review

READ-ONLY ONLY.

Review the exact branch diff against current main.

Focus:
- whether the public-source conclusions are stronger than the cited authority;
- whether the JFTC/NTA questions fully cover R2-B2 legal/tax closure;
- whether any statement accidentally closes R2-B2 or authorizes payout/runtime;
- whether corporate vs individual withholding is represented correctly;
- whether fee/payment-deadline fallback is conservative and nonbinding;
- whether any R6/R8 implementation is pulled forward.

Return:
- PINNED AUTHORITY
- FINAL CLASSIFICATION: GREEN / GREEN_WITH_NONBLOCKING / YELLOW / RED
- P0/P1/P2/P3 findings
- R2-B2 CLOSURE-PACKET VERDICT
- CLEAN-STATE PROOF

Do not patch.
End: END_R2B2_JAPAN_LEGAL_TAX_CODEX_REVIEW

## Mandatory sole-proprietor correction checks

Human fact:
`M55_OPERATOR_FORM = SOLE_PROPRIETOR`

Check:
1. no stale "M55 is a company/corporation payer" assumption remains;
2. NTA No.2793 individual-payer/no-salary-payer branch is not overclaimed;
3. JFTC no-employee vs employee ordering-business distinction is accurately scoped;
4. unknown employee/payroll facts remain explicit;
5. A8/ValueCommerce/Amazon are evidence of ordinary affiliate operations only, never legal authority;
6. the packet no longer makes phone consultation the default.

## Expanded operator/pre-revenue exact-diff checks — mandatory

Review `M55_OPERATOR_BUSINESS_STATUS_SSOT.md` and related evidence for:
1. source strength and no legal overclaim;
2. opening-date/blue-return/admin unknowns correctly preserved;
3. loss/bookkeeping treatment not overstated;
4. electronic-transaction retention accuracy;
5. consumption-tax/invoice registration consequences;
6. labour/social-insurance trigger accuracy, including 2029 change;
7. APPI small-business rule;
8. Tokushoho individual-seller identity/omission conditions;
9. Stripe sole-proprietor identity;
10. scoped invalidator registry and no accidental CURRENT/NEXT change.
