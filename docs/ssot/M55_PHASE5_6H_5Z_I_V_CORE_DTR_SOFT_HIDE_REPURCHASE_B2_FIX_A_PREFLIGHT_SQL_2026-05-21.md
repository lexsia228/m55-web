# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-A — Preflight SQL fix（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-A** |
| **Title** | **Remove product_label dependency from soft-hide preflight SQL** |
| **Classification** | **Category 1 / SQL fix / no-apply** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B2_FIX_A_PREFLIGHT_SQL_GREEN_NO_DB_WRITE`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-A-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **B1-COMMIT** @ **`2de3faa`** |

---

## B. Incident（Human）

| Item | Value |
|------|--------|
| **Target** | **m55-soul-shadow** staging preflight |
| **Error** | **42703** — `column "product_label" does not exist` |
| **Production touched** | **no** |
| **Migration apply** | **no** |

**Judgment:** BLOCKED was correct；**do not** add `product_label` to Shadow for soft-hide gate.

---

## C. Fix summary

| Change | Detail |
|--------|--------|
| **Axis** | `user_id` + `product_id` + visible uniqueness only |
| **DTR filter** | `product_id = 'DTR_CORE_STATIC_V1'` |
| **`product_label`** | **`product_label_exists`** via `information_schema` only — **no** table column SELECT |
| **Engine counts** | Dynamic SQL + temp table；**-1** if column absent |
| **Metrics** | Renamed to canonical `metric` / `value` rows |

**Files:** staging + production preflight v1 SQL.

---

## D. No-mutation

| Action | Status |
|--------|--------|
| DB write / migration apply | **no** |
| Shadow schema patch | **no** |
| code / checkout / deploy / env | **no** |

---

## E. Next gate

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-B2** | Human re-runs shadow preflight on **m55-soul-shadow** |

---

## F. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | B2-FIX-A preflight SQL dependency fix |
