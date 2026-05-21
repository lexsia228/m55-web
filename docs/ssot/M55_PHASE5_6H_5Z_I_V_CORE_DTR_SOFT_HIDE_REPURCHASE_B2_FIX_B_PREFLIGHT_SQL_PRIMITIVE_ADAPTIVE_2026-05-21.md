# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-B — Primitive/adaptive preflight（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-B** |
| **Title** | **Primitive/adaptive soft-hide preflight SQL** |
| **Classification** | **Category 1 / SQL fix / no-apply** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B2_FIX_B_PREFLIGHT_SQL_PRIMITIVE_ADAPTIVE_GREEN_NO_DB_WRITE`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-B-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **B2-FIX-A-COMMIT** @ **`1e212e6`** |

---

## B. Incident（Human）

| Item | Value |
|------|--------|
| **Target** | **m55-soul-shadow** |
| **Error** | **42703** — `column "engine_context" does not exist` |
| **Production touched** | **no** |
| **Shadow schema patch** | **no**（correct — do not add non-canonical `engine_context`） |

**Canonical columns:** `engine_context_json`, `engine_version` only.

---

## C. Fix summary

| Change | Detail |
|--------|--------|
| **Parse-time table refs** | **Removed** — all `dtr_report_snapshots` aggregates via **dynamic SQL** |
| **Forbidden in SQL strings** | `engine_context`（bare）, `product_label` on table |
| **Schema metrics** | `information_schema` + `pg_catalog` only |
| **Output** | Single `_soft_hide_preflight_metrics` → one `SELECT metric, value` |
| **Missing optional cols** | Count metrics return **-1** |

**Soft-hide gate axis unchanged:** `user_id` + `product_id` + unique/index + `user_hidden_*`.

---

## D. No-mutation

| Action | Status |
|--------|--------|
| DB write / migration apply | **no** |
| Shadow / Production schema patch | **no** |
| code / checkout / deploy / env | **no** |

---

## E. Next gate

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-B2** | Human shadow preflight retry on **m55-soul-shadow** |

---

## F. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | B2-FIX-B primitive/adaptive preflight |
