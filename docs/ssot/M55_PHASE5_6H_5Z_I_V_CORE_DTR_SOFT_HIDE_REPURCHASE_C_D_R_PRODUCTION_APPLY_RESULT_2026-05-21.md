# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-D-R — Production apply result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-D-R** |
| **Title** | **Production soft-hide migration apply result** |
| **Classification** | **Category 1 / Human attestation / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_C_D_R_PRODUCTION_APPLY_GREEN`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-D-R-001`** |
| **Date** | **2026-05-21** |
| **Target** | **m55-soul-core** |
| **Production used** | **yes** |
| **Shadow used** | **no** |
| **Human GO** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-C-D go`** |
| **Migration** | `supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql` |
| **Apply script** | `scripts/sql/production/m55_soft_hide_repurchase_c_d_production_apply_verify_v1.sql` |
| **Execution count** | **1** |
| **SQL Editor result** | **Success** · **9 rows returned** · **~170 ms** |
| **Git baseline** | **`work/home-cluster` @ `2c20afb`+** |

**DB layer complete.** **Frontend/API implementation not done.** **Code deploy not authorized** in this gate.

---

## B. Human execution attestation

| Item | Value |
|------|--------|
| **safe label** | **m55-soul-core** |
| **Production used** | **yes** |
| **execution count** | **1** |
| **SQL error** | **none** |
| **Re-run after error** | **no** |

---

## C. Preflight（PART 1 — pre-apply）

| Metric | Value |
|--------|------:|
| **PREFLIGHT_total_snapshot_rows** | **6** |
| **PREFLIGHT_user_hidden_at_exists** | **0** |

*Matches **C-R** preflight.*

---

## D. Postflight（PART 3 — post-apply）

| Metric | Value | Expected | Result |
|--------|------:|----------|--------|
| **user_hidden_at_exists** | **1** | **1** | **PASS** |
| **user_hidden_source_exists** | **1** | **1** | **PASS** |
| **user_hidden_reason_exists** | **1** | **1** | **PASS** |
| **partial_unique_index_exists** | **1** | **1** | **PASS** |
| **total_snapshot_rows** | **6** | **6** | **PASS** |
| **user_hidden_at_nonnull_count** | **0** | **0** | **PASS** |
| **legacy_duplicate_user_product_pairs** | **0** | **0** | **PASS** |

**Result classification:** **GREEN**

---

## E. Interpretation（Human）

| Topic | Reading |
|-------|---------|
| **Apply** | Production soft-hide migration **succeeded** on **m55-soul-core** |
| **Columns** | `user_hidden_at`, `user_hidden_source`, `user_hidden_reason` **present** |
| **Index** | Partial unique on `(user_id, product_id) WHERE user_hidden_at IS NULL` **created** |
| **Row integrity** | **6** rows retained；**no** row hidden by migration |
| **Duplicates** | **No** visible duplicate pairs |
| **Engine legacy** | Unchanged（C-R: all **6** legacy NULL engine columns） |
| **App layer** | **Not implemented** — hide API, `/my` delete UI, `getVisibleDtrReportSnapshot` pending |

---

## F. Forbidden performed

| Item | Status |
|------|--------|
| checkout / payment / webhook | **no** |
| env change | **no** |
| deploy / main push | **no** |
| snapshot content UPDATE / DELETE | **no** |
| entitlement deletion | **no** |
| **CORE-DTR-VERIFY-C** | **no** |

---

## G. No-mutation statement（this gate）

| Action | Status |
|--------|--------|
| Production DDL apply | **done**（Human C-D） |
| Production DML on snapshot bodies | **no** |
| code deploy | **no** |
| checkout / env | **no** |

---

## H. Next gates

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C-D-R-COMMIT** |
| **2** | **CORE-DTR-SOFT-HIDE-REPURCHASE-D**（or **-C** code track）— hide API + `/my` UI **implementation planning** |
| **3** | Implementation gates — `getVisibleDtrReportSnapshot`, delete confirm, checkout repurchase lane |

**VERIFY-C:** remains **HOLD**（orthogonal）.

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v0.1 | 2026-05-21 | Template pending POSTFLIGHT |
| v1.0 | 2026-05-21 | Human C-D-R GREEN @ m55-soul-core |
