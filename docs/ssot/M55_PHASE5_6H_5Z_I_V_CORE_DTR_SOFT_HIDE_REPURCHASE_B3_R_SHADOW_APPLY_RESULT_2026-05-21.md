# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B3-R — Shadow apply result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B3-R** |
| **Title** | **Soft-hide migration shadow apply result recording** |
| **Classification** | **Category 1 / Human attestation / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B3_SHADOW_APPLY_GREEN_NO_PRODUCTION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B3-R-001`** |
| **Date** | **2026-05-21** |
| **Target** | **m55-soul-shadow** |
| **Production used** | **no** |
| **Apply script** | `scripts/sql/staging/m55_soft_hide_repurchase_b3_shadow_apply_verify_v1.sql` |
| **Migration** | `supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql` |
| **Prerequisite** | **B2-R** GREEN · **B3** Human GO |
| **Raw user_id / email / session / Stripe ID / secret** | **not shared** |

**Staging/shadow GREEN only.** **Production migration not authorized** in this gate.

---

## B. Human metrics（counts only）

### B1. Preflight（pre-apply）

| Metric | Value |
|--------|------:|
| **PREFLIGHT_user_hidden_at_exists** | **0** |
| **PREFLIGHT_total_snapshot_rows** | **2** |

### B2. Postflight（post-apply）

| Metric | Value |
|--------|------:|
| **user_hidden_at_exists** | **1** |
| **user_hidden_source_exists** | **1** |
| **user_hidden_reason_exists** | **1** |
| **partial_unique_index_exists** | **1** |
| **total_snapshot_rows** | **2** |
| **user_hidden_at_nonnull_count** | **0** |
| **legacy_duplicate_user_product_pairs** | **0** |

---

## C. PASS evaluation

| Check | Expected | Observed | Result |
|-------|----------|----------|--------|
| **user_hidden_* columns** | exists = **1** each | **1** / **1** / **1** | **PASS** |
| **partial unique index** | **1** | **1** | **PASS** |
| **Row count unchanged** | PREFLIGHT **2** = POST **2** | **2** = **2** | **PASS** |
| **No rows hidden by migration** | nonnull = **0** | **0** | **PASS** |
| **Visible duplicates** | **0** | **0** | **PASS** |
| **Production touched** | **no** | **no** | **PASS** |

---

## D. Interpretation（Human）

| Topic | Reading |
|-------|---------|
| **Columns** | `user_hidden_at`, `user_hidden_source`, `user_hidden_reason` added on shadow |
| **Index** | `dtr_report_snapshots_one_visible_per_user_product_uq`（`WHERE user_hidden_at IS NULL`）created |
| **Data integrity** | Existing rows unchanged；`user_hidden_at` remains **NULL** on all rows |
| **Duplicates** | No visible `(user_id, product_id)` duplicate pairs |
| **Scope** | **Shadow only** — not Production apply |

---

## E. Production boundary（mandatory）

| Rule | Status |
|------|--------|
| **This gate authorizes Production apply** | **no** |
| **Production migration** | Requires **separate** planning/preflight gate + explicit Human GO |
| **Suggested next Production track** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C**（planning / preflight — not B3-R） |

---

## F. No-mutation statement

| Action | Status |
|--------|--------|
| **m55-soul-core** / Production DB | **no** |
| checkout / payment / webhook | **no** |
| env change | **no** |
| snapshot content UPDATE / DELETE | **no** |
| entitlement deletion | **no** |
| **CORE-DTR-VERIFY-C** | **no** |

---

## G. Next gates

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-SOFT-HIDE-REPURCHASE-B3-R-COMMIT** |
| **2** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C** — Production migration planning + preflight |
| **3** | **CORE-DTR-SOFT-HIDE-REPURCHASE-D**（or C-apply）— code: `getVisibleDtrReportSnapshot` + hide API（after schema path clear） |

---

## H. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Human shadow apply POSTFLIGHT GREEN |
