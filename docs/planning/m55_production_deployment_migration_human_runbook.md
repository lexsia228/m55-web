# M55 Production Deployment + Migration — Human Runbook

**Status:** execution-ready planning artifact (no credentials)  
**Branch authority:** `feat/m55-paid-lp-canonical-wave1`  
**Commit placeholder:** `APPROVED_MAIN_COMMIT_SHA`  
**Authority validator:** `scripts/production/m55_production_deployment_migration_authority.ts`  
**Preflight SQL:** `scripts/sql/production/m55_production_migration_preflight.sql`  
**Postcheck SQL:** `scripts/sql/production/m55_production_migration_postcheck.sql`

## Purpose

Freeze Human-only Production deployment discovery and one-version-at-a-time migration apply after successful main integration. This runbook does **not** authorize execution by itself.

## Prerequisites (all required)

1. Preview DNS remediation GREEN
2. One new separately authorized Preview deletion smoke GREEN
3. Final integrated RC CLOSED GREEN
4. Main integration completed with exact merge commit
5. Human approval for Production deployment/migration wave
6. Valid `ProductionDeploymentMigrationAuthority` object (validator GREEN)
7. Clerk Production live instance identity confirmed as `EXACT_MATCH` (never `UNKNOWN`)
8. DNS blocker resolved (`dns_blocker_resolved=true`)

## Production identity contract (exact)

| Layer | Identity |
|---|---|
| Vercel project | `m55-official/m55-webv2` |
| Vercel environment | `Production` |
| Supabase organization | `m55-soul` |
| Supabase project | `m55-soul-core` |
| Supabase branch | `main` |
| Supabase environment badge | `PRODUCTION` |
| Supabase Source | `Primary Database` |
| Supabase Role | `postgres` |
| Database | `postgres` |

## Canonical migration chain (not an unconditional execution list)

P1–P7 are the **canonical chain**, not an unconditional execution list.

- Preflight computes the exact `required_apply_versions` set from live Production state.
- Human approval binds to that exact computed set only.
- Runtime executor rejects any migration version not present in `approved_required_apply_versions`.
- After each applied version, fresh preflight/postcheck must recompute remaining versions.
- No automatic continuation from stale preflight evidence.

Per-version planning classifies each P1–P7 as exactly one of:

- `APPLIED_EXACT`
- `REQUIRED_APPLY`
- `BLOCKED_BY_PREDECESSOR`
- `HISTORY_SCHEMA_CONFLICT`
- `OBJECT_STATE_PARTIAL`
- `UNKNOWN`

## Conditional rollout order (compatibility-bound)

Rollout order is selected only after compatibility audit GREEN. Deploy-before-compatibility-audit is forbidden.

### Common prefix (all orders)

| Step | Action |
|---|---|
| C0 | Final RC CLOSED GREEN |
| C1 | Preview deletion smoke CLOSED GREEN |
| C2 | Final future main commit frozen and approved |
| C3 | Production current deployment identity read-only confirmed |
| C4 | Production migration preflight executed read-only |
| C5 | Exact current schema/version state frozen |
| C6 | Old/new app × old/new schema compatibility audit GREEN |
| C7 | Exact rollout order selected from compatibility matrix |
| C8 | Human approves exact order and exact `required_apply_versions` |

### Provisional compatibility evidence (must be revalidated)

Repository/static evidence currently indicates:

| Direction | Provisional value |
|---|---|
| OLD_APP_NEW_SCHEMA | true |
| NEW_APP_OLD_SCHEMA | false |

Provisional classification: **`MIGRATE_THEN_DEPLOY_REQUIRED`**

This provisional order may only be frozen if actual repository/static evidence and current Production preflight independently confirm both compatibility directions. If either input changes, new Human approval is required.

Compatibility classifications:

- `BOTH_CROSS_COMPATIBLE`
- `MIGRATE_THEN_DEPLOY_REQUIRED`
- `DEPLOY_THEN_MIGRATE_ALLOWED`
- `STAGED_PROTECTED_CUTOVER_REQUIRED`
- `HOLD_COMPATIBILITY_UNPROVEN`

### MIGRATE_THEN_DEPLOY_REQUIRED path

When OLD_APP_NEW_SCHEMA=true and NEW_APP_OLD_SCHEMA=false:

| Step | Action |
|---|---|
| M1 | Keep current Production app active |
| M2 | Apply only exact required migration version, one at a time |
| M3 | Fresh postcheck after each version |
| M4 | Production chain GREEN |
| M5 | Deploy exact approved main commit |
| M6 | Verify Production deployment READY/binding/alias |
| M7 | Final integrated app+schema verification |
| M8 | STOP before purchase smoke |

### DEPLOY_THEN_MIGRATE_ALLOWED path

When OLD_APP_NEW_SCHEMA=false and NEW_APP_OLD_SCHEMA=true (only when proven):

| Step | Action |
|---|---|
| D1 | Deploy exact approved main commit |
| D2 | Verify candidate safely operates on old schema |
| D3 | Block mutation flows until migration GREEN |
| D4 | Apply only exact required versions |
| D5 | Fresh postcheck |
| D6 | Unblock only after chain GREEN |

### STAGED_PROTECTED_CUTOVER_REQUIRED

No execution under this runbook. Separate Human-approved plan required.

### STOP predicates (compatibility / apply-set)

- `HOLD_COMPATIBILITY_UNPROVEN`
- `HOLD_REQUIRED_APPLY_SET_AMBIGUOUS`
- `HOLD_APPLY_SET_CHANGED_AFTER_APPROVAL`
- `HOLD_UNAPPROVED_VERSION_REQUESTED`
- `HOLD_DEPLOY_BEFORE_COMPATIBILITY_AUDIT`

## Traffic safety boundary (fail-closed)

Between deployment READY and `PRODUCTION_CHAIN_GREEN`:

- **No Production purchase**
- **No Production controlled deletion**
- **No webhook Replay**
- **No fifth Preview deletion webhook**
- **No manually triggered business checkout**
- Clerk `user.deleted` Production endpoint must **not** be routed until migration GREEN
- New schema routes (`/api/clerk/webhook`, deletion RPC paths) must receive **no real traffic** until postcheck GREEN

Policy class: **B — no real traffic path invokes new schema before migration GREEN**

## Required Production env key names (values forbidden in evidence)

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_DTR_CORE_LIGHT_V1`
- `STRIPE_PRICE_DTR_CORE_FULL_V1`
- `STRIPE_PRICE_DTR_CORE_LIGHT_TO_FULL_UPGRADE_V1`

Human records binding probes as `EXACT_MATCH` or `MISMATCH` only.

## D0 — Main push ACK verified

**Human/machine:**

1. Confirm non-force push to `main` ACK is definitive (or confirmed by remote SHA if ambiguous)
2. Record remote `origin/main` SHA equals approved merge commit
3. STOP if remote main changed unexpectedly

**Safe evidence:** `D0_MAIN_PUSH_ACK_GREEN`

## D1 — Discover auto-deployment (after compatibility audit for migrate-then-deploy)

**Human/machine:**

1. Discover exact Production deployment (current or candidate per selected rollout order)
2. Record safe deployment identity only (no secrets)
3. STOP if deployment not found, building beyond bound, failed, or ACK ambiguous
4. STOP if `HOLD_DEPLOY_BEFORE_COMPATIBILITY_AUDIT` — compatibility audit (C6) must precede deploy mutation

**Outcome classes:** `DEPLOYMENT_READY_EXACT` | `DEPLOYMENT_NOT_FOUND` | `DEPLOYMENT_BUILDING` | `DEPLOYMENT_FAILED` | `DEPLOYMENT_COMMIT_MISMATCH` | `DEPLOYMENT_BINDING_MISMATCH` | `DEPLOYMENT_ALIAS_MISMATCH` | `DEPLOYMENT_ACK_AMBIGUOUS`

## D2 — Verify Vercel project

Confirm project identity equals `m55-official/m55-webv2`. STOP on mismatch.

## D3 — Verify Production environment

Confirm target/environment equals `Production`. STOP on Preview binding.

## D4 — Verify branch and commit

Confirm branch=`main` and deployment commit equals approved main commit exactly.

## D5 — Verify Production alias

Confirm Production alias/domain points to exact deployment. STOP on alias mismatch.

## D6 — Verify build READY

Confirm build status READY. STOP on BUILDING/FAILED.

## D7 — Verify framework/runtime identity

Confirm framework/runtime matches repository expectation (read-only metadata).

## D8 — Verify required env key names

Confirm required Production env key **names** exist in Production scope. Record presence only.

## D9 — Verify no Preview binding

Confirm no Preview-scoped Supabase/Clerk/Stripe binding is active on Production deployment.

## D10 — Human exact-match bindings

Human verifies without pasting values:

- Production Supabase binding → `EXACT_MATCH` or `MISMATCH`
- Clerk live instance binding → `EXACT_MATCH` or `MISMATCH` (**UNKNOWN forbidden**)
- Stripe live binding → `EXACT_MATCH` or `MISMATCH`

STOP on any `MISMATCH` or `UNKNOWN`.

## D11 — Safe base-route checks

Allowed:

- Homepage/status route HTTP check (no payment)
- Non-mutating health/diagnostics route if safe

Forbidden:

- Payment/checkout
- Deletion webhook POST
- DB mutation

## D12 — STOP before migration apply or post-deploy verification

Only proceed per selected rollout order after C8 Human approval. No manual redeploy. No retry under ambiguous deployment ACK. Compatibility audit must precede deploy mutation.

---

## M0 — Human approval

Separate Human approval phrase required. Record approval hash only.

## M1 — Authority validator GREEN

```bash
node --experimental-strip-types scripts/production/m55_production_deployment_migration_authority.ts --validate-authority /path/to/authority.json
```

STOP if `ready=false`.

## M2 — Production UI identity re-confirmed

Human confirms Supabase Dashboard: org/project/environment/source/role/database exact.

## M3 — Approved connection mechanism

Use exactly one approved mechanism:

- `SECURE_STDIN_CONNECTION_CONFIG_v1`
- `TEMP_PGPASSFILE_0600_v1`

No raw DB URL. No ambient env credentials.

## M4 — Pinned CA identity verified

Confirm CA pin identity marker matches approved authority. Human marker: `SUPABASE_ROOT_2021_CANONICAL_DER_SHA256_MATCH`.

## M5 — Preflight classification and apply-set approved

Run preflight SQL (SELECT-only). Review computed outputs:

- `required_apply_versions` — exact apply set (may be empty)
- `already_applied_versions`
- `blocked_versions`, `conflicting_versions`, `unknown_versions`
- `per_version_plan`
- `unconditional_apply_forbidden=true`

Accept only:

- `GREENFIELD_READY` with non-empty `required_apply_versions` → apply only that exact set
- `ALREADY_APPLIED` with empty `required_apply_versions` → skip apply, proceed to postcheck

STOP on:

- `PARTIAL_STATE_RECONCILIATION_REQUIRED`
- `HISTORY_ONLY_DRIFT`
- `SCHEMA_ONLY_DRIFT`
- `HOLD_UNKNOWN`
- `HOLD_REQUIRED_APPLY_SET_AMBIGUOUS`
- `HOLD_APPLY_SET_CHANGED_AFTER_APPROVAL`

## M6 — Select one approved migration version

Apply **one version at a time** from `approved_required_apply_versions` only. Preflight determines first required version; do not assume P1→P7 wholesale apply.

## M7 — Open connection

Fresh connection only. Fail closed on identity mismatch.

## M8 — BEGIN

Executor-owned transaction.

## M9 — Execute exact migration statements

Use exact canonical file bytes. No manual SQL edits.

## M10 — Insert exact history row (same transaction)

History insert atomic with migration statements.

## M11 — COMMIT send

Single COMMIT. Classify ACK. **No automatic retry after COMMIT send.**

## M12 — Classify ACK

ACK classes:

- `DEFINITIVE_COMMIT_ACK`
- `DEFINITIVE_ROLLBACK`
- `TRANSPORT_FAILED_BEFORE_BEGIN`
- `TRANSPORT_FAILED_BEFORE_COMMIT`
- `TRANSPORT_FAILED_AFTER_COMMIT_SEND`
- `COMMIT_ACK_AMBIGUOUS`
- `UNKNOWN`

## M13 — Close connection

Retire mutation connection before read-only verification.

## M14 — Fresh reconnect

New read-only connection for post-version verification.

## M15 — Read-only version postcheck

Fresh read-only checks for applied version only.

## M16 — STOP for Human review

Do not continue to next version until Human review GREEN. No batch multi-version apply unless separate authority exists.

---

## Integrated post-migration verification

After all **required** versions from `approved_required_apply_versions` are applied (or when `ALREADY_APPLIED`), run:

`scripts/sql/production/m55_production_migration_postcheck.sql`

Postcheck distinguishes:

- `previously_applied_versions` — exact prior state before this execution
- `newly_applied_in_authority_set` — versions applied under current authority
- `approved_set_respected` — no version outside approved set was newly applied

Only exact `PRODUCTION_CHAIN_GREEN` permits advancing to purchase wave planning. No purchase/deletion before final integrated GREEN.

Postcheck classifications:

- `PRODUCTION_CHAIN_GREEN`
- `PRODUCTION_CHAIN_HOLD_HISTORY_DRIFT`
- `PRODUCTION_CHAIN_HOLD_OBJECT_MISMATCH`
- `PRODUCTION_CHAIN_HOLD_PRIVILEGE_MISMATCH`
- `PRODUCTION_CHAIN_HOLD_PURCHASE_CONTRACT`
- `PRODUCTION_CHAIN_HOLD_DELETION_CONTRACT`
- `PRODUCTION_CHAIN_HOLD_SCHEMA_CACHE`
- `PRODUCTION_CHAIN_UNKNOWN`

---

## Rollback / STOP matrix

<!-- ROLLBACK-STOP-MATRIX-BEGIN -->

| Row | Phase | First predicate | Immediate STOP | Retry | Recovery | Human approval | Release | Next gate |
|---|---|---|---|---|---|---|---|---|
| ROLLBACK-STOP-ROW-1 | main_push | HOLD_MAIN_PUSH_ACK_AMBIGUOUS | yes | no | read_only_classify | yes | BLOCKED | MAIN-INTEGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-2 | deployment | DEPLOYMENT_NOT_FOUND | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-DEPLOYMENT-VERIFICATION |
| ROLLBACK-STOP-ROW-3 | deployment | DEPLOYMENT_BUILDING | yes | no | read_only_classify | no | BLOCKED | PRODUCTION-DEPLOYMENT-VERIFICATION |
| ROLLBACK-STOP-ROW-4 | deployment | DEPLOYMENT_FAILED | yes | no | forward_fix | yes | BLOCKED | PRODUCTION-DEPLOY-FORWARD-FIX |
| ROLLBACK-STOP-ROW-5 | deployment | DEPLOYMENT_COMMIT_MISMATCH | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-DEPLOYMENT-VERIFICATION |
| ROLLBACK-STOP-ROW-6 | deployment | DEPLOYMENT_BINDING_MISMATCH | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-DEPLOYMENT-VERIFICATION |
| ROLLBACK-STOP-ROW-7 | preflight | HOLD_PREFLIGHT_MISMATCH | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-PREFLIGHT-REVIEW |
| ROLLBACK-STOP-ROW-8 | migration_apply | TRANSPORT_FAILED_BEFORE_BEGIN | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-9 | migration_apply | SQL_FAILURE_BEFORE_COMMIT | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-10 | migration_apply | TRANSPORT_FAILED_AFTER_COMMIT_SEND | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-11 | migration_apply | DEFINITIVE_ROLLBACK | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-12 | postcheck | HISTORY_SCHEMA_DISAGREEMENT | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-13 | postcheck | PRODUCTION_CHAIN_HOLD_OBJECT_MISMATCH | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-14 | postcheck | PRODUCTION_CHAIN_HOLD_SCHEMA_CACHE | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-RECOVERY |
| ROLLBACK-STOP-ROW-15 | runtime | UNEXPECTED_LIVE_TRAFFIC_INCIDENT | yes | no | forward_fix | yes | BLOCKED | PRODUCTION-INCIDENT-RECOVERY |
| ROLLBACK-STOP-ROW-16 | compatibility | HOLD_COMPATIBILITY_UNPROVEN | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-COMPATIBILITY-AUDIT-REVIEW |
| ROLLBACK-STOP-ROW-17 | preflight | HOLD_REQUIRED_APPLY_SET_AMBIGUOUS | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-PREFLIGHT-REVIEW |
| ROLLBACK-STOP-ROW-18 | migration_apply | HOLD_APPLY_SET_CHANGED_AFTER_APPROVAL | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-PREFLIGHT-REVIEW |
| ROLLBACK-STOP-ROW-19 | migration_apply | HOLD_UNAPPROVED_VERSION_REQUESTED | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-MIGRATION-APPLY-AUTHORITY-REVIEW |
| ROLLBACK-STOP-ROW-20 | deployment | HOLD_DEPLOY_BEFORE_COMPATIBILITY_AUDIT | yes | no | read_only_classify | yes | BLOCKED | PRODUCTION-COMPATIBILITY-AUDIT-REVIEW |

<!-- ROLLBACK-STOP-MATRIX-END -->

Rules:

- Ambiguous main push: **no retry**
- Ambiguous deploy: **no retry / no manual redeploy**
- Ambiguous COMMIT: **no retry**
- Automatic rollback: **forbidden**
- After main push: history rewrite **forbidden**
- Post-push fixes: forward-fix/revert only with separate Human approval

---

## Separate gates (not combined)

| Action | Allowed in this runbook? |
|---|---|
| Production purchase smoke | No (after `PRODUCTION_CHAIN_GREEN`) |
| Production controlled deletion | No (after purchase wave) |
| Webhook Replay | No |
| Manual DB cleanup | No |
| Automatic migration retry after COMMIT send | No |

## Final handoff

Next gate after commit/push of these artifacts:

`CATEGORY-1-M55-PRODUCTION-DEPLOYMENT-MIGRATION-RUNBOOK-COMMIT-AND-PUSH-PLANNING`

Production execution requires separate Human approval with signed authority object bound to exact main commit and migration registry SHA.

**Production execution authorized now: false**
