-- CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-A — Production preflight DRAFT (m55-soul-core) READ ONLY
-- Migration: supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql
-- Axis: user_id + product_id only (no product_label).
-- Forbidden: SELECT * ; DML ; raw user_id / email / session / Stripe IDs / secrets in ticket paste
-- target_safe_label: m55-soul-core
-- APPLY MIGRATION: NO

SELECT 'total_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

SELECT 'dtr_core_snapshot_rows' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT 'legacy_duplicate_user_product_pairs' AS metric,
       count(*)::bigint AS value
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     GROUP BY user_id, product_id
    HAVING count(*) > 1
  ) dup;

SELECT 'unique_constraint_or_index_detected' AS metric,
       count(*)::bigint AS value
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
 WHERE n.nspname = 'public'
   AND t.relname = 'dtr_report_snapshots'
   AND c.contype = 'u'
   AND pg_get_constraintdef(c.oid) ~ '\(user_id, product_id\)';

SELECT 'user_hidden_at_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_at';

SELECT 'user_hidden_source_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_source';

SELECT 'user_hidden_reason_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_reason';

SELECT 'product_label_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'product_label';

SELECT 'partial_unique_index_exists' AS metric,
       count(*)::bigint AS value
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'dtr_report_snapshots'
   AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

CREATE TEMP TABLE IF NOT EXISTS _soft_hide_preflight_engine (
  metric text PRIMARY KEY,
  value bigint NOT NULL
);

DO $$
DECLARE
  v_exists boolean;
  v_count bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'dtr_report_snapshots'
       AND column_name = 'engine_context_json'
  ) INTO v_exists;

  IF v_exists THEN
    EXECUTE 'SELECT count(*)::bigint FROM public.dtr_report_snapshots WHERE engine_context_json IS NOT NULL'
      INTO v_count;
    INSERT INTO _soft_hide_preflight_engine VALUES ('engine_context_json_nonnull_count', v_count);
    EXECUTE 'SELECT count(*)::bigint FROM public.dtr_report_snapshots WHERE engine_context_json IS NULL'
      INTO v_count;
    INSERT INTO _soft_hide_preflight_engine VALUES ('engine_context_json_null_count', v_count);
  ELSE
    INSERT INTO _soft_hide_preflight_engine VALUES
      ('engine_context_json_nonnull_count', -1),
      ('engine_context_json_null_count', -1);
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'dtr_report_snapshots'
       AND column_name = 'engine_version'
  ) INTO v_exists;

  IF v_exists THEN
    EXECUTE 'SELECT count(*)::bigint FROM public.dtr_report_snapshots WHERE engine_version IS NOT NULL'
      INTO v_count;
    INSERT INTO _soft_hide_preflight_engine VALUES ('engine_version_nonnull_count', v_count);
    EXECUTE 'SELECT count(*)::bigint FROM public.dtr_report_snapshots WHERE engine_version IS NULL'
      INTO v_count;
    INSERT INTO _soft_hide_preflight_engine VALUES ('engine_version_null_count', v_count);
  ELSE
    INSERT INTO _soft_hide_preflight_engine VALUES
      ('engine_version_nonnull_count', -1),
      ('engine_version_null_count', -1);
  END IF;
END $$;

SELECT metric, value FROM _soft_hide_preflight_engine ORDER BY metric;

-- PASS: legacy_duplicate_user_product_pairs = 0
-- STOP: duplicate > 0 | apply without staging GREEN
