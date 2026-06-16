# M55 Production Purchase Smoke — Wave1 Human Runbook

**Status:** execution-ready planning artifact (no credentials)
**Branch authority:** `feat/m55-paid-lp-canonical-wave1`
**Harness:** `scripts/production/m55_production_purchase_smoke_wave1.ts`
**Wave authority:** `scripts/production/m55_production_purchase_wave_authority.ts`
**Postcheck SQL:** `scripts/sql/production/m55_production_purchase_smoke_wave1_postcheck.sql`

## Purpose

Execute four mandatory Production purchase scenarios before public release:

1. Light purchase (`dtr_core_light_v1`, ¥1,000) — Subject A (`M55_PROD_PURCHASE_A`)
2. Light→FULL conversion (`dtr_core_light_to_full_upgrade_v1`, ¥600) — Subject A
3. Duplicate FULL rejection (no second charge / no state delta) — Subject A
4. Fresh FULL purchase (`dtr_core_full_v1`, ¥1,480) — Subject B (`M55_PROD_PURCHASE_B`)

Controlled account deletion is **excluded** from this wave.

**Production execution authorized now: false**

## Prerequisites (all required before any money movement)

1. DNS blocker resolved
2. Preview deletion smoke `CLOSED_GREEN`
3. Final integrated RC `CLOSED_GREEN`
4. Main integration complete; remote `origin/main` exact
5. Compatibility audit `GREEN` against final main and current Production schema
6. Exact required Production migrations complete; postcheck `PRODUCTION_CHAIN_GREEN`
7. Exact Production deployment `READY` with alias exact
8. All binding confirmations `EXACT_MATCH` (see below)
9. Subject A and Subject B clean-state precheck `SUBJECT_READY_CLEAN`
10. Valid single-use `PurchaseWaveAuthority` token (not expired/consumed)

## Binding confirmations (Human returns booleans only — never paste values)

| Confirmation | Required value |
|---|---|
| Vercel Production binding | `EXACT_MATCH` |
| Supabase Production binding | `EXACT_MATCH` |
| Clerk live instance binding | `EXACT_MATCH` |
| Stripe live mode | `EXACT_MATCH` |
| Light price binding | `EXACT_MATCH` |
| FULL price binding | `EXACT_MATCH` |
| Upgrade price binding | `EXACT_MATCH` |

Raw price IDs, API keys, and env values must **never** appear in evidence.

## ONE_PURCHASE_WAVE_APPROVAL

One Human approval authorizes subject creation/verification and the entire bounded wave.

- Human click required for **each** payment (max 3 successful charges)
- Duplicate successful FULL charge count = **0**
- Any HOLD ends the wave — no retry, no refund, no deletion
- Approval phrase format (placeholders only):

`APPROVE CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-EXECUTION MAIN_<safe-short-sha> DEPLOYMENT_<safe-id> AUTHORITY_<safe-hash>`

## 19-step Human action sequence (maps to internal W0–W11)

| Human | Action | Internal state |
|---|---|---|
| W0 | Authority + Production identity confirmation | W0_AUTHORITY_CONFIRMATION |
| W1 | Subject A/B labels confirmed; clean precheck GREEN | W1_TEST_SUBJECTS_CONFIRMED |
| W2 | Human opens Light checkout for Subject A | W2_LIGHT_PURCHASE_HUMAN_ACTION_REQUIRED |
| W3 | Human completes exactly one Light payment (¥1,000) | W2 (payment sub-step) |
| W4 | Classify payment outcome (combined evidence) | W2 (classification sub-step) |
| W5 | Machine read-only Light postcheck | W3_LIGHT_POSTCHECK |
| W6 | Human opens Light→FULL checkout for Subject A | W4_LIGHT_TO_FULL_HUMAN_ACTION_REQUIRED |
| W7 | Human completes exactly one upgrade payment (¥600) | W4 (payment sub-step) |
| W8 | Machine read-only conversion postcheck | W5_CONVERSION_POSTCHECK |
| W9 | Attempt duplicate FULL for Subject A | W6_DUPLICATE_FULL_REJECTION_CHECK |
| W10 | Require rejection before charge (409/422 or no-op) | W6 (Human evidence) |
| W11 | Machine duplicate no-write postcheck | W6 (SQL + Human no-charge marker) |
| W12 | Human opens FULL checkout for Subject B | W7_FRESH_FULL_HUMAN_ACTION_REQUIRED |
| W13 | Human completes exactly one FULL payment (¥1,480) | W7 (payment sub-step) |
| W14 | Machine read-only FULL postcheck | W8_FULL_POSTCHECK |
| W15 | Integrated idempotency/cross-subject closure | W9_IDEMPOTENCY_AND_EXACTNESS_CLOSURE |
| W16 | Purchase wave CLOSED or HOLD | W11_PURCHASE_WAVE_COMPLETE_DELETION_SEPARATE |
| W17 | Refund decision deferred (optional) | W10_REFUND_CLEANUP_HUMAN_DECISION |
| W18 | Controlled deletion deferred to separate gate | W11 |

Payment outcome classes (each money action):

- `PAYMENT_CONFIRMED_AND_APPLICATION_PENDING` → STOP (no repeat payment)
- `PAYMENT_CONFIRMED_AND_APPLICATION_GREEN` → proceed only with combined evidence
- `PAYMENT_DECLINED_NO_CHARGE` → STOP
- `CHECKOUT_NOT_CREATED` → STOP
- `CHECKOUT_CREATED_PAYMENT_NOT_ATTEMPTED` → STOP
- `PAYMENT_STATUS_AMBIGUOUS` → STOP, no retry
- `DUPLICATE_CHARGE_RISK` → STOP
- `UNKNOWN` → STOP

Combined evidence required for GREEN: Stripe dashboard outcome + application access + machine postcheck. Success page alone, Stripe alone, application alone, or DB alone is **insufficient**.

## Postcheck SQL modes

Set session GUC `m55.purchase_smoke.scenario_mode` before each run:

1. `SUBJECT_PRECHECK` — clean state before first payment
2. `LIGHT_POSTCHECK`
3. `CONVERSION_POSTCHECK`
4. `DUPLICATE_REJECTION_POSTCHECK` — requires Human `human_no_charge_confirmed=true` and `human_rejection_code`
5. `FRESH_FULL_POSTCHECK`
6. `INTEGRATED_CLOSURE` — both subjects; only `PURCHASE_WAVE_GREEN` permits next gate

Duplicate rejection: SQL verifies no application-state delta; it does **not** infer charge result from DB alone.

## STOP rules (non-negotiable)

- STOP at first failed predicate
- No retry after ambiguous payment
- No webhook Replay
- No fifth deletion webhook
- No manual SQL mutation
- No manual entitlement/wallet/snapshot cleanup
- No Production account deletion in this wave
- No secret, card, email, or raw ID sharing

## Rollback / STOP matrix

<!-- PURCHASE-WAVE-STOP-MATRIX-BEGIN -->

| Row | First predicate | Immediate STOP | Retry | Next money action |
|---|---|---|---|---|
| ROLLBACK-STOP-ROW-1 | HOLD_PRODUCTION_PURCHASE_BINDING_MISMATCH | yes | no | blocked |
| ROLLBACK-STOP-ROW-2 | HOLD_SUBJECT_PRECHECK_NOT_CLEAN | yes | no | blocked |
| ROLLBACK-STOP-ROW-3 | HOLD_CHECKOUT_NOT_CREATED | yes | no | blocked |
| ROLLBACK-STOP-ROW-4 | HOLD_PAYMENT_DECLINED_NO_CHARGE | yes | no | blocked |
| ROLLBACK-STOP-ROW-5 | HOLD_PAYMENT_AMBIGUOUS_NO_RETRY | yes | no | blocked |
| ROLLBACK-STOP-ROW-6 | HOLD_DUPLICATE_CHARGE_RISK | yes | no | blocked |
| ROLLBACK-STOP-ROW-7 | HOLD_PAYMENT_FULFILLMENT_PENDING_NO_RETRY | yes | no | blocked |
| ROLLBACK-STOP-ROW-8 | HOLD_LIGHT mismatch | yes | no | blocked |
| ROLLBACK-STOP-ROW-9 | HOLD_CONVERSION mismatch | yes | no | blocked |
| ROLLBACK-STOP-ROW-10 | HOLD_DUPLICATE_FULL_CHARGE_CREATED | yes | no | blocked |
| ROLLBACK-STOP-ROW-11 | HOLD_DUPLICATE_FULL_STATE_DELTA | yes | no | blocked |
| ROLLBACK-STOP-ROW-12 | HOLD_FRESH_FULL mismatch | yes | no | blocked |
| ROLLBACK-STOP-ROW-13 | HOLD_IDEMPOTENCY mismatch | yes | no | blocked |
| ROLLBACK-STOP-ROW-14 | HOLD_FAILED_FULFILLMENTS | yes | no | blocked |
| ROLLBACK-STOP-ROW-15 | HOLD_POSTCHECK_UNKNOWN_FLAGS | yes | no | blocked |
| ROLLBACK-STOP-ROW-16 | HOLD_CROSS_SUBJECT_CONTAMINATION | yes | no | blocked |
| ROLLBACK-STOP-ROW-17 | HOLD_CHARGE_BUDGET_EXCEEDED | yes | no | blocked |
| ROLLBACK-STOP-ROW-18 | HOLD_PRODUCTION_INCIDENT | yes | no | blocked |
| ROLLBACK-STOP-ROW-19 | HOLD_DNS_BLOCKER_REAPPEARED | yes | no | blocked |
| ROLLBACK-STOP-ROW-20 | HOLD_WAVE_AUTHORITY_INVALID | yes | no | blocked |

<!-- PURCHASE-WAVE-STOP-MATRIX-END -->

Rules: Ambiguous payment — **no retry**. Automatic rollback — **forbidden**. Automatic refund — **forbidden**.

## Refund policy boundary

| Action | Allowed in purchase wave? |
|---|---|
| Live purchase | Yes (Human, max 3 successful charges) |
| Automatic refund | No |
| Manual DB cleanup | No |
| Controlled deletion | No (separate gate) |
| Webhook Replay | No |

Refund revocation semantics: `UNKNOWN_FAIL_CLOSED`. Purchase wave may close GREEN without executing refund.

## Internal W0–W11 reference (orchestrator)

- **W0** — Authority confirmation
- **W1** — Test subjects confirmed
- **W2** — Light purchase (Human action)
- **W3** — Light postcheck
- **W4** — Light→FULL (Human action)
- **W5** — Conversion postcheck
- **W6** — Duplicate FULL rejection check
- **W7** — Fresh FULL (Human action)
- **W8** — FULL postcheck
- **W9** — Idempotency closure
- **W10** — Refund decision (deferred)
- **W11** — Wave complete; deletion separate

## Final handoff

Next gate after commit/push of wave authority artifacts:

`CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-AUTHORITY-COMMIT-AND-PUSH-PLANNING`

Only exact `PURCHASE_WAVE_GREEN` in integrated closure permits:

`CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-PLAN-DELTA-REVIEW`
