# Phase BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING — Execution planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING** |
| **Title** | **Single-row wallet `report_instance_id` backfill — Human execution packet** |
| **Classification** | **Category 1 / docs-only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_EXEC_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Target DB** | **m55-soul-core** Production only |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** |
| **Cohort** | **`strict_backfill_eligible_count = 1`** · **`strict_backfill_eligible_available_gt_0 = 1`** |
| **Contract-C** | **HOLD** |
| **VERIFY-C** | **HOLD** |
| **live checkout / payment / webhook** | **HOLD** |

**Execution planning GREEN.** **No UPDATE / DB write in this gate.** Apply only in **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** with explicit Human GO.

**Planning SSOT:** `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_PLANNING_2026-05-23.md`

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | B3-WALLET-BACKFILL-PLANNING | **GREEN** |
| 2 | SQL packet reviewed | preflight · UPDATE · postflight **ready** |
| 3 | DB write in this gate | **no** |
| 4 | commit / push / deploy | **no** |

---

## C. Inspected files（read-only）

| File | Role |
|------|------|
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_PLANNING_2026-05-23.md` | Invariant · ledger defer · stop rules |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B2_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md` | Eligible **1** anchor |
| `scripts/sql/production/m55_backend_commerce_contract_b3_wallet_backfill_preflight_v1.sql` | **Step 1** pre-apply |
| `scripts/sql/production/m55_backend_commerce_contract_b3_wallet_backfill_update_candidate_v1.sql` | **Step 2** single UPDATE |
| `scripts/sql/production/m55_backend_commerce_contract_b3_wallet_backfill_postflight_v1.sql` | **Step 3** post-apply |
| `scripts/sql/production/m55_backend_commerce_contract_b2_null_scope_wallet_readonly_preflight_v1.sql` | Optional drift cross-check |

---

## D. Human GO phrase（required for D-EXEC）

**Exact phrase for chat / ticket:**

```text
BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL go
```

**Without this phrase:** **do not run UPDATE.**

---

## E. Execution packet（Human · single maintenance window）

| Step | Action | File | Mutation |
|------|--------|------|----------|
| **0** | Confirm Supabase project = **m55-soul-core** · SQL Editor · **no other DML** in flight | — | **no** |
| **1** | Run **preflight** section-by-section · paste **counts only** to ticket | `m55_backend_commerce_contract_b3_wallet_backfill_preflight_v1.sql` | **no** |
| **1b** | **STOP** if any **§F** preflight FAIL | — | **no** |
| **2** | Human GO phrase confirmed in same ticket | — | — |
| **3** | Run **exactly one** UPDATE statement · record **`RETURNING`** row count **= 1** · paste **`hashed_wallet_pk` count only**（hash value optional · **no raw UUID**） | `m55_backend_commerce_contract_b3_wallet_backfill_update_candidate_v1.sql` | **yes** |
| **3b** | **STOP** if UPDATE affects **≠ 1** row | — | rollback decision |
| **4** | Run **postflight** section-by-section · paste **counts only** | `m55_backend_commerce_contract_b3_wallet_backfill_postflight_v1.sql` | **no** |
| **5** | Open **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R`** with postflight counts | — | **no** |

**Forbidden in same window:** quarantine UPDATE · ledger UPDATE · second forward UPDATE · DELETE · ALTER · live checkout · webhook replay.

**Idempotency:** If Step 3 re-run after success → **0 rows** · investigate before any rollback.

---

## F. Preflight requirements（Step 1 · all PASS before UPDATE）

| Metric | Required | B2-R anchor |
|--------|----------|-------------|
| **`current_database_name`** | **`postgres`** | — |
| **`dtr_user_hidden_at_column_exists`** | **`true`** | B2-R |
| **`wallets_null_report_instance_id_total`** | **5** | no drift |
| **`bucket_safe_backfill_candidate`** | **1** | B2-R |
| **`strict_backfill_eligible_count`** | **1** | **hard gate** |
| **`strict_backfill_eligible_available_gt_0`** | **1** | B2-R |
| **`bucket_dual_wallet_scoped_conflict`** | **0** | B2-R |
| **`wallets_cap_violation_rows`** | **0** | B2-R |
| **`wallets_null_purchased_gt_0`** | **0** | B2-R |
| **`eligible_and_smoke_overlap_count`** | **0** | disjoint cohort |

**Preflight FAIL → STOP** · do not proceed to UPDATE · re-run **B2-R** cadence if counts drift.

---

## G. UPDATE guard summary

**Statement:** single **`UPDATE public.reply_ticket_wallets`** in `m55_backend_commerce_contract_b3_wallet_backfill_update_candidate_v1.sql`

| Guard | Rule |
|-------|------|
| **Target column** | **`report_instance_id`** only |
| **Source** | **`dtr_report_snapshots.id`** · **`product_id = 'DTR_CORE_STATIC_V1'`** · **`user_hidden_at IS NULL`** |
| **Wallet shape** | `report_instance_id IS NULL` · `status = 'active'` · `purchased_count = 0` · `initial_included_count > 0` |
| **Smoke** | excluded |
| **Dual-wallet** | no other **active** scoped wallet for same owner |
| **Visible count** | **= 1** per owner |
| **Snapshot pick** | `ORDER BY created_at ASC, id ASC LIMIT 1` |
| **Unchanged** | `initial_included_count` · `purchased_count` · `consumed_count` · `available_count` · `status` |
| **Out of scope** | ledger · sessions · entitlements · DELETE |

---

## H. Expected rowcount

| Check | Expected |
|-------|----------|
| **UPDATE affected rows** | **1** |
| **`RETURNING` rows** | **1** |
| **Second forward UPDATE**（without rollback） | **0** |

---

## I. Postflight expected counts（Step 4 · vs B2-R baseline）

| Metric | Before（B2-R） | After（success） |
|--------|---------------|-----------------|
| **`strict_backfill_eligible_count`** | **1** | **0** |
| **`wallets_null_report_instance_id_total`** | **5** | **4** |
| **`wallets_with_report_instance_id_total`** | **5** | **6** |
| **`wallets_cap_violation_rows`** | **0** | **0** |
| **`users_with_both_null_and_scoped_wallet`** | **0** | **0** |

**Ledger:** **`ledger_null_scope_wallet_report_instance_id_null`** may **unchanged** — wallet-only apply · ledger inherit **deferred**.

**S-5:** **still STOP** after wallet backfill alone — **4** null-scope rows remain until **B3-QUARANTINE** exec.

**POSTFLIGHT-R PASS criteria:** all **§I** “After” columns match Human paste.

---

## J. Stop conditions

| # | Condition | When |
|---|-----------|------|
| **B3-WBE-S-1** | Preflight **`strict_backfill_eligible_count ≠ 1`** | before UPDATE |
| **B3-WBE-S-2** | **`wallets_cap_violation_rows > 0`** | before / after |
| **B3-WBE-S-3** | **`bucket_dual_wallet_scoped_conflict > 0`** | before UPDATE |
| **B3-WBE-S-4** | **`wallets_null_purchased_gt_0 > 0`** | before UPDATE |
| **B3-WBE-S-5** | **`eligible_and_smoke_overlap_count > 0`** | before UPDATE |
| **B3-WBE-S-6** | UPDATE rowcount **≠ 1** | during apply |
| **B3-WBE-S-7** | Postflight **`strict_backfill_eligible_count > 0`** | after apply |
| **B3-WBE-S-8** | Postflight null/scoped totals **≠ expected delta** | after apply |
| **B3-WBE-S-9** | **`users_with_both_null_and_scoped_wallet > 0`** | after apply |
| **B3-WBE-S-10** | Missing Human GO phrase | before UPDATE |
| **B3-WBE-S-11** | Wrong Supabase project | Step 0 |
| **B3-WBE-S-12** | Attempt UPDATE inside **EXEC-PLANNING** gate | gate violation |

**On stop:** document counts · **no** second UPDATE · **no** checkout · escalate rollback only with separate GO.

---

## K. Rollback / support boundary

| Topic | Policy |
|-------|--------|
| **DELETE** | **prohibited** |
| **Rollback DML** | Separate explicit GO · commented block in UPDATE candidate file · **`report_instance_id = NULL`** on **same guarded cohort** only |
| **Raw IDs** | **Human-private** for rollback targeting · **never** in SSOT or public tickets |
| **Balance rollback** | **n/a** — apply does not touch balances |
| **Ledger rollback** | **n/a** in wallet-only exec |
| **Support evidence** | Preflight counts · UPDATE rowcount · postflight counts · optional single **`hashed_wallet_pk`** |

---

## L. No-mutation（this gate）

| Action | Status |
|--------|--------|
| Production UPDATE / backfill apply | **no** |
| quarantine apply | **no** |
| code edit | **no** |
| commit | **no**（unless explicit Human GO） |
| push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID in SSOT | **no** |

---

## M. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** | **COMPLETE** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R`** | **CLOSED** GREEN |
| **3** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** | **NEXT** |

---

## N. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** | POSTFLIGHT-R GREEN close |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** | Quarantine planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** | Planning · SQL drafts |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** | Eligible **1** anchor |

---

## O. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | EXEC-PLANNING GREEN @ **`6ce7002`** |
