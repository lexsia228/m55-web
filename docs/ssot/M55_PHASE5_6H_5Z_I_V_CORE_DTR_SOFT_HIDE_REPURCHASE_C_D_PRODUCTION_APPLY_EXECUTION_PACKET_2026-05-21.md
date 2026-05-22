# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-D — Production DDL apply（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-D** |
| **Title** | **Production soft-hide migration apply — Human execution** |
| **Classification** | **Category 2 / Human-executed Production DDL** |
| **Human GO** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-C-D go`** |
| **Agent verdict（packet）** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_C_D_AGENT_NO_DB_ACCESS_EXECUTION_PACKET_READY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-D-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **C-R** @ **`2c20afb`** — `CORE_DTR_SOFT_HIDE_REPURCHASE_C_R_PRODUCTION_PREFLIGHT_GREEN_READY_FOR_APPLY_PENDING_HUMAN_GO` |

**Production DDL apply explicitly authorized by Human GO in this gate.** Agent does not execute DDL.

---

## B. Target

| Field | Value |
|-------|--------|
| **safe label** | **m55-soul-core** |
| **Production used** | **yes** |
| **Shadow used** | **no** |
| **Migration** | `supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql` |
| **Script（recommended）** | `scripts/sql/production/m55_soft_hide_repurchase_c_d_production_apply_verify_v1.sql` |

---

## C. Human execution steps

| Step | Action |
|------|--------|
| **1** | Dashboard → **m55-soul-core**（not shadow） |
| **2** | Paste **entire** apply-verify SQL file |
| **3** | Confirm PART 1 matches C-R（rows **6**, `user_hidden_at_exists=0`） |
| **4** | Run **once** — on error **STOP**（no retry） |
| **5** | Record PART 3 POSTFLIGHT in **C-D-R** |
| **6** | Record verdict **GREEN** / **BLOCKED** / **RED** |

---

## D. POSTFLIGHT expected（C-D-R GREEN）

| Metric | Expected |
|--------|----------|
| **user_hidden_at_exists** | **1** |
| **user_hidden_source_exists** | **1** |
| **user_hidden_reason_exists** | **1** |
| **partial_unique_index_exists** | **1** |
| **total_snapshot_rows** | **6** |
| **user_hidden_at_nonnull_count** | **0** |
| **legacy_duplicate_user_product_pairs** | **0** |

---

## E. STOP conditions

| Condition | Action |
|-----------|--------|
| Wrong Supabase project | **STOP** |
| SQL error on PART 2 | **STOP** — no re-run |
| `total_snapshot_rows ≠ 6` | **STOP** |
| `user_hidden_at_nonnull_count > 0` | **STOP** |
| `legacy_duplicate > 0` | **STOP** |
| `user_hidden_at_exists = 1` before PART 2 | **SKIP** PART 2（already applied）→ verify only |

---

## F. Forbidden

checkout · payment · webhook · env · deploy · main · snapshot body UPDATE/DELETE · entitlement delete · **VERIFY-C**

---

## G. Next

**C-D-R:** **`CORE_DTR_SOFT_HIDE_REPURCHASE_C_D_R_PRODUCTION_APPLY_GREEN`** @ `docs/ssot/M55_PHASE5_6H_5Z_I_V_CORE_DTR_SOFT_HIDE_REPURCHASE_C_D_R_PRODUCTION_APPLY_RESULT_2026-05-21.md`

**CORE-DTR-SOFT-HIDE-REPURCHASE-C-D-R-COMMIT** → **SOFT-HIDE-D** code planning
