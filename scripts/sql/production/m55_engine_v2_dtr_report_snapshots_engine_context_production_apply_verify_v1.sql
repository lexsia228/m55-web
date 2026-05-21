-- ENGINE-IMPL-B3-D — m55-soul-core PRODUCTION ONLY (NOT m55-soul-shadow)
-- Human GO required. Do not run in B3-C planning gate.
-- Source migration: supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql
-- Forbidden: SELECT * ; raw user_id ; mixed SQL in same session

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 0 — Human confirmation (ticket)
-- ═══════════════════════════════════════════════════════════════════════════
-- target_safe_label: m55-soul-core
-- backup_safe_label: <record outside SSOT>
-- preflight_pass: yes
-- B3-C planning GREEN: yes

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — PREFLIGHT (re-run immediately before apply)
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

-- STOP if engine_*_exists = 1 unless documented partial-apply recovery gate

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — APPLY (must match repo migration file exactly)
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
-- PART 3 — POSTFLIGHT
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
