# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B3 — Shadow apply execution packet（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B3** |
| **Title** | **Soft-hide migration staging apply — m55-soul-shadow only** |
| **Classification** | **Category 2 / Human-executed DB apply + agent packet** |
| **Human GO** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-B3 go`** |
| **Agent verdict（this session）** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B3_AGENT_NO_SHADOW_DB_ACCESS_EXECUTION_PACKET_READY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B3-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **B2-R** @ **`414a199`** — `CORE_DTR_SOFT_HIDE_REPURCHASE_B2_SHADOW_PREFLIGHT_GREEN_NO_APPLY` |

**Agent:** no Supabase credentials — **Human runs** apply script in SQL Editor.** **Production:** **forbidden**.

---

## B. Target attestation

| Field | Value |
|-------|--------|
| **safe label** | **m55-soul-shadow** |
| **Production used** | **no** |
| **m55-soul-core used** | **no** |
| **Migration file** | `supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql` |
| **Execution script** | `scripts/sql/staging/m55_soft_hide_repurchase_b3_shadow_apply_verify_v1.sql` |

---

## C. Human execution steps（ordered）

| Step | Action |
|------|--------|
| **1** | Open **Supabase Dashboard** → project **m55-soul-shadow** |
| **2** | SQL Editor → paste **entire** `m55_soft_hide_repurchase_b3_shadow_apply_verify_v1.sql` |
| **3** | Confirm PART 0 comments in ticket（safe label, production_used=no） |
| **4** | Run **once** — if `PREFLIGHT_user_hidden_at_exists = 1`, **STOP**（already applied） |
| **5** | Record PREFLIGHT + POSTFLIGHT metrics in **B3-R** gate（counts only） |
| **6** | Do **not** run on **m55-soul-core** |

---

## D. POSTFLIGHT PASS criteria（B3）

| Metric | Expected |
|--------|----------|
| **POSTFLIGHT_user_hidden_at_exists** | **1** |
| **POSTFLIGHT_user_hidden_source_exists** | **1** |
| **POSTFLIGHT_user_hidden_reason_exists** | **1** |
| **POSTFLIGHT_partial_unique_index_exists** | **1** |
| **POSTFLIGHT_total_snapshot_rows** | **= PREFLIGHT**（B2-R baseline **2**） |
| **POSTFLIGHT_user_hidden_at_nonnull_count** | **0** |
| **POSTFLIGHT_legacy_duplicate_user_product_pairs** | **0** |
| **POSTFLIGHT_legacy_table_unique_constraint_count** | **0** |

---

## E. Forbidden（absolute）

| Forbidden | Status |
|-----------|--------|
| Production DB | **no** |
| Re-run PART 2 if already applied | **no** |
| DELETE / TRUNCATE / DROP TABLE | **no** |
| UPDATE snapshot body columns | **no** |
| checkout / payment / webhook | **no** |
| deploy / main / env | **no** |
| **VERIFY-C** | **no** |

---

## F. Agent no-mutation

| Action | Status |
|--------|--------|
| Agent connected to shadow DB | **no** |
| Agent executed migration | **no** |
| Production touched | **no** |

---

## G. Next gates

| Gate | When |
|------|------|
| **B3-R** | Human posts POSTFLIGHT metrics → docs result |
| **B3-COMMIT** | Commit B3 script + B3-R SSOT |
| **B4+** | Code read-path / hide API（after shadow schema GREEN） |

---

## H. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | B3 execution packet；agent no DB access |
