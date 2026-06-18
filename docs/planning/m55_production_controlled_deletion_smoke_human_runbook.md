# M55 Production Controlled Deletion Smoke — Human Runbook

**Status:** execution-ready planning artifact (no credentials)
**Branch authority:** `feat/m55-paid-lp-canonical-wave1`
**Authority:** `scripts/production/m55_production_controlled_deletion_authority.ts`
**Orchestrator:** `scripts/production/m55_production_controlled_deletion_smoke.ts`
**Postcheck SQL:** `scripts/sql/production/m55_production_controlled_deletion_smoke_postcheck.sql`

## Purpose

Execute one bounded Production controlled-deletion smoke after purchase wave GREEN:

- Delete **Subject A** (`M55_PROD_PURCHASE_A`) — Light, conversion, duplicate-rejection coverage
- Retain **Subject B** (`M55_PROD_PURCHASE_B`) as unrelated-data control — fresh FULL only
- One Human Clerk delete click
- One naturally generated signed `user.deleted` webhook
- One event ledger row, one deletion ledger row, one RPC success
- No Replay, Send Example, synthetic POST, manual RPC, or DB repair

Controlled account deletion is **separate** from purchase wave and refund.

**Production execution authorized now: false**

## Prerequisites (all required before any Clerk delete)

1. DNS/HTTP path healthy (no `ENOTFOUND` / transport failure)
2. Preview deletion smoke `CLOSED_GREEN`
3. Final integrated RC `CLOSED_GREEN`
4. Main integration complete; remote `origin/main` exact
5. Production chain postcheck `PRODUCTION_CHAIN_GREEN`
6. Exact Production deployment `READY`
7. Production purchase wave `PURCHASE_WAVE_GREEN` / integrated closure exact
8. All binding confirmations `EXACT_MATCH` (see below)
9. Subject A and Subject B prechecks `DELETION_SUBJECT_READY` / `CONTROL_SUBJECT_READY`
10. Valid single-use `ControlledDeletionAuthority` token (not expired/consumed)

## Binding confirmations (Human returns booleans only — never paste values)

| Confirmation | Required value |
|---|---|
| Vercel Production binding | `EXACT_MATCH` |
| Supabase Production binding | `EXACT_MATCH` |
| Clerk live instance | `EXACT_MATCH` |
| Clerk webhook endpoint | `EXACT_MATCH` |
| Signing secret Production scope | `EXACT_MATCH` |
| Webhook route identity | `EXACT_MATCH` |

Raw signing secrets, Svix IDs, Clerk user IDs, and env values must **never** appear in evidence.

## Subject selection (frozen)

| Role | Safe label | Rationale |
|---|---|---|
| Deletion target | `M55_PROD_PURCHASE_A` | Maximum purchase + deletion contract coverage |
| Control | `M55_PROD_PURCHASE_B` | Fresh FULL unrelated-data baseline |

No third subject. No real user.

## ONE_CONTROLLED_DELETION_APPROVAL

One Human approval authorizes read-only prechecks and the entire bounded deletion smoke.

- Human click required for **exactly one** Clerk live user deletion
- One naturally generated webhook only — no Send Example, no Replay, no synthetic POST
- Any HOLD ends the smoke — no retry, no subject recreation, no manual repair
- Approval phrase format (placeholders only):

`APPROVE CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-EXECUTION MAIN_<safe-short-sha> DEPLOYMENT_<safe-id> SUBJECT_M55_PROD_PURCHASE_A AUTHORITY_<safe-hash>`

## X0–X16 Human action sequence

| Step | Action | Orchestrator state |
|---|---|---|
| X0 | Validate single-use authority | X0_AUTHORITY_VALIDATION |
| X1 | Confirm Production identities and bindings | X1_PRODUCTION_BINDING_CONFIRMATION |
| X2 | Read-only Subject A/B + event/ledger precheck | X2_SUBJECT_CONTROL_PRECHECK |
| X3 | Confirm transport-safe probe GREEN | X3_TRANSPORT_PROBE_CONFIRMATION |
| X4 | Human opens exact Clerk live deletion subject | X4_HUMAN_OPEN_CLERK_SUBJECT |
| X5 | Human verifies safe local label mapping | X5_HUMAN_VERIFY_LABEL_MAPPING |
| X6 | Human performs exactly one Clerk user deletion | X6_HUMAN_DELETE_ACTION_REQUIRED |
| X7 | Classify Clerk action outcome | X7_CLERK_ACTION_CLASSIFICATION |
| X8 | Wait bounded interval for natural webhook | X8_WAIT_FOR_NATURAL_WEBHOOK |
| X9 | Inspect new Svix attempt metadata safely | X9_SVIX_METADATA_CLASSIFICATION |
| X10 | Verify HTTP response received and accepted | X10_HTTP_ACCEPTANCE_CLASSIFICATION |
| X11 | Read-only event-ledger/RPC/post-state verification | X11_DB_RPC_POSTCHECK |
| X12 | Verify control Subject B unchanged | X12_CONTROL_SUBJECT_POSTCHECK |
| X13 | Verify retained Stripe/audit contracts | X13_RETAINED_DATA_POSTCHECK |
| X14 | Classify deletion smoke | X14_FINAL_DELETION_CLASSIFICATION |
| X15 | STOP — no further irreversible action | X15_STOP_NO_FURTHER_ACTION |
| X16 | Public release audit deferred | X16_PUBLIC_RELEASE_AUDIT_SEPARATE |

Clerk action classes: `CLERK_DELETE_CONFIRMED`, `CLERK_DELETE_NOT_EXECUTED`, `CLERK_DELETE_REJECTED`, `CLERK_DELETE_STATUS_AMBIGUOUS`, `WRONG_SUBJECT_RISK`, `UNKNOWN`.

Transport classes: `WEBHOOK_ACCEPTED_EXACT` (only class that may proceed to GREEN), plus eight HOLD transport classes.

Combined evidence required for `PRODUCTION_DELETION_GREEN`: confirmed Clerk delete + accepted natural webhook + event ledger + deletion ledger + RPC success + target pseudonymization + retained contracts + identifiability + control unchanged + unrelated changes = 0. Clerk UI disappearance alone, webhook 2xx alone, event row alone, RPC alone, or DB state alone is **insufficient**.

## Postcheck SQL modes

Set session GUC `m55.deletion_smoke.scenario_mode` before each run:

1. `PRE_DELETE_SUBJECT_CONTROL` — Subject A/B clean state before delete
2. `PRE_DELETE_EVENT_LEDGER` — no prior deletion event/ledger ambiguity
3. `POST_DELETE_EVENT_RPC` — requires Human `human_clerk_action_marker` and `human_transport_marker`
4. `POST_DELETE_TARGET_RETAINED` — target pseudonymization + retained Stripe tables
5. `POST_DELETE_CONTROL_UNRELATED` — Subject B baseline fingerprint unchanged
6. `INTEGRATED_DELETION_CLOSURE` — only `PRODUCTION_DELETION_GREEN` permits next gate

SQL does **not** infer Clerk action or webhook acceptance from DB alone.

## STOP rules (non-negotiable)

- STOP at first failed predicate
- No Clerk delete retry after ambiguity
- No webhook Replay or Send Example
- No synthetic POST
- No manual RPC or DB repair
- No subject recreation to hide failure
- No public release transition in this runbook

## Rollback / STOP matrix

<!-- CONTROLLED-DELETION-STOP-MATRIX-BEGIN -->

| Row | First predicate | Immediate STOP | Retry | Replay | Next irreversible action |
|---|---|---|---|---|---|
| ROLLBACK-STOP-ROW-1 | HOLD_FINAL_RC_NOT_GREEN | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-2 | HOLD_PURCHASE_WAVE_NOT_GREEN | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-3 | HOLD_PRODUCTION_CHAIN_NOT_GREEN | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-4 | HOLD_DEPLOYMENT_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-5 | HOLD_CLERK_LIVE_BINDING_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-6 | HOLD_SIGNING_ENDPOINT_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-7 | HOLD_DELETION_SUBJECT_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-8 | HOLD_CONTROL_SUBJECT_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-9 | HOLD_SUBJECT_PRECHECK_NOT_CLEAN | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-10 | HOLD_PRIOR_EVENT_PRESENT | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-11 | HOLD_PRIOR_DELETION_LEDGER_PRESENT | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-12 | HOLD_TRANSPORT_PROBE_NOT_GREEN | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-13 | HOLD_WRONG_SUBJECT_RISK | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-14 | HOLD_CLERK_ACTION_AMBIGUOUS | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-15 | HOLD_WEBHOOK_NOT_DELIVERED | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-16 | HOLD_WEBHOOK_TRANSPORT_DNS_OR_TIMEOUT | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-17 | HOLD_WEBHOOK_SIGNATURE_REJECTED | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-18 | HOLD_WEBHOOK_ROUTE_FAILURE | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-19 | HOLD_EVENT_LEDGER_OR_RPC_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-20 | HOLD_TARGET_RETAINED_OR_IDENTIFIABILITY_MISMATCH | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-21 | HOLD_CONTROL_OR_UNRELATED_DATA_CHANGED | yes | no | no | blocked |
| ROLLBACK-STOP-ROW-22 | HOLD_PRODUCTION_INCIDENT | yes | no | no | blocked |

<!-- CONTROLLED-DELETION-STOP-MATRIX-END -->

Rules: Ambiguous Clerk delete — **no retry**. Webhook Replay — **forbidden**. Send Example — **forbidden**. Synthetic POST — **forbidden**. Manual RPC — **forbidden**. Manual DB repair — **forbidden**. Subject recreation — **forbidden**.

## Recovery boundary

Any ambiguity requires a **separate recovery gate** with read-only state classification. Never repeat irreversible action until exact remote state is proven. If Clerk delete committed but webhook failed: HOLD release, no Replay, separate platform recovery plan.

## Refund / public release

Refund is excluded. Public release GO is excluded — deferred to `CATEGORY-1-M55-FINAL-PUBLIC-RELEASE-GO-CHECKLIST-READ-ONLY-PLANNING` after exact `PRODUCTION_DELETION_GREEN`.

## Final handoff

Next gate after commit/push of deletion authority artifacts:

`CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-AUTHORITY-COMMIT-AND-PUSH-PLANNING`

Only exact `PRODUCTION_DELETION_GREEN` in integrated closure permits:

`CATEGORY-1-M55-FINAL-PUBLIC-RELEASE-GO-CHECKLIST-READ-ONLY-PLANNING`
