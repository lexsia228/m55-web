# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-R — Shadow preflight result（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-R** |
| **Title** | **Soft-hide repurchase shadow preflight result recording** |
| **Classification** | **Category 1 / Human attestation / docs-only** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B2_SHADOW_PREFLIGHT_GREEN_NO_APPLY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-R-001`** |
| **Date** | **2026-05-21** |
| **Target** | **m55-soul-shadow** |
| **Preflight SQL** | `scripts/sql/staging/m55_soft_hide_repurchase_b1_preflight_shadow_v1.sql` |
| **Git baseline** | **`work/home-cluster` @ `95ccc29`（B2-FIX-B-COMMIT）** |
| **Raw user_id / email / session / Stripe ID / secret** | **not shared** |

**No** migration apply, Production DB use, DB write, checkout, payment, webhook, or env change.

---

## B. Human metrics（counts only）

| Metric | Value |
|--------|------:|
| **total_snapshot_rows** | **2** |
| **dtr_core_snapshot_rows** | **0** |
| **legacy_duplicate_user_product_pairs** | **0** |
| **unique_constraint_or_index_detected** | **1** |
| **user_hidden_at_exists** | **0** |
| **user_hidden_source_exists** | **0** |
| **user_hidden_reason_exists** | **0** |
| **product_label_exists** | **0** |
| **engine_context_json_exists** | **0** |
| **engine_version_exists** | **1** |
| **engine_context_json_nonnull_count** | **0** |
| **engine_version_nonnull_count** | **0** |
| **engine_context_json_null_count** | **0** |
| **engine_version_null_count** | **0** |

---

## C. PASS / STOP evaluation（soft-hide apply axis）

| Check | Expected | Observed | Result |
|-------|----------|----------|--------|
| **legacy_duplicate_user_product_pairs** | **0** | **0** | **PASS** |
| **unique_constraint_or_index_detected** | **≥ 1**（pre-migration） | **1** | **PASS** |
| **Preflight completes without SQL error** | yes | yes | **PASS** |
| **user_hidden_* exists** | **0** pre-apply | **0** | **PASS**（not yet migrated） |
| **partial unique index** | **0** pre-apply | *(not in Human paste — assume 0)* | **PASS** |

**STOP conditions not triggered.**

---

## D. Interpretation（Human + agent）

| Topic | Reading |
|-------|---------|
| **Overall** | Shadow preflight **GREEN** for soft-hide migration pre-apply |
| **Duplicates** | No `(user_id, product_id)` duplicate pairs among visible-equivalent rows |
| **Constraint** | Legacy `UNIQUE (user_id, product_id)` **detectable** — migration DROP target confirmed |
| **Soft-hide columns** | **Not applied** — expected pre-**B3** |
| **DTR_CORE fixture** | **`dtr_core_snapshot_rows = 0`** — shadow has **limited** business fixture coverage；duplicate/constraint checks still valid on all rows |
| **engine_context_json** | Column **absent** on shadow（`exists = 0`）；v2 JSON lane not in play on shadow |
| **engine_version** | Column **present**（`exists = 1`）；counts **0** — consistent with 2 non-DTR rows or empty values |
| **Production** | **Not used** |

**Note:** When `engine_context_json_exists = 0`, B2-FIX-B spec uses **-1** for JSON nonnull/null counts；Human reported **0** — **non-blocking** for soft-hide gate（orthogonal to `user_hidden_*` migration）.

---

## E. No-mutation statement

| Action | Status |
|--------|--------|
| migration apply（shadow / production） | **no** |
| Shadow schema patch | **no** |
| Production DB connection | **no** |
| checkout / payment / webhook | **no** |
| env change | **no** |
| **CORE-DTR-VERIFY-C** | **no** |

---

## F. Next gate

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-B3** | Staging apply planning / execution（**m55-soul-shadow** Human GO） |
| **B3-S** | Post-apply readonly verify（`user_hidden_*` exists = 1；partial unique index exists） |

**Prerequisite for apply:** This **B2-R** verdict **GREEN** + explicit Human GO for **B3**.

---

## G. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Human shadow preflight attestation @ `95ccc29` |
