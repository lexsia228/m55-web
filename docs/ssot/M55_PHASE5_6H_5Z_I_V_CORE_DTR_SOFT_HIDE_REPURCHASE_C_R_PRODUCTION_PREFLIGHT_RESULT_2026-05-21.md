# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-R — Production preflight result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-R** |
| **Title** | **Production soft-hide migration preflight result recording** |
| **Classification** | **Category 1 / Human attestation / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_C_R_PRODUCTION_PREFLIGHT_GREEN_READY_FOR_APPLY_PENDING_HUMAN_GO`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-R-001`** |
| **Date** | **2026-05-21** |
| **Target** | **m55-soul-core** |
| **Production used** | **yes**（preflight read-only only） |
| **Preflight SQL** | `scripts/sql/production/m55_soft_hide_repurchase_b1_preflight_v1.sql` |
| **Git baseline** | **`work/home-cluster` @ `95ccc29`** |
| **Execution count** | **1** |
| **SELECT *** | **no** |
| **metric/value only** | **yes** |
| **Prerequisite** | **C** planning · **B3-R** shadow apply GREEN |
| **Raw user_id / email / session / Stripe ID / secret** | **not shared** |

**Preflight GREEN only.** **Production migration apply not authorized** in this gate.

---

## B. Human metrics（counts only）

| Metric | Value |
|--------|------:|
| **total_snapshot_rows** | **6** |
| **dtr_core_snapshot_rows** | **6** |
| **legacy_duplicate_user_product_pairs** | **0** |
| **unique_constraint_or_index_detected** | **1** |
| **partial_unique_index_exists** | **0** |
| **user_hidden_at_exists** | **0** |
| **user_hidden_source_exists** | **0** |
| **user_hidden_reason_exists** | **0** |
| **product_label_exists** | **0** |
| **engine_context_json_exists** | **1** |
| **engine_version_exists** | **1** |
| **engine_context_json_nonnull_count** | **0** |
| **engine_version_nonnull_count** | **0** |
| **engine_context_json_null_count** | **6** |
| **engine_version_null_count** | **6** |
| **failed_fulfillments_24h** | **0** |

---

## C. PASS / STOP evaluation

| Check | Expected（pre-apply） | Observed | Result |
|-------|----------------------|----------|--------|
| **legacy_duplicate_user_product_pairs** | **0** | **0** | **PASS** |
| **unique_constraint_or_index_detected** | **≥ 1** | **1** | **PASS** |
| **user_hidden_* exists** | **0** each | **0** | **PASS**（not migrated） |
| **partial_unique_index_exists** | **0** | **0** | **PASS** |
| **failed_fulfillments_24h** | **0** | **0** | **PASS** |
| **Preflight SQL error-free** | yes | yes | **PASS** |

**STOP conditions:** **none triggered.**

**Readiness class:** **`READY_FOR_PRODUCTION_APPLY_PENDING_HUMAN_GO`**

---

## D. Interpretation（Human）

| Topic | Reading |
|-------|---------|
| **Snapshots** | **6** Production rows；all **DTR_CORE** product |
| **Legacy engine** | All **6** rows：`engine_context_json` / `engine_version` **NULL**（v2 write flag OFF consistent） |
| **Duplicates** | No `(user_id, product_id)` duplicate pairs |
| **Legacy unique** | Table-level unique on `(user_id, product_id)` **present** — migration DROP target confirmed |
| **Soft-hide** | Columns **not** applied；partial unique index **not** present |
| **Ops** | **failed_fulfillments_24h = 0** — no bleed block |
| **Apply** | **Ready** only after separate **`CORE-DTR-SOFT-HIDE-REPURCHASE-C-D`**（or C-APPLY）Human GO |

---

## E. Shadow vs Production（reference）

| Field | Shadow（B3-R） | Production（C-R） |
|-------|----------------|-------------------|
| **total_snapshot_rows** | **2** | **6** |
| **dtr_core_snapshot_rows** | **0** | **6** |
| **legacy_duplicate** | **0** | **0** |
| **user_hidden_* pre-apply** | **0** | **0** |

**Different fixture density** — soft-hide DDL logic validated on shadow；Production scale **6** rows.

---

## F. Production apply boundary

| Rule | Status |
|------|--------|
| **This gate authorizes Production DDL apply** | **no** |
| **Next** | **C-R-COMMIT** → **C-D** with explicit Human GO phrase |
| **VERIFY-C** | **HOLD** — do not conflate |

---

## G. No-mutation statement

| Action | Status |
|--------|--------|
| Production migration apply / ALTER | **no** |
| DB write（DDL/DML） | **no** |
| checkout / payment / webhook | **no** |
| env change | **no** |
| snapshot UPDATE / DELETE | **no** |
| entitlement deletion | **no** |
| **VERIFY-C** | **no** |

---

## H. Next gates

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C-R-COMMIT** |
| **2** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C-D** — Production apply + verify（**`…C-APPLY go`** or equivalent） |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Human Production preflight @ `95ccc29` |
