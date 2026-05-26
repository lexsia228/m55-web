# Phase BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING — Execution planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING** |
| **Title** | **Contract-C Human execution packet — DB migration · app deploy · smoke · postflight** |
| **Classification** | **Category 1 / execution planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_D_EXEC_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor（pre-apply）** | **`main`** @ **`6ce7002`** |
| **Target DB** | **m55-soul-core** Production only |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_MIGRATION_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** |
| **C-D-EXEC** | **HOLD** until explicit Human GO in **`C-D-EXEC-DB`** / **`C-D-EXEC-APP`** window |
| **VERIFY-C / live checkout / payment / webhook replay** | **HOLD** |

**Execution planning GREEN.** **No migration apply · no app deploy · no DB write in this gate.**

**Planning chain:** IMPLEMENTATION-PLANNING → MIGRATION-PLANNING → **本条** → C-D-EXEC sub-gates → C-POSTFLIGHT-R

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | C-MIGRATION-PLANNING | **GREEN** · candidate design frozen |
| 2 | C-HUMAN-R pre-C baseline | **GREEN** · S-5 non-regression |
| 3 | Execution split defined | DB → APP → smoke → postflight |
| 4 | Mutation in this gate | **no** |

---

## C. Inspected files（read-only）

| File | Role |
|------|------|
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_MIGRATION_PLANNING_2026-05-23.md` | Migration candidate · D-EXEC split |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_IMPLEMENTATION_PLANNING_2026-05-23.md` | RPC spec · test matrix |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_HUMAN_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md` | Pre-C attestation |
| `scripts/sql/production/m55_backend_commerce_contract_c_readonly_preflight_v1.sql` | **Step 0** pre-apply · post-apply baseline |
| `supabase/migrations/20260523120000_m55_consult_reply_commit_rpc_v1.sql` | **future** migration artifact path |
| `app/api/room/core/send/route.ts` | APP refactor target |
| `app/api/room/core/route.ts` | GET refactor target |
| `components/dtr/ConsultRoom.tsx` | idempotency · cap=5 UI |

---

## D. Human GO phrase（required for C-D-EXEC）

**Exact phrase for chat / ticket:**

```text
BACKEND-COMMERCE-CONTRACT-C-D-EXEC go
```

**Without this phrase:** **do not apply migration · do not deploy app.**

**Scope:** authorizes **`C-D-EXEC-DB`** + **`C-D-EXEC-APP`** in the same maintenance window when Human confirms.

---

## E. Execution packet（Human · single maintenance window）

| Step | Sub-gate | Action | Mutation |
|------|----------|--------|----------|
| **0** | — | Confirm Supabase = **m55-soul-core** · Vercel target = Production · no other DML in flight | **no** |
| **1** | — | Human GO phrase confirmed in ticket | — |
| **2** | preflight | Run `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` section-by-section · **counts/booleans only** | **no** |
| **2b** | preflight | **STOP** if §1 S-5 or §3 cap FAIL | **no** |
| **3** | **C-D-EXEC-DB** | Apply migration **`20260523120000_m55_consult_reply_commit_rpc_v1.sql`** · record apply success booleans only | **yes** · DDL |
| **3b** | **C-D-EXEC-DB** | Verify **`rpc_consult_reply_commit_exists = true`** · **`consult_send_commits` table exists** | **no** |
| **3c** | **C-D-EXEC-DB** | **STOP** if RPC missing after apply | — |
| **4** | **C-D-EXEC-APP** | Deploy app with send/GET/ConsultRoom refactor · record deploy id / status only | **yes** · code |
| **4b** | **C-D-EXEC-APP** | **STOP** if app deployed before DB step 3 success | — |
| **5** | smoke | Controlled send smoke（§I）· no checkout · no webhook | read-only observe |
| **6** | **C-POSTFLIGHT-R** | Re-run C preflight SQL + attestation gate | **no** |
| **7** | — | Open **`BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R`** SSOT close | **no** |

**Forbidden in same window:** live ¥500 checkout · webhook replay · VERIFY-C · Stripe Dashboard mutation · env value changes · unrelated DML.

---

## F. DB-before-app ordering（mandatory）

```
┌─────────────────────────────────────────────────────────────────┐
│  preflight (read-only)                                          │
│       ↓ PASS                                                    │
│  C-D-EXEC-DB: migration apply                                   │
│       ↓ rpc_consult_reply_commit_exists = true                    │
│  C-D-EXEC-APP: deploy send/GET/UI                                │
│       ↓                                                           │
│  smoke (send path · idempotency · no checkout)                   │
│       ↓                                                           │
│  C-POSTFLIGHT-R (read-only SQL attestation)                      │
└─────────────────────────────────────────────────────────────────┘
```

| Rule | Rationale |
|------|-----------|
| **DB before APP** | New send route calls **`m55_consult_reply_commit`** · app-first → hard 500 on send |
| **Same window allowed** | DB apply immediately followed by deploy · no drift window with partial users |
| **APP without DB** | **STOP** · gate violation |
| **DB without APP** | Acceptable brief state · old send still works until deploy · prefer minimal gap |

---

## G. Preflight requirements（Step 2 · all PASS before DB apply）

| Metric | Required | Anchor |
|--------|----------|--------|
| **`current_database_name`** | **`postgres`** | — |
| **`wallets_null_status_active`** | **0** | C-HUMAN-R · B3-S5 |
| **`wallets_null_active_available_gt_0`** | **0** | C-HUMAN-R |
| **`quarantine_apply_candidate_count`** | **0** | C-HUMAN-R |
| **`wallets_cap_violation_rows`** | **0** | C-HUMAN-R |
| **`users_with_both_null_and_scoped_wallet`** | **0** | C-HUMAN-R |
| **`wallets_with_report_instance_id_total`** | **6** | C-HUMAN-R band |
| **`rpc_consult_reply_commit_exists`** | **false** | pre-C expected |
| **`rpc_reply_generate_commit_exists`** | **true** | C-HUMAN-R |
| **`rpc_fulfill_checkout_exists`** | **true** | C-HUMAN-R |

**Preflight FAIL → STOP** · do not apply migration.

---

## H. DB apply stop conditions（C-D-EXEC-DB）

| # | Condition | Action |
|---|-----------|--------|
| **C-DB-S-1** | Missing Human GO phrase | **STOP** |
| **C-DB-S-2** | Preflight S-5 / cap FAIL | **STOP** |
| **C-DB-S-3** | Wrong Supabase project | **STOP** |
| **C-DB-S-4** | Migration apply error / partial DDL | **STOP** · rollback decision |
| **C-DB-S-5** | Post-apply **`rpc_consult_reply_commit_exists = false`** | **STOP** · do not deploy app |
| **C-DB-S-6** | **`consult_send_commits` table missing** after apply | **STOP** |
| **C-DB-S-7** | Ledger CHECK not updated · consult path still blocked | **STOP** |
| **C-DB-S-8** | S-5 metrics regress during apply window | **STOP** · ops review |
| **C-DB-S-9** | Apply inside **D-EXEC-PLANNING** gate | **STOP** · gate violation |

**Migration artifact（when created in repo before apply）:**

| Object | Expected after apply |
|--------|----------------------|
| **`consult_send_commits`** | table + UNIQUE + indexes |
| **`reply_wallet_ledgers.consult_commit_id`** | column + FK |
| **ledger CHECK** | `reply_consume` allows `consult_commit_id` |
| **`m55_consult_reply_commit`** | function · GRANT service_role |

---

## I. App deploy stop conditions（C-D-EXEC-APP）

| # | Condition | Action |
|---|-----------|--------|
| **C-APP-S-1** | Deploy before DB step 3 success | **STOP** |
| **C-APP-S-2** | Send route still contains direct **`reply_ticket_wallets` UPDATE** | **STOP** · wrong artifact |
| **C-APP-S-3** | Send route missing **`X-Idempotency-Key`** requirement | **STOP** |
| **C-APP-S-4** | Pre-RPC **`consult_messages` INSERT** still present | **STOP** |
| **C-APP-S-5** | GET still uses user_id-only wallet fallback as spend authority | **STOP** |
| **C-APP-S-6** | Deploy without Human GO | **STOP** |

**Expected app diff scope（P0 · when implemented）:**

| File | Change |
|------|--------|
| `app/api/room/core/send/route.ts` | RPC-only · idempotency header |
| `app/api/room/core/route.ts` | scoped wallet · cap=5 display |
| `components/dtr/ConsultRoom.tsx` | idempotency UUID · cap copy |

---

## J. Smoke checklist（Step 5 · no checkout）

| # | Check | Expected |
|---|-------|----------|
| **SM-1** | **`GET /api/room/core`** returns wallet SSOT fields · cap display **5** band | PASS |
| **SM-2** | Send without idempotency header | **400** |
| **SM-3** | Safety block message | **422** · no RPC · wallet unchanged |
| **SM-4** | Successful send（controlled test account） | **200** · 2 messages · wallet--1 |
| **SM-5** | Post-send ledger | **`reply_consume` +1** with **`consult_commit_id` populated** |
| **SM-6** | Retry same idempotency key | single consume · replay response |
| **SM-7** | Null-scope rows | still **`closed`** · not debited |
| **SM-8** | No Stripe checkout / webhook in smoke | HOLD respected |

**Smoke account:** use existing owned test path · **no raw IDs in ticket** · counts only.

---

## K. Postflight checklist（Step 6 · C-POSTFLIGHT-R input）

Re-run `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` + attestation:

| Metric | Expected post-apply |
|--------|---------------------|
| **`rpc_consult_reply_commit_exists`** | **true** |
| **`consult_send_commits` table** | **exists** |
| **`consult_commit_id` column** | **exists** |
| **`wallets_null_status_active`** | **0** |
| **`wallets_cap_violation_rows`** | **0** |
| **`ledger_reply_consume_total`** | **≥ pre-apply** · +smoke consumes |
| **`scoped_wallets_consumed_without_reply_consume_ledger`** | **no new gap** on post-C sends |

**Formal close:** **`BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R`** gate · separate SSOT.

**Future postflight SQL path:** `scripts/sql/production/m55_backend_commerce_contract_c_postflight_v1.sql`（to be created in implementation gate · not this gate）

---

## L. Rollback / support boundary

| Layer | Policy |
|-------|--------|
| **App rollback** | Redeploy prior artifact @ **`6ce7002`** · restores legacy direct UPDATE send path |
| **DB rollback** | **Separate explicit Human GO** · DROP FUNCTION · DROP TABLE · restore CHECK · **no wallet row DELETE** |
| **Partial DB apply** | **STOP** · do not deploy app · assess DDL state before retry |
| **Ledger rows post-smoke** | **`recovery_adjust`** only with ops GO · no silent delete |
| **Historical pre-C consume gap** | **not repaired** in C-D-EXEC · optional C-12 / P1 |
| **Support evidence** | preflight counts · apply booleans · deploy status · postflight counts · smoke PASS table |

**DELETE on Production:** **prohibited** in rollback unless separate catastrophic ops GO.

---

## M. Sub-gate map

| Sub-gate | Mutation | Human GO | Next SSOT |
|----------|----------|----------|-----------|
| **C-D-EXEC-PLANNING** | **no** | — | **本条** |
| **C-D-EXEC-DB** | DDL + RPC | **`C-D-EXEC go`** | apply log in ticket |
| **C-D-EXEC-APP** | code deploy | same GO | deploy log in ticket |
| **C-POSTFLIGHT-R** | **no** | — | postflight SSOT |

---

## N. No-mutation（this gate）

| Action | Status |
|--------|--------|
| migration file creation | **no** |
| code edit | **no** |
| DB apply / DDL / DML | **no** |
| app deploy | **no** |
| commit / push / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID recording | **no** |

---

## O. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB`** | **HOLD** · **`C-D-EXEC go`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-APP`** | **yes** · same window after DB |
| **4** | **`BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R`** | **no** |

**Note:** Repo implementation（migration file + code）must exist **before** Production **`C-D-EXEC-DB`**. Planning gates did not create artifacts by design.

**Optional parallel:** **`BACKEND-COMMERCE-CONTRACT-C-STAGING-SHADOW-VERIFY`** before Production DB apply.

---

## P. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** | Migration candidate |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** | RPC spec |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | Pre-C baseline |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | S-5 anchor |

---

## Q. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | D-EXEC-PLANNING GREEN @ **`6ce7002`** · Human packet frozen |
