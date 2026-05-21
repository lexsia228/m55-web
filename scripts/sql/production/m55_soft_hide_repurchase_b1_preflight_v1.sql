-- CORE-DTR-SOFT-HIDE-REPURCHASE-B2-FIX-B — Production preflight DRAFT (m55-soul-core) READ ONLY
-- Primitive/adaptive: no parse-time refs to optional columns on dtr_report_snapshots.
-- Forbidden in dynamic SQL strings: engine_context (use engine_context_json only), product_label.
-- Forbidden: SELECT * ; DML ; raw user_id / email / session / Stripe IDs / secrets in ticket paste
-- target_safe_label: m55-soul-core
-- APPLY MIGRATION: NO

CREATE TEMP TABLE IF NOT EXISTS _soft_hide_preflight_metrics (
  metric text PRIMARY KEY,
  value bigint NOT NULL
);

TRUNCATE _soft_hide_preflight_metrics;

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'user_hidden_at_exists',
       count(*)::bigint
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_at';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'user_hidden_source_exists',
       count(*)::bigint
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_source';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'user_hidden_reason_exists',
       count(*)::bigint
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_reason';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'product_label_exists',
       count(*)::bigint
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'product_label';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'engine_context_json_exists',
       count(*)::bigint
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_context_json';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'engine_version_exists',
       count(*)::bigint
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_version';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'unique_constraint_or_index_detected',
       count(*)::bigint
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
 WHERE n.nspname = 'public'
   AND t.relname = 'dtr_report_snapshots'
   AND c.contype = 'u'
   AND pg_get_constraintdef(c.oid) ~ '\(user_id, product_id\)';

INSERT INTO _soft_hide_preflight_metrics (metric, value)
SELECT 'partial_unique_index_exists',
       count(*)::bigint
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'dtr_report_snapshots'
   AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

DO $$
DECLARE
  v_count bigint;
  v_json_exists boolean;
  v_ver_exists boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'dtr_report_snapshots'
  ) THEN
    INSERT INTO _soft_hide_preflight_metrics (metric, value) VALUES
      ('total_snapshot_rows', -1),
      ('dtr_core_snapshot_rows', -1),
      ('legacy_duplicate_user_product_pairs', -1);
    RETURN;
  END IF;

  EXECUTE 'SELECT count(*)::bigint FROM public.dtr_report_snapshots'
    INTO v_count;
  INSERT INTO _soft_hide_preflight_metrics VALUES ('total_snapshot_rows', v_count);

  EXECUTE $q$
    SELECT count(*)::bigint FROM public.dtr_report_snapshots
     WHERE product_id = 'DTR_CORE_STATIC_V1'
  $q$ INTO v_count;
  INSERT INTO _soft_hide_preflight_metrics VALUES ('dtr_core_snapshot_rows', v_count);

  EXECUTE $q$
    SELECT count(*)::bigint FROM (
      SELECT user_id, product_id
        FROM public.dtr_report_snapshots
       GROUP BY user_id, product_id
      HAVING count(*) > 1
    ) dup
  $q$ INTO v_count;
  INSERT INTO _soft_hide_preflight_metrics VALUES ('legacy_duplicate_user_product_pairs', v_count);

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'dtr_report_snapshots'
       AND column_name = 'engine_context_json'
  ) INTO v_json_exists;

  IF v_json_exists THEN
    EXECUTE $q$
      SELECT count(*)::bigint FROM public.dtr_report_snapshots
       WHERE engine_context_json IS NOT NULL
    $q$ INTO v_count;
    INSERT INTO _soft_hide_preflight_metrics VALUES ('engine_context_json_nonnull_count', v_count);
    EXECUTE $q$
      SELECT count(*)::bigint FROM public.dtr_report_snapshots
       WHERE engine_context_json IS NULL
    $q$ INTO v_count;
    INSERT INTO _soft_hide_preflight_metrics VALUES ('engine_context_json_null_count', v_count);
  ELSE
    INSERT INTO _soft_hide_preflight_metrics (metric, value) VALUES
      ('engine_context_json_nonnull_count', -1),
      ('engine_context_json_null_count', -1);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'dtr_report_snapshots'
       AND column_name = 'engine_version'
  ) INTO v_ver_exists;

  IF v_ver_exists THEN
    EXECUTE $q$
      SELECT count(*)::bigint FROM public.dtr_report_snapshots
       WHERE engine_version IS NOT NULL
    $q$ INTO v_count;
    INSERT INTO _soft_hide_preflight_metrics VALUES ('engine_version_nonnull_count', v_count);
    EXECUTE $q$
      SELECT count(*)::bigint FROM public.dtr_report_snapshots
       WHERE engine_version IS NULL
    $q$ INTO v_count;
    INSERT INTO _soft_hide_preflight_metrics VALUES ('engine_version_null_count', v_count);
  ELSE
    INSERT INTO _soft_hide_preflight_metrics (metric, value) VALUES
      ('engine_version_nonnull_count', -1),
      ('engine_version_null_count', -1);
  END IF;
END $$;

SELECT metric, value
  FROM _soft_hide_preflight_metrics
 ORDER BY metric;

-- PASS: legacy_duplicate_user_product_pairs = 0
-- STOP: duplicate > 0
