# M55 Preview Post-Remediation Deletion Smoke — Human Runbook

**Status:** execution-ready planning artifact (no credentials)
**Branch authority:** `feat/m55-paid-lp-canonical-wave1`
**Feature HEAD:** `45e75b3020636ab4e6fb313501ce739a818d7cf0`
**Deployment:** `dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh` (Preview, branch alias current)
**Authority:** `scripts/preview/m55_preview_post_remediation_deletion_authority.ts`
**Orchestrator:** `scripts/preview/m55_preview_post_remediation_deletion_smoke.ts`
**Postcheck SQL:** `scripts/sql/preview/m55_preview_post_remediation_deletion_smoke_postcheck.sql`

## Purpose

Execute one bounded Preview account-deletion smoke after DNS remediation planning GREEN:

- One Development subject creation (`M55_PREVIEW_DELETE_POST_REMEDIATION_01`)
- One Human Clerk delete click
- One naturally generated signed `user.deleted` webhook
- One event ledger row, one deletion ledger row, one RPC success
- No Replay, Send Example, synthetic POST, manual RPC, or DB repair
- No subject fixture required — Human creates subject in Clerk Development UI
- No redeploy, env/Node/region change, or second subject

**Preview execution authorized now: false**

## Prerequisites (all required before any Clerk delete)

1. Authority commit pushed to `feat/m55-paid-lp-canonical-wave1`; Vercel has created a **new** Preview deployment for the pushed commit — `READY`, branch alias current, Production binding `false`. (The planning deployment `dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh` is historical evidence and is **not** used as the execution target.)
2. Production binding `false` on this deployment
3. Prior four DNS-failure attempts frozen — subject/event reuse forbidden
4. Valid single-use `PreviewPostRemediationDeletionAuthority` token (not expired/consumed)
5. All binding confirmations `EXACT_MATCH` (see below)
6. Subject precheck `SUBJECT_NEW_AND_CLEAN` before delete
7. Event/deletion ledger precheck GREEN (no prior rows for this subject)

## Binding confirmations (Human returns booleans only — never paste values)

| Confirmation | Required value |
|---|---|
| Vercel Preview deployment | `VERCEL_PREVIEW_DEPLOYMENT_EXACT_MATCH` |
| Supabase Preview binding | `SUPABASE_PREVIEW_BINDING_EXACT_MATCH` |
| Clerk Development instance | `CLERK_DEVELOPMENT_INSTANCE_EXACT_MATCH` |
| Clerk Development endpoint | `CLERK_DEVELOPMENT_ENDPOINT_EXACT_MATCH` |
| Signing secret Preview scope | `SIGNING_SECRET_PREVIEW_SCOPE_EXACT_MATCH` |
| Webhook URL | `WEBHOOK_URL_EXACT_MATCH` |

Raw signing secrets, Svix IDs, Clerk user IDs, and env values must **never** appear in evidence.

## Subject selection (frozen)

| Role | Safe label | Notes |
|---|---|---|
| Deletion target | `M55_PREVIEW_DELETE_POST_REMEDIATION_01` | New Development subject only |

No second subject. No subject recreation after ambiguity. No real user.

## ONE_PREVIEW_DELETION_APPROVAL

One Human approval authorizes read-only prechecks and the entire bounded deletion smoke.

- Human action required for **exactly one** Clerk Development user creation
- Human click required for **exactly one** Clerk Development user deletion
- One naturally generated webhook only — no Send Example, no Replay, no synthetic POST
- Any HOLD ends the smoke — no retry, no subject recreation, no manual repair
- Approval phrase format (placeholders only):

`APPROVE CATEGORY-1-M55-PREVIEW-ACCOUNT-DELETION-SMOKE-POST-REMEDIATION-EXECUTION DEPLOYMENT_<safe-id> COMMIT_<safe-short-sha> SUBJECT_M55_PREVIEW_DELETE_POST_REMEDIATION_01 AUTHORITY_<safe-hash>`

The planning deployment `dpl_FPT8yoAMXXMxyS7Y9TGoe2Y1gXWh` is **historical evidence only** and is **not** the execution target. After the authority commit is pushed, Vercel creates a **new** Preview deployment for the new commit. The Human must discover that post-push deployment and supply its safe identity before smoke execution.

Approval authorizes only: one Development subject creation, read-only precheck, one Human deletion, one natural webhook observation, read-only postcheck. It does **not** authorize final RC automatically.

## S0–S15 Human action sequence

| Step | Action | Orchestrator state |
|---|---|---|
| S0 | Validate single-use authority | S0_AUTHORITY_VALIDATION |
| S1 | Confirm Preview identities and bindings | S1_PREVIEW_BINDING_REVERIFY |
| S2 | Human creates exactly one Development subject | S2_SYNTHETIC_SUBJECT_CREATION_REQUIRED |
| S3 | Human verifies safe local label mapping | S3_SAFE_LABEL_MAPPING |
| S4 | Read-only deployment/subject/event/ledger precheck | S4_PREDELETE_READONLY_PRECHECK |
| S5 | Human confirms readiness before delete | S5_HUMAN_CONFIRMATION_BEFORE_DELETE |
| S6 | Human performs exactly one Clerk user deletion | S6_HUMAN_DELETE_ACTION_REQUIRED |
| S7 | Classify Clerk action outcome | S7_CLERK_ACTION_CLASSIFICATION |
| S8 | Wait bounded interval for natural webhook | S8_WAIT_FOR_NATURAL_WEBHOOK |
| S9 | Inspect new Svix attempt metadata safely | S9_SVIX_METADATA_CLASSIFICATION |
| S10 | Classify HTTP transport outcome | S10_HTTP_TRANSPORT_CLASSIFICATION |
| S11 | Read-only event-ledger/RPC/target/retained verification | S11_DB_RPC_TARGET_RETAINED_POSTCHECK |
| S12 | Verify unrelated data unchanged | S12_UNRELATED_DATA_POSTCHECK |
| S13 | Classify deletion smoke | S13_FINAL_SMOKE_CLASSIFICATION |
| S14 | STOP — no further irreversible action | S14_STOP_NO_FURTHER_ACTION |
| S15 | Final RC gate deferred | S15_FINAL_RC_GATE_SEPARATE |

Clerk action classes: `CLERK_DELETE_CONFIRMED`, `CLERK_DELETE_NOT_EXECUTED`, `CLERK_DELETE_REJECTED`, `CLERK_DELETE_STATUS_AMBIGUOUS`, `WRONG_SUBJECT_RISK`, `UNKNOWN`.

Transport classes: `WEBHOOK_ACCEPTED_EXACT` (only class that may proceed to GREEN), plus eight HOLD transport classes including `WEBHOOK_TRANSPORT_DNS_FAILURE`.

Combined evidence required for `PREVIEW_DELETION_GREEN`: confirmed Clerk delete + accepted natural webhook + event ledger + deletion ledger + RPC success + target pseudonymization + retained contracts + identifiability + unrelated changes = 0. Clerk UI disappearance alone, webhook 2xx alone, event row alone, RPC alone, or DB state alone is **insufficient**.

If `WEBHOOK_TRANSPORT_DNS_FAILURE` (ENOTFOUND) is classified: STOP permanently for this subject — no second subject, no additional webhook, separate one-variable fallback planning gate required.

## Postcheck SQL modes

Set session GUC `m55.preview_deletion_smoke.scenario_mode` before each run:

1. `PRE_DELETE_DEPLOYMENT_SUBJECT` — deployment + subject clean state before delete
2. `PRE_DELETE_EVENT_LEDGER` — no prior deletion event/ledger ambiguity
3. `POST_DELETE_EVENT_LEDGER_RPC` — requires Human `human_clerk_action_marker` and `human_transport_marker`
4. `POST_DELETE_TARGET_RETAINED` — target pseudonymization + retained Stripe tables
5. `POST_DELETE_UNRELATED` — unrelated baseline fingerprint unchanged
6. `INTEGRATED_PREVIEW_DELETION_CLOSURE` — only `PREVIEW_DELETION_GREEN` permits final RC planning

SQL does **not** infer Clerk action or webhook acceptance from DB alone.

## STOP rules (non-negotiable)

- STOP at first failed predicate
- No Clerk delete retry after ambiguity
- No webhook Replay or Send Example
- No synthetic POST
- No manual RPC or DB repair
- No subject recreation to hide failure
- No redeploy, env/Node/region change
- No automatic final RC transition in this runbook

## Rollback / STOP matrix

<!-- PREVIEW-DELETION-STOP-MATRIX-BEGIN -->

| Row | First predicate | Immediate STOP | Retry | Replay | Second subject | Next irreversible action | Final RC |
|---|---|---|---|---|---|---|---|
| ROLLBACK-STOP-ROW-1 | HOLD_DEPLOYMENT_MISMATCH | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-2 | HOLD_BRANCH_ALIAS_STALE | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-3 | HOLD_PREVIEW_BINDING_MISMATCH | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-4 | HOLD_CLERK_DEVELOPMENT_INSTANCE_MISMATCH | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-5 | HOLD_SIGNING_ENDPOINT_MISMATCH | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-6 | HOLD_SUBJECT_CREATION_AMBIGUOUS | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-7 | HOLD_HISTORICAL_ATTEMPT_REUSE | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-8 | HOLD_REAL_USER_RISK | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-9 | HOLD_SUBJECT_PRECHECK_NOT_GREEN | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-10 | HOLD_PRIOR_EVENT_PRESENT | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-11 | HOLD_PRIOR_DELETION_LEDGER_PRESENT | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-12 | HOLD_WRONG_SUBJECT_RISK | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-13 | HOLD_CLERK_ACTION_AMBIGUOUS | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-14 | HOLD_WEBHOOK_NOT_DELIVERED | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-15 | HOLD_WEBHOOK_TRANSPORT_DNS_FAILURE | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-16 | HOLD_WEBHOOK_TRANSPORT_TIMEOUT | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-17 | HOLD_WEBHOOK_SIGNATURE_REJECTED | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-18 | HOLD_WEBHOOK_ROUTE_FAILURE | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-19 | HOLD_EVENT_LEDGER_OR_RPC_MISMATCH | yes | no | no | no | blocked | HOLD |
| ROLLBACK-STOP-ROW-20 | HOLD_TARGET_RETAINED_IDENTIFIABILITY_UNRELATED_MISMATCH | yes | no | no | no | blocked | HOLD |

<!-- PREVIEW-DELETION-STOP-MATRIX-END -->

Rules: Ambiguous Clerk delete — **no retry**. Webhook Replay — **forbidden**. Send Example — **forbidden**. Synthetic POST — **forbidden**. Manual RPC — **forbidden**. Manual DB repair — **forbidden**. Subject recreation — **forbidden**.

## Recovery boundary

Any ambiguity requires a **separate recovery gate** with read-only state classification. Never repeat irreversible action until exact remote state is proven. If Clerk delete committed but webhook failed with ENOTFOUND: permanent STOP for this subject, no Replay, separate one-variable fallback planning gate.

## Final handoff

Next gate after commit/push of Preview deletion authority artifacts:

`CATEGORY-1-M55-PREVIEW-ACCOUNT-DELETION-SMOKE-POST-REMEDIATION-AUTHORITY-COMMIT-AND-PUSH-EXECUTION`

After commit/push: stop, discover the fresh Preview deployment for the new pushed HEAD, confirm bindings, then proceed to:

`CATEGORY-1-M55-PREVIEW-ACCOUNT-DELETION-SMOKE-POST-PUSH-DEPLOYMENT-BINDING-AND-EXECUTION-PLANNING`

Only exact `PREVIEW_DELETION_GREEN` in integrated closure permits final RC planning — deferred to `CATEGORY-1-M55-FINAL-INTEGRATED-RC-AUDIT`. Public release GO is excluded.

---

## Note on `local_gap_remains_count=0`

`local_gap_remains_count=0` means all DNS-independent **LOCAL implementation and READ-ONLY planning** artifacts are complete. It does NOT mean completion of: DNS remediation, Preview deletion smoke execution, final RC, main integration, Production compatibility/migration/deploy, Production purchase, Production deletion, or public release. Those remain pending Human and external runtime steps.
