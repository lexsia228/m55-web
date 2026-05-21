# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B1 — Migration draft + preflight（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B1** |
| **Title** | **Soft-hide migration SQL draft and staging/production preflight** |
| **Classification** | **Category 1 / migration draft / no-apply** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_B1_MIGRATION_DRAFT_GREEN_NO_APPLY_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-B1-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **B-COMMIT** @ **`074d89b`** |
| **Policy anchor** | `M55_PHASE5_6H_5Z_I_V_CORE_DTR_SOFT_HIDE_REPURCHASE_B_SCHEMA_MIGRATION_PLANNING_2026-05-21.md` |

**No** migration apply, DB write, code, checkout, deploy, env, or **VERIFY-C**.

---

## B. Artifacts

| Artifact | Path |
|----------|------|
| **Migration draft** | `supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql` |
| **Staging preflight** | `scripts/sql/staging/m55_soft_hide_repurchase_b1_preflight_shadow_v1.sql` |
| **Production preflight draft** | `scripts/sql/production/m55_soft_hide_repurchase_b1_preflight_v1.sql` |

---

## C. Migration draft summary

| Step | Action |
|------|--------|
| 1 | `ADD COLUMN IF NOT EXISTS` — `user_hidden_at`, `user_hidden_source`, `user_hidden_reason` |
| 2 | `COMMENT ON COLUMN` ×3 |
| 3 | `DROP CONSTRAINT IF EXISTS dtr_report_snapshots_user_id_product_id_key` + DO fallback |
| 4 | `CREATE UNIQUE INDEX … WHERE (user_hidden_at IS NULL)` |
| 5 | `NOTIFY pgrst, 'reload schema'` |

**Forbidden in file:** DELETE, TRUNCATE, DROP TABLE, UPDATE of `envelope_json` / `profile_snapshot` / engine columns.

---

## D. Preflight STOP conditions

| Metric | STOP if |
|--------|---------|
| `PREFLIGHT_legacy_duplicate_user_product_pairs` | **> 0** |
| `PREFLIGHT_dtr_report_snapshots_table_exists` | **≠ 1** |
| Unique constraint name unknown | Human cannot match migration DROP |

---

## E. Static review

| Check | Result |
|-------|--------|
| Forbidden DML in migration | **pass**（comment-only mention） |
| Preflight files DML | **none** |
| `git diff --check` | **pass** |
| Secrets / raw IDs in artifacts | **none** |

---

## F. No-mutation statement

| Action | Status |
|--------|--------|
| Staging / Production migration apply | **no** |
| DB write | **no** |
| code / checkout / deploy / env | **no** |

---

## G. Next gate

| Gate | Action |
|------|--------|
| **CORE-DTR-SOFT-HIDE-REPURCHASE-B2** | Human runs staging preflight on **m55-soul-shadow**；if GREEN → staging apply |

---

## H. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | B1 draft + preflight paths |
