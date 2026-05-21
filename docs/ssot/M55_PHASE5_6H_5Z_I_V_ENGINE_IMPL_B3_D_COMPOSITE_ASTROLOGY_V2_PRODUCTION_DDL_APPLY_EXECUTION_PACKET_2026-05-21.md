# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B3-D — Production DDL-only apply execution packet（2026-05-21）

## Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B3-D** |
| **Title** | **Production DDL-only apply execution** |
| **Classification** | **Category 2 / Production DDL / Human execution** |
| **Human GO phrase** | **`GO for ENGINE-IMPL-B3-D Production DDL-only apply of dtr_report_snapshots engine columns only`** |
| **Prior** | **ENGINE-IMPL-B3-C** GREEN |

## Target（safe labels only）

| Field | Value |
|-------|--------|
| **target safe label** | **`m55-soul-core`** |
| **environment** | **PRODUCTION / main** |
| **forbidden target** | **`m55-soul-shadow`** / ref **`jonlynrbfveaprncyrmv`** |

## Execution steps（Human — single session）

1. Dashboard → **`m55-soul-core`** 目視（shadow ではないこと）。
2. Backup safe label / timestamp をチケット外に記録。
3. **Preflight only**（任意・当日）:

   `scripts/sql/production/m55_engine_v2_dtr_report_snapshots_engine_context_production_preflight_v1.sql`

   Record **N** = `PREFLIGHT_snapshot_row_count`. **STOP** if `engine_*_exists` = 1.

4. **Apply + postflight**（1 回）:

   `scripts/sql/production/m55_engine_v2_dtr_report_snapshots_engine_context_production_apply_verify_v1.sql`

   **Or** paste exact content of `supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql` only.

5. Copy **metric / value** rows only into **B3-D-R** checkpoint（no `SELECT *`, no raw IDs）。

## DDL scope（forbidden in session）

`UPDATE` · `DELETE` · `DROP` · `TRUNCATE` · `DEFAULT` · `NOT NULL` · snapshot row rewrite · mixed DML.

## Expected postflight（N = preflight snapshot count）

| metric | expected |
|--------|----------|
| `POSTFLIGHT_snapshot_row_count` | **= N** |
| `POSTFLIGHT_engine_context_json_exists` | **1** |
| `POSTFLIGHT_engine_version_exists` | **1** |
| `POSTFLIGHT_engine_context_json_nullable` | **YES** |
| `POSTFLIGHT_engine_version_nullable` | **YES** |
| `POSTFLIGHT_legacy_engine_context_json_null_count` | **= N** |
| `POSTFLIGHT_legacy_engine_version_null_count` | **= N** |
| `POSTFLIGHT_nonnull_engine_context_json_count` | **0** |
| `POSTFLIGHT_nonnull_engine_version_count` | **0** |

## Agent session

| Field | Value |
|-------|--------|
| **Agent Production apply** | **no**（no DB session） |
| **Result recording** | **B3-D-R GREEN** — `docs/ssot/M55_PHASE5_6H_5Z_I_V_ENGINE_IMPL_B3_D_R_COMPOSITE_ASTROLOGY_V2_PRODUCTION_DDL_APPLY_RESULT_2026-05-21.md` |

## No-mutation（same window）

deploy · fulfillment code · entitlements · checkout · env · Stripe/Clerk/Slack — **no**.
