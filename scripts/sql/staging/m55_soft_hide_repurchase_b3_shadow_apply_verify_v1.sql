-- CORE-DTR-SOFT-HIDE-REPURCHASE-B3 — m55-soul-shadow ONLY (NOT m55-soul-core / NOT Production)
-- Human GO: CORE-DTR-SOFT-HIDE-REPURCHASE-B3 go
-- Migration: supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql
-- Run entire file once in Supabase SQL Editor on shadow project only.
-- Forbidden: SELECT * ; raw user_id ; secrets in ticket paste
-- B2-R baseline: total_snapshot_rows=2, legacy_duplicate=0

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 0 — Human target confirmation (fill in ticket, not in repo)
-- ═══════════════════════════════════════════════════════════════════════════
-- target_safe_label: m55-soul-shadow
-- production_used: no
-- m55-soul-core_used: no
-- git_baseline: work/home-cluster @ 414a199+

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — PREFLIGHT (read-only aggregates — must match B2-R)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_total_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

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

-- STOP if PREFLIGHT_legacy_duplicate > 0
-- STOP if PREFLIGHT_user_hidden_at_exists = 1 (already applied — do not re-run PART 2)

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — APPLY (once only — mirrors migration file)
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
-- PART 3 — POSTFLIGHT (read-only aggregates)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'POSTFLIGHT_total_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

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

SELECT 'POSTFLIGHT_legacy_duplicate_user_product_pairs' AS metric,
       count(*)::bigint AS value
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     WHERE user_hidden_at IS NULL
     GROUP BY user_id, product_id
    HAVING count(*) > 1
  ) dup;

SELECT 'POSTFLIGHT_user_hidden_at_nonnull_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE user_hidden_at IS NOT NULL;

SELECT 'POSTFLIGHT_legacy_table_unique_constraint_count' AS metric,
       count(*)::bigint AS value
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
 WHERE n.nspname = 'public'
   AND t.relname = 'dtr_report_snapshots'
   AND c.contype = 'u'
   AND pg_get_constraintdef(c.oid) ~ '\(user_id, product_id\)';

-- Expected PASS (B3):
--   POSTFLIGHT_total_snapshot_rows = PREFLIGHT_total_snapshot_rows (B2-R: 2)
--   POSTFLIGHT_user_hidden_*_exists = 1 each
--   POSTFLIGHT_partial_unique_index_exists = 1
--   POSTFLIGHT_legacy_duplicate_user_product_pairs = 0
--   POSTFLIGHT_user_hidden_at_nonnull_count = 0
--   POSTFLIGHT_legacy_table_unique_constraint_count = 0
