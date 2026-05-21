# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B3-A — Additive DB migration draft（2026-05-21）

## Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B3-A** |
| **Title** | **Composite astrology v2 additive DB migration draft** |
| **Classification** | **Category 2 / migration SQL draft / no apply** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_ADDITIVE_DB_MIGRATION_DRAFT_GREEN_NO_APPLY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-B3-A-ADDITIVE-DB-MIGRATION-DRAFT-001`** |
| **Prior** | **ENGINE-IMPL-B2** GREEN |

## Migration draft path

`supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql`

## DDL summary

| Operation | Detail |
|-----------|--------|
| `ALTER TABLE public.dtr_report_snapshots` | additive only |
| `engine_context_json` | `jsonb NULL` — `IF NOT EXISTS` |
| `engine_version` | `text NULL` — `IF NOT EXISTS` |
| `COMMENT ON COLUMN` | both columns documented |
| `NOTIFY pgrst` | schema reload **on apply** (B3-B) |

**No** `DEFAULT`, **no** `NOT NULL`, **no** backfill `UPDATE`.

## Additive-only confirmation

| Check | Result |
|-------|--------|
| `DROP` | **absent** |
| `DELETE` | **absent** |
| `UPDATE` | **absent** |
| `TRUNCATE` | **absent** |
| `CREATE TRIGGER` / row mutation triggers | **absent** |
| Existing row rewrite via `DEFAULT` | **absent** — nullable columns only |
| Naming collision with `supabase/migrations/*` | **none** — latest prior `20260519000000_*`; this file `20260601000000_*` |

## Rollback / read-path policy（draft）

| State | Read fork |
|-------|-----------|
| `engine_version IS NULL` | Legacy (`dtr-v1-jdn-day-stem-provisional`) |
| `engine_version = m55-composite-stem-v2` | Stored envelope + `engine_context_json` |
| Column drop rollback | Only if env has **zero** v2 rows (staging policy); prod prefers code fallback |

**Existing snapshots:** **no UPDATE / DELETE** in migration or gate.

## No-apply confirmation

| Action | B3-A |
|--------|------|
| `supabase db push` / `migration up` | **not run** |
| Production DB | **not connected** |
| Staging DB | **not connected** |
| Any DB write | **none** |

## No-mutation confirmation

- **Not touched:** fulfillment, checkout, entitlements, routes, `dtrEngine`, snapshots (data)
- **Not deployed**

## Validation (static)

```bash
rg -i 'UPDATE|DELETE|DROP|TRUNCATE' supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql
# → no matches (NOTIFY line only; no DML/DDL destructive)
git diff --check
```

## Next gate

**ENGINE-IMPL-B3-B** — staging apply planning/execution（Human GO + `supabase migration up` on staging only）
