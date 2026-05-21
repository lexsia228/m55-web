# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B3-B — Staging migration apply execution packet（2026-05-21）

## Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B3-B** |
| **Title** | **Additive migration staging/shadow apply** |
| **Classification** | **Category 2 / staging DB apply + verification** |
| **Human GO** | **required**（本条は実行手順；結果は **B3-B-R** または Human 貼付で確定） |
| **Prior** | **ENGINE-IMPL-B3-A** GREEN |

## Target（safe labels only）

| Field | Value |
|-------|--------|
| **target safe label** | **`m55-soul-shadow`** |
| **ref safe label** | **`jonlynrbfveaprncyrmv`** |
| **Production** | **`m55-soul-core` — 禁止** |
| **Production apply** | **no** |

## Pre-execution checks（agent static — 2026-05-21）

| # | Check | Result |
|---|-------|--------|
| 1 | Target is shadow label, not Production | **packet enforces** |
| 2 | Migration file has no executable `UPDATE`/`DELETE`/`DROP`/`TRUNCATE` | **pass** |
| 3 | DDL is `ADD COLUMN … NULL` only | **pass** |
| 4 | Naming `20260601000000_*` vs existing migrations | **no collision** |
| 5 | Rollback = read-path `NULL` legacy fork | **documented** |
| 6 | Backup | Supabase shadow dashboard backup / PITR per org policy（agent 未実行） |

## Apply command（shadow only — pick one）

### A. Supabase SQL Editor（推奨・agent 環境でも可）

1. Dashboard → project **`m55-soul-shadow`**（ref **`jonlynrbfveaprncyrmv`**）を目視確認。
2. **SQL Editor** で次を **1 回**実行:

`scripts/sql/staging/m55_engine_v2_dtr_report_snapshots_engine_context_shadow_apply_verify_v1.sql`

3. 結果を **metric / value のみ**チケットに貼る（raw row 禁止）。

### B. Supabase CLI（Human 端末・shadow link 済みのみ）

```bash
# Confirm linked project ref = jonlynrbfveaprncyrmv (NOT production)
npx supabase link --project-ref jonlynrbfveaprncyrmv
npx supabase db push
```

**禁止:** production ref への `db push` / `migration up`。

## Post-apply verification（必須 metric）

| metric | Pass condition |
|--------|----------------|
| `POSTFLIGHT_engine_context_json_exists` | **1** |
| `POSTFLIGHT_engine_version_exists` | **1** |
| `POSTFLIGHT_engine_*_nullable` | **YES** |
| `POSTFLIGHT_snapshot_row_count` | **= PREFLIGHT_snapshot_row_count** |
| `POSTFLIGHT_legacy_*_null_count` | **= row count**（既存のみ環境） |
| `POSTFLIGHT_nonnull_*_count` | **0**（初回 apply 直後） |

**PostgREST:** migration 内 `NOTIFY pgrst, 'reload schema'` 済み。必要なら Dashboard → API → Reload schema（shadow のみ）。

## Agent session（2026-05-21）

| Field | Value |
|-------|--------|
| **Agent apply executed** | **no** |
| **Reason** | No `psql` / no Supabase CLI / no shadow `DATABASE_URL` in agent env |
| **Production touched** | **no** |
| **App code connected** | **no** — runtime 影響なし |

**Verdict（agent session）:** **`STAGING_MIGRATION_APPLY_EXECUTION_PACKET_GREEN_AGENT_APPLY_BLOCKED_NO_DB_SESSION`**

**B3-B-R recorded（2026-05-21）：** **`COMPOSITE_ASTROLOGY_V2_ADDITIVE_MIGRATION_SHADOW_APPLY_GREEN_NO_PRODUCTION`** — see `docs/ssot/M55_PHASE5_6H_5Z_I_V_ENGINE_IMPL_B3_B_R_COMPOSITE_ASTROLOGY_V2_SHADOW_MIGRATION_APPLY_RESULT_2026-05-21.md`.

## No-mutation outside staging

- snapshot **UPDATE/DELETE** なし（DDL のみ）
- fulfillment / checkout / deploy 未変更

## Next

- **B3-B-R** — Human shadow apply 結果記録
- **ENGINE-IMPL-B3-C** — Production apply planning（別 Human GO）
