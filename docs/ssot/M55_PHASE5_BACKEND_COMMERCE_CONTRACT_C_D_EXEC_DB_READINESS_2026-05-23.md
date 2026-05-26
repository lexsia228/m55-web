# Phase BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB-READINESS — DB apply readiness（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB-READINESS** |
| **Title** | **Production DB migration apply readiness — DB-before-app · preflight packet** |
| **Classification** | **Category 1 / DB apply readiness / preflight planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_D_EXEC_DB_READINESS_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB-READINESS-001`** |
| **Date** | **2026-05-23** |
| **Local HEAD** | **`472abef`** · `feat: add consult reply commit contract` |
| **origin/main** | **`6ce7002`** · **not yet pushed** with **`472abef`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_IMPLEMENTATION_COMMIT_GREEN_LOCAL_ONLY_NO_PRODUCTION_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-COMMIT-001`** |
| **Production DB apply** | **HOLD** until **`C-D-EXEC-DB`** + Human GO |
| **Push / deploy / C-D-EXEC-APP** | **HOLD** until DB success verified |
| **VERIFY-C / live checkout** | **HOLD** |

**DB readiness GREEN.** Repo · migration artifact · ordering constraints verified · **no Production mutation in this gate.**

---

## B. Current git state

| Check | Result |
|-------|--------|
| **Local HEAD** | **`472abef8d1d5b3136ef040ce55d738ad0f8a7038`** |
| **origin/main** | **`6ce7002c8e5cde485807c110bdef899553fc83f9`** |
| **Commits ahead of origin** | **1** · **`472abef`** only |
| **Uncommitted app/migration delta** | **none** · implementation clean @ HEAD |
| **Stray modified tracked** | `docs/ssot/M55_SYSTEM_SSOT.md` · **unrelated · exclude from push** |

**Migration file present locally:** `supabase/migrations/20260523120000_m55_consult_reply_commit_rpc_v1.sql` · **yes** @ **`472abef`**

---

## C. DB-before-app risk assessment

| Risk | Level | Detail |
|------|-------|--------|
| **Push main before DB apply** | **CRITICAL** | Vercel Production may deploy send route calling **`m55_consult_reply_commit`** while RPC absent → **hard 500 on send** |
| **App deploy before DB** | **CRITICAL** | Same failure mode · gate violation |
| **DB apply on wrong Supabase project** | **HIGH** | DDL on non-**m55-soul-core** · STOP |
| **Partial DDL** | **MEDIUM** | STOP · assess catalog · no app deploy |
| **DB apply without fresh preflight** | **MEDIUM** | S-5/cap drift since C-HUMAN-R · STOP |
| **Push after DB · before deploy window** | **LOW** | Old send path still works briefly · minimize gap |

**Mandatory sequence:**

```
preflight (read-only) → PASS
  ↓ Human GO: BACKEND-COMMERCE-CONTRACT-C-D-EXEC go
C-D-EXEC-DB: apply migration on m55-soul-core
  ↓ post-DB verification PASS
C-D-EXEC-APP: push + deploy (same maintenance window)
  ↓
smoke → C-POSTFLIGHT-R
```

**Rule:** **Do not push `472abef` to origin/main if that triggers Vercel app deploy before DB migration succeeds.**

---

## D. Readiness checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Local HEAD = **`472abef`** | **PASS** |
| 2 | origin/main still **`6ce7002`** · **`472abef` not pushed** | **PASS** |
| 3 | Migration file exists @ HEAD | **PASS** |
| 4 | No uncommitted app changes required for DB migration | **PASS** |
| 5 | Supabase target = **m55-soul-core** Production | **Human confirm at exec** |
| 6 | Preflight SQL path fixed | **PASS** |
| 7 | Human GO phrase defined | **PASS** |
| 8 | Post-DB verification checklist defined | **PASS** |
| 9 | App deploy remains HOLD until DB success | **PASS** |
| 10 | Production DB apply in this gate | **no** · **PASS** |

---

## E. Preflight requirements（pre-apply · Human runs SQL）

**Script:** `scripts/sql/production/m55_backend_commerce_contract_c_readonly_preflight_v1.sql`

Run **section-by-section** in Supabase SQL Editor · **counts/booleans only** · confirm **`current_database()`** first.

| Metric | Required pre-apply | Section |
|--------|-------------------|---------|
| **`current_database_name`** | **`postgres`** | §0 |
| **`wallets_null_status_active`** | **0** | §1 |
| **`wallets_null_active_available_gt_0`** | **0** | §1 |
| **`quarantine_apply_candidate_count`** | **0** | §1 |
| **`wallets_cap_violation_rows`** | **0** | §3 |
| **`users_with_both_null_and_scoped_wallet`** | **0** | §2 |
| **`wallets_with_report_instance_id_total`** | **6** (C-HUMAN-R band) | §2 |
| **`rpc_consult_reply_commit_exists`** | **false** | §5 |
| **`rpc_reply_generate_commit_exists`** | **true** | §5 |
| **`rpc_fulfill_checkout_exists`** | **true** | §5 |

**STOP if any S-5 / cap / dual-wallet metric fails.**

**Anchor attestation:** `M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`

---

## F. DB apply packet（C-D-EXEC-DB · Human · mutation）

**Prerequisites:**

1. Human GO phrase in ticket:

```text
BACKEND-COMMERCE-CONTRACT-C-D-EXEC go
```

2. Preflight §E **all PASS**
3. Confirm Supabase project = **m55-soul-core** Production
4. No other DML/DDL in flight

**Apply:**

| Step | Action |
|------|--------|
| **F-1** | Open Supabase SQL Editor · **m55-soul-core** |
| **F-2** | Apply full contents of `supabase/migrations/20260523120000_m55_consult_reply_commit_rpc_v1.sql` |
| **F-3** | Record apply success · **booleans/counts only** · no raw IDs |
| **F-4** | Run post-DB verification §G immediately |
| **F-5** | **STOP** on any verification FAIL · **do not push/deploy** |

**Migration objects (additive):**

| Order | Object |
|-------|--------|
| 1 | `consult_send_commits` table + UNIQUE + index |
| 2 | `reply_wallet_ledgers.consult_commit_id` column + FK |
| 3 | `idx_reply_wallet_ledgers_consult_commit` |
| 4 | CHECK replace → `reply_wallet_ledgers_reply_consume_ref_check` |
| 5 | `m55_consult_reply_commit` function + `GRANT service_role` |

---

## G. Post-DB verification checklist（read-only · before any push/deploy）

Re-run relevant sections of preflight SQL + catalog probes:

| # | Check | Expected post-apply |
|---|-------|----------------------|
| **G-1** | **`rpc_consult_reply_commit_exists`** | **true** |
| **G-2** | **`consult_send_commits` table** | **exists** |
| **G-3** | **`reply_wallet_ledgers.consult_commit_id` column** | **exists** |
| **G-4** | Ledger CHECK allows consult path | constraint **`reply_wallet_ledgers_reply_consume_ref_check`** present · `reply_consume` allows **`consult_commit_id IS NOT NULL`** |
| **G-5** | **`wallets_null_status_active`** | **0** · S-5 non-regression |
| **G-6** | **`wallets_null_active_available_gt_0`** | **0** |
| **G-7** | **`quarantine_apply_candidate_count`** | **0** |
| **G-8** | **`wallets_cap_violation_rows`** | **0** |
| **G-9** | **`users_with_both_null_and_scoped_wallet`** | **0** |
| **G-10** | **`rpc_reply_generate_commit_exists`** | **true** · unchanged |
| **G-11** | **`rpc_fulfill_checkout_exists`** | **true** · unchanged |

**Optional catalog probe (read-only):**

```sql
-- Post-apply only · run after F-2
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'consult_send_commits'
) AS consult_send_commits_table_exists;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'reply_wallet_ledgers'
    AND column_name = 'consult_commit_id'
) AS consult_commit_id_column_exists;

SELECT EXISTS (
  SELECT 1 FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'reply_wallet_ledgers'
    AND c.conname = 'reply_wallet_ledgers_reply_consume_ref_check'
) AS relaxed_ledger_check_exists;
```

**All G-* PASS → authorize C-D-EXEC-APP / push in same window.**

---

## H. Stop conditions

| # | Condition | Action |
|---|-----------|--------|
| **C-DB-R-S-1** | Missing Human GO phrase | **STOP** |
| **C-DB-R-S-2** | Preflight S-5 / cap FAIL | **STOP** · no apply |
| **C-DB-R-S-3** | Wrong Supabase project | **STOP** |
| **C-DB-R-S-4** | Migration apply error / partial DDL | **STOP** · rollback decision |
| **C-DB-R-S-5** | Post-apply **`rpc_consult_reply_commit_exists = false`** | **STOP** · no push/deploy |
| **C-DB-R-S-6** | **`consult_send_commits` missing** | **STOP** |
| **C-DB-R-S-7** | Relaxed CHECK missing / consult consume still blocked | **STOP** |
| **C-DB-R-S-8** | Push/deploy attempted before G-* PASS | **STOP** · gate violation |
| **C-DB-R-S-9** | Apply inside **READINESS** gate | **STOP** · gate violation |
| **C-DB-R-S-10** | live checkout / VERIFY-C in same window | **STOP** |

---

## I. App deploy / push status

| Action | Status |
|--------|--------|
| **C-D-EXEC-APP** | **HOLD** until §G post-DB verification PASS |
| **push `472abef` to origin/main** | **HOLD** until §G PASS · coordinate with deploy window |
| **Vercel Production deploy** | **HOLD** until DB verified |

**Brief DB-without-APP state is acceptable** (legacy send path @ **`6ce7002`** remains until deploy).

---

## J. No-mutation confirmation（this gate）

| Action | Status |
|--------|--------|
| Production DB apply / DDL / DML | **no** |
| Supabase SQL execution against Production | **no** |
| push / deploy | **no** |
| env / Stripe / webhook / VERIFY-C | **HOLD** |
| raw ID recording | **no** |

---

## K. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB`** | **yes** · Human GO + preflight + migration apply |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-APP`** | **yes** · push + deploy · **after G-* PASS** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R`** | **no** · after smoke |

**Human GO phrase（C-D-EXEC-DB · not authorized in READINESS gate）:**

```text
BACKEND-COMMERCE-CONTRACT-C-D-EXEC go
```

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB-READINESS-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-COMMIT-001`** | Local commit **`472abef`** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | Execution packet |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | Pre-C baseline |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | DB READINESS GREEN @ **`472abef`** · origin **`6ce7002`** |
