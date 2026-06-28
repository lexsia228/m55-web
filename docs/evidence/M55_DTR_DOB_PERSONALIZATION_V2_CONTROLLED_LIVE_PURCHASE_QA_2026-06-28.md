# M55 DTR DOB Personalization V2 Controlled Live Purchase QA Evidence

## 1. Gate Identity

| 項目 | 値 |
|---|---|
| Gate | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-CONTROLLED-LIVE-PURCHASE-QA-EVIDENCE-REV1 |
| Date | 2026-06-28 |
| Source gate | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-CONTROLLED-LIVE-PURCHASE-QA-EXECUTION-REV1 |
| Source gate result | GREEN |

## 2. Production Identity

| 項目 | 値 |
|---|---|
| Production SHA | `5a500c73d9c8c724b895789362f9314f82738b65` |
| branch | `main` |
| production flag | `M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED=true` |
| product | controlled FULL purchase / `dtr_core_full_v1` |

## 3. Controlled Purchase Scope

- One controlled QA purchase only.
- Dedicated QA account (email / user_id redacted).
- DOB described only as controlled DOB input.
- Cost approved before payment.
- No second purchase.
- No unrelated user inspection.

## 4. Stripe / Webhook Result

| 項目 | 値 |
|---|---|
| `checkout.session.completed` | confirmed |
| webhook endpoint response | 200 OK |
| webhook replay | not performed |
| duplicate fulfillment | no |
| unresolved failed fulfillment | no |

## 5. Saved Report Result

| 項目 | 値 |
|---|---|
| saved report unlocked | yes |
| `/dtr/core` accessible | yes |
| consult reply send | no |
| unexpected ticket consumption | no |

## 6. Snapshot Verification

**Method:** Supabase SQL Editor read-only, controlled QA purchase only.

| 項目 | 値 |
|---|---|
| row_count | 1 |
| visible_count | 1 |
| latest_created_at | 2026-06-28 03:30:21 UTC |
| paid_ind_version | v2 |
| catalog_version | dob-v2-2026-06 |
| audit_version | v2 |
| envelope / context / auditMeta consistency | PASS |
| new visible DOB-v2 snapshot created | yes |

No raw JSON or full snapshot body is included in this evidence.

## 7. Existing Purchaser Immutability

- Controlled QA account had no prior visible snapshot in this verification.
- Early return not applicable for this account.
- Unrelated real users were not inspected.
- No UPDATE / backfill observed.
- Existing purchaser immutability remains covered by prior readiness evidence and design.

## 8. Known Issue / Follow-Up

- UI search did not find the fixed phrase: `生年月日の細かなリズム`.
- This is non-blocking for controlled purchase / fulfillment / snapshot QA.
- Follow-up required: UI display / copy verification before NOTE overclaims exact visible phrase.
- NOTE must avoid claiming this exact phrase appears in UI until separately verified.

## 9. NOTE Readiness

| 項目 | 判定 |
|---|---|
| Fulfillment / snapshot readiness | GO |
| UI fixed-phrase visibility | HOLD / follow-up |

**NOTE claim boundaries:**

- OK: new FULL saved-report purchases now create DOB-v2 snapshots.
- OK: existing saved reports are unchanged.
- Avoid: claiming exact UI phrase visibility.
- Avoid: destiny / future certainty / medical / legal / financial claims.

## 10. Explicit Non-Actions

- no second purchase
- no webhook replay
- no manual production POST
- no DB mutation
- no migration apply
- no consult reply send
- no ticket consume beyond expected grant
- no OpenAI / Gemini call
- no source edit before this evidence gate
- no env change
- no NOTE / LP / SNS publication
- no raw PII / secrets / full snapshot body exposure

## 11. Proposed Next Gates

| ステップ | ゲート名 |
|---|---|
| A | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-CONTROLLED-LIVE-PURCHASE-QA-EVIDENCE-PUSH-AND-PROD-OBSERVATION-REV1 |
| B | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-UI-DISPLAY-COPY-VERIFICATION-REV1 |
| C | CATEGORY-2-M55-NOTE-PREPUBLICATION-DRAFT-AND-CLAIM-AUDIT-REV1 |
