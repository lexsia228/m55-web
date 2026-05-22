-- CORE-DTR-SOFT-HIDE-REPURCHASE-C-D — m55-soul-core ONLY (NOT m55-soul-shadow)
-- Human GO: CORE-DTR-SOFT-HIDE-REPURCHASE-C-D go
-- Migration: supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql
-- Run entire file once in Supabase SQL Editor on m55-soul-core only.
-- Forbidden: SELECT * ; raw user_id ; secrets in ticket paste
-- C-R baseline: total_snapshot_rows=6, legacy_duplicate=0, user_hidden_*=0

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 0 — Human target confirmation (fill in ticket, not in repo)
-- ═══════════════════════════════════════════════════════════════════════════
-- target_safe_label: m55-soul-core
-- production_used: yes
-- m55-soul-shadow_used: no
-- git_baseline: work/home-cluster @ 2c20afb+

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — PREFLIGHT (read-only — must match C-R)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_total_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

SELECT 'PREFLIGHT_dtr_core_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT 'PREFLIGHT_legacy_duplicate_user_product_pairs' AS metric,
       count(*)::bigint AS value
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     GROUP BY user_id, product_id
    HAVING count(*) > 1
  ) dup;

SELECT 'PREFLIGHT_user_hidden_at_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_at';

SELECT 'PREFLIGHT_partial_unique_index_exists' AS metric,
       count(*)::bigint AS value
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'dtr_report_snapshots'
   AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

-- STOP if legacy_duplicate > 0
-- STOP if PREFLIGHT_total_snapshot_rows <> 6 (C-R baseline)
-- STOP if PREFLIGHT_user_hidden_at_exists = 1 (already applied — skip PART 2)

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — APPLY (once only — migration file verbatim)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS user_hidden_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS user_hidden_source text NULL,
  ADD COLUMN IF NOT EXISTS user_hidden_reason text NULL;

COMMENT ON COLUMN public.dtr_report_snapshots.user_hidden_at IS
  'NULL = user-visible saved report; non-null = user 削除 (soft hide) at timestamp.';

COMMENT ON COLUMN public.dtr_report_snapshots.user_hidden_source IS
  'Channel that set hide: my_panel | dtr_shelf | admin_support.';

COMMENT ON COLUMN public.dtr_report_snapshots.user_hidden_reason IS
  'Optional non-PII slug for support correlation; no freeform PII.';

ALTER TABLE public.dtr_report_snapshots
  DROP CONSTRAINT IF EXISTS dtr_report_snapshots_user_id_product_id_key;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
     WHERE n.nspname = 'public'
       AND t.relname = 'dtr_report_snapshots'
       AND c.contype = 'u'
       AND pg_get_constraintdef(c.oid) ~ '\(user_id, product_id\)'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.dtr_report_snapshots DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS dtr_report_snapshots_one_visible_per_user_product_uq
  ON public.dtr_report_snapshots (user_id, product_id)
  WHERE (user_hidden_at IS NULL);

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3 — POSTFLIGHT (C-D-R metrics)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'POSTFLIGHT_user_hidden_at_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_at';

SELECT 'POSTFLIGHT_user_hidden_source_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_source';

SELECT 'POSTFLIGHT_user_hidden_reason_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_reason';

SELECT 'POSTFLIGHT_partial_unique_index_exists' AS metric,
       count(*)::bigint AS value
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'dtr_report_snapshots'
   AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

SELECT 'POSTFLIGHT_total_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

SELECT 'POSTFLIGHT_user_hidden_at_nonnull_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE user_hidden_at IS NOT NULL;

SELECT 'POSTFLIGHT_legacy_duplicate_user_product_pairs' AS metric,
       count(*)::bigint AS value
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     WHERE user_hidden_at IS NULL
     GROUP BY user_id, product_id
    HAVING count(*) > 1
  ) dup;

-- Expected PASS (C-D-R GREEN):
--   POSTFLIGHT_user_hidden_*_exists = 1
--   POSTFLIGHT_partial_unique_index_exists = 1
--   POSTFLIGHT_total_snapshot_rows = 6
--   POSTFLIGHT_user_hidden_at_nonnull_count = 0
--   POSTFLIGHT_legacy_duplicate_user_product_pairs = 0
