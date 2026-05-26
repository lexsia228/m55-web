# Phase BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING — Execution planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING** |
| **Title** | **Null-scope wallet quarantine — Human execution packet（status close only）** |
| **Classification** | **Category 1 / docs-only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_EXEC_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Target DB** | **m55-soul-core** Production only |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** |
| **Cohort** | null **4** · smoke **3** · no_visible **1** · strict eligible **0** |
| **Contract-C** | **HOLD** |
| **VERIFY-C** | **HOLD** |
| **live checkout / payment / webhook** | **HOLD** |

**Execution planning GREEN.** **No UPDATE / quarantine apply in this gate.** Apply only in **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** with explicit Human GO.

**Planning SSOT:** `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_PLANNING_2026-05-23.md`

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | B3-QUARANTINE-PLANNING | **GREEN** · Option D |
| 2 | Wallet backfill POSTFLIGHT-R | **GREEN** · null **4** anchor |
| 3 | SQL packet reviewed | preflight · UPDATE · postflight **ready** |
| 4 | DB write in this gate | **no** |

---

## C. Inspected files（read-only）

| File | Role |
|------|------|
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_PLANNING_2026-05-23.md` | Semantics · S-5 definition · stop rules |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_POSTFLIGHT_R_2026-05-23.md` | Inventory anchor |
| `docs/ssot/M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md` | Close-not-delete policy |
| `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_readonly_preflight_v1.sql` | **Step 1** pre-apply |
| `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_update_candidate_v1.sql` | **Step 2** status close UPDATE |
| `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_postflight_v1.sql` | **Step 3** post-apply |
| `app/api/room/core/send/route.ts` | Live **`status === 'active'`** gate |

---

## D. Human GO phrase（required for D-EXEC）

**Exact phrase for chat / ticket:**

```text
BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE go
```

**Without this phrase:** **do not run UPDATE.**

---

## E. Execution packet（Human · single maintenance window）

| Step | Action | File | Mutation |
|------|--------|------|----------|
| **0** | Confirm Supabase project = **m55-soul-core** · no other DML in flight | — | **no** |
| **1** | Run **preflight** section-by-section · paste **counts only** | `m55_backend_commerce_contract_b3_quarantine_readonly_preflight_v1.sql` | **no** |
| **1b** | **STOP** if any **§F** preflight FAIL | — | **no** |
| **2** | Human GO phrase confirmed in same ticket | — | — |
| **3** | Run **exactly one** UPDATE · record row count · **`RETURNING`** hash count only | `m55_backend_commerce_contract_b3_quarantine_update_candidate_v1.sql` | **yes** |
| **3b** | **STOP** if rowcount **≠** preflight **`quarantine_apply_candidate_count`** | — | rollback decision |
| **4** | Run **postflight** section-by-section · paste **counts only** | `m55_backend_commerce_contract_b3_quarantine_postflight_v1.sql` | **no** |
| **5** | Open **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R`** | — | **no** |
| **6** | Schedule **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** after POSTFLIGHT-R GREEN | — | **no** |

**Forbidden in same window:** wallet backfill UPDATE · ledger UPDATE · balance mutation · DELETE · ALTER · live checkout · webhook replay.

**Idempotency:** Re-run forward UPDATE after success → **0 rows** · postflight should show **`quarantine_apply_candidate_count = 0`**.

**Note:** **`quarantine_apply_candidate_count`** may be **< 4** if some null rows already **`closed`** — rowcount must match preflight, not assumed **4**.

---

## F. Preflight requirements（Step 1 · all PASS before UPDATE）

| Metric | Required | Anchor |
|--------|----------|--------|
| **`current_database_name`** | **`postgres`** | — |
| **`wallets_null_report_instance_id_total`** | **4** | POSTFLIGHT-R |
| **`strict_backfill_eligible_count`** | **0** | backfill complete |
| **`cohort_smoke_quarantine`** | **3** | B2-R |
| **`cohort_no_visible_snapshot_quarantine`** | **1** | B2-R |
| **`cohort_smoke + cohort_no_visible`** | **= 4** | partition |
| **`wallets_null_purchased_gt_0`** | **0** | B2-R |
| **`wallets_cap_violation_rows`** | **0** | B2-R |
| **`users_with_both_null_and_scoped_wallet`** | **0** | B2-R |
| **`quarantine_apply_candidate_count`** | **≥ 1** if any **active** null cohort remains · record exact value | **hard gate for rowcount** |
| **`cohort_unexpected_backfill_shape`** | **0** | no backfill regression |

**Preflight FAIL → STOP** · do not proceed to UPDATE.

---

## G. UPDATE guard summary

**Statement:** single **`UPDATE public.reply_ticket_wallets`** in `m55_backend_commerce_contract_b3_quarantine_update_candidate_v1.sql`

| Guard | Rule |
|-------|------|
| **Sets** | **`status = 'closed'`** · **`updated_at = now()`** only |
| **Does not set** | balances · **`report_instance_id`** · ledger |
| **Wallet scope** | **`report_instance_id IS NULL`** |
| **Prior status** | **`active`** only |
| **Purchased** | **`purchased_count = 0`** |
| **Smoke cohort** | `smoke_user%` / `smoke\_user\_%` pattern |
| **No-visible cohort** | visible DTR snapshot count **= 0** |
| **Excludes backfill shape** | NOT strict eligible（visible = 1 · non-smoke · no dual scoped wallet） |
| **DELETE** | **prohibited** |

**No-visible row:** close only · **must not** set **`report_instance_id`**.

---

## H. Expected rowcount

| Check | Expected |
|-------|----------|
| **Preflight `quarantine_apply_candidate_count`** | Human-recorded · typically **1–4** |
| **UPDATE affected rows** | **= preflight `quarantine_apply_candidate_count`** |
| **`RETURNING` rows** | same as affected rows |
| **Second forward UPDATE**（without rollback） | **0** |

**Not required:** rowcount **= 4** if some rows already **`closed`**.

---

## I. Postflight expected counts（Step 4）

| Metric | Expected after successful apply |
|--------|--------------------------------|
| **`wallets_null_report_instance_id_total`** | **4**（rows retained · scope still NULL） |
| **`wallets_null_status_active`** | **0** |
| **`wallets_null_active_available_gt_0`** | **0** |
| **`wallets_null_status_closed`** | **4**（if all **4** were candidates or already closed） |
| **`quarantine_apply_candidate_count`** | **0** |
| **`strict_backfill_eligible_count`** | **0** |
| **`wallets_cap_violation_rows`** | **0** |
| **`wallets_null_purchased_gt_0`** | **0** |
| **`users_with_both_null_and_scoped_wallet`** | **0** |

**S-5 spendability axis:** **`active` null-scope = 0** · **`active` null available = 0**.

**Full S-5 formal close:** requires **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** after POSTFLIGHT-R GREEN.

---

## J. Stop conditions

| # | Condition | When |
|---|-----------|------|
| **B3-QE-S-1** | **`wallets_null_report_instance_id_total ≠ 4`** | before UPDATE |
| **B3-QE-S-2** | **`strict_backfill_eligible_count > 0`** | before UPDATE |
| **B3-QE-S-3** | smoke **+** no_visible **≠ 4** | before UPDATE |
| **B3-QE-S-4** | **`wallets_cap_violation_rows > 0`** | before / after |
| **B3-QE-S-5** | **`wallets_null_purchased_gt_0 > 0`** | before UPDATE |
| **B3-QE-S-6** | **`cohort_unexpected_backfill_shape > 0`** | before UPDATE |
| **B3-QE-S-7** | **`quarantine_apply_candidate_count = 0`** while **`wallets_null_active_available_gt_0 > 0`** | before UPDATE |
| **B3-QE-S-8** | UPDATE rowcount **≠** preflight candidate count | during apply |
| **B3-QE-S-9** | Postflight **`wallets_null_status_active > 0`** | after apply |
| **B3-QE-S-10** | Postflight **`quarantine_apply_candidate_count > 0`** | after apply |
| **B3-QE-S-11** | Missing Human GO phrase | before UPDATE |
| **B3-QE-S-12** | DELETE or balance mutation attempted | gate violation |
| **B3-QE-S-13** | UPDATE inside **EXEC-PLANNING** gate | gate violation |

---

## K. Rollback / support boundary

| Topic | Policy |
|-------|--------|
| **DELETE** | **prohibited** |
| **Rollback DML** | Separate explicit GO · commented block in UPDATE candidate · **`status = 'active'`** restore only · **raw IDs human-private** |
| **Balance rollback** | **n/a** — apply does not touch balances |
| **Ledger** | **unchanged** in quarantine EXEC |
| **Support evidence** | Preflight counts · UPDATE rowcount · postflight counts · optional hashed **`RETURNING`** count |

---

## L. S-5 combined postflight dependency

| Gate | Role |
|------|------|
| **B3-QUARANTINE-POSTFLIGHT-R** | Confirms quarantine track GREEN · spendability metrics |
| **B3-S5-COMBINED-POSTFLIGHT-R** | Reconcile wallet backfill + quarantine · formal **S-5** verdict for Contract-C entry |
| **Contract-C** | **HOLD** until combined postflight PASS + separate implementation GO |

**Combined postflight should re-run:**

- B2 §1 null inventory · B3 quarantine postflight metrics · cap · dual-wallet · **`wallets_null_status_active = 0`**

---

## M. No-mutation（this gate）

| Action | Status |
|--------|--------|
| quarantine apply / UPDATE | **no** |
| code edit | **no** |
| commit | **no**（unless explicit Human GO） |
| push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID in SSOT | **no** |

---

## N. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** | **COMPLETE** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** | **CLOSED** GREEN |
| **4** | **`BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING`** | **NEXT** |

---

## O. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** | Planning · Option D |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** | POSTFLIGHT-R attestation |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** | null **4** anchor |

---

## P. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | EXEC-PLANNING GREEN @ **`6ce7002`** |
