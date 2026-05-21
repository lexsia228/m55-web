-- ENGINE-IMPL-B3-B — m55-soul-shadow ONLY (NOT m55-soul-core / NOT Production)
-- Migration: supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql
-- Human GO required. Run entire file in Supabase SQL Editor on shadow project only.
-- Forbidden: SELECT * ; raw user_id ; secrets in ticket paste
-- Rollback: read-path NULL engine_version => legacy; column DROP only if zero v2 rows

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 0 — Human target confirmation (fill in ticket, not in repo)
-- ═══════════════════════════════════════════════════════════════════════════
-- target_safe_label: m55-soul-shadow
-- ref_safe_label: jonlynrbfveaprncyrmv
-- production_used: no
-- m55-soul-core_used: no

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — PREFLIGHT (read-only aggregates)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_snapshot_row_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

SELECT 'PREFLIGHT_engine_context_json_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_context_json';

SELECT 'PREFLIGHT_engine_version_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_version';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — APPLY (additive only; no UPDATE / DELETE / DROP / TRUNCATE)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS engine_context_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS engine_version text NULL;

COMMENT ON COLUMN public.dtr_report_snapshots.engine_context_json IS
  'Immutable composite engine context at purchase (normalizedBirthContext + boundaryMetadata). NULL = legacy row.';

COMMENT ON COLUMN public.dtr_report_snapshots.engine_version IS
  'Denormalized engine version for read fork (e.g. m55-composite-stem-v2). NULL = legacy dtr-v1-jdn-day-stem-provisional fork.';

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3 — POSTFLIGHT (read-only aggregates)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'POSTFLIGHT_snapshot_row_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

SELECT 'POSTFLIGHT_engine_context_json_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_context_json';

SELECT 'POSTFLIGHT_engine_version_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_version';

SELECT 'POSTFLIGHT_engine_context_json_nullable' AS metric,
       is_nullable AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_context_json';

SELECT 'POSTFLIGHT_engine_version_nullable' AS metric,
       is_nullable AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_version';

SELECT 'POSTFLIGHT_legacy_engine_context_json_null_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_context_json IS NULL;

SELECT 'POSTFLIGHT_legacy_engine_version_null_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_version IS NULL;

SELECT 'POSTFLIGHT_nonnull_engine_context_json_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_context_json IS NOT NULL;

SELECT 'POSTFLIGHT_nonnull_engine_version_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_version IS NOT NULL;

-- Expected after first apply on legacy-only data:
--   POSTFLIGHT_*_row_count unchanged vs PREFLIGHT
--   POSTFLIGHT_*_exists = 1 each
--   POSTFLIGHT_*_nullable = YES
--   POSTFLIGHT_legacy_*_null_count = POSTFLIGHT_snapshot_row_count
--   POSTFLIGHT_nonnull_*_count = 0
