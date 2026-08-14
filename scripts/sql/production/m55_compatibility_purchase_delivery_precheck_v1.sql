-- =============================================================================
-- M55 — Compatibility purchase delivery v1 — Human precheck (SELECT ONLY)
-- Target: Production m55-soul-core (ref hsdxixvoijuujhpyxgdo)
-- Migration: supabase/migrations/20260713000000_compatibility_purchase_delivery_v1.sql
-- SHA-256: b0e51fabfc00d123fd0562bf75b58741167021befd78272cea82fd5d6dce5760
--
-- FORBIDDEN: INSERT / UPDATE / DELETE / DDL / NOTIFY / SET / RPC invocation
-- Human must confirm Supabase project identity in UI before trusting classification.
-- =============================================================================

-- SECTION A — database identity (operator confirmation required)
SELECT
  current_database()::text AS current_database_name,
  current_setting('server_version')::text AS postgres_server_version,
  (
    current_database()::text = 'postgres'
    OR current_database()::text ILIKE '%soul%'
  ) AS database_name_hint_matches_soul_core,
  'CONFIRM_IN_SUPABASE_UI_m55-soul-core_hsdxixvoijuujhpyxgdo' AS required_human_project_identity;

-- SECTION B — required relation existence
SELECT
  to_regclass('public.compatibility_purchase_contexts')::text AS compatibility_purchase_contexts_regclass,
  to_regclass('public.compatibility_owned_reports')::text AS compatibility_owned_reports_regclass,
  (to_regclass('public.compatibility_purchase_contexts') IS NOT NULL) AS compatibility_purchase_contexts_exists,
  (to_regclass('public.compatibility_owned_reports') IS NOT NULL) AS compatibility_owned_reports_exists;

-- SECTION C — relation kinds
SELECT
  c.relname,
  c.relkind,
  CASE c.relkind
    WHEN 'r' THEN 'ordinary_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    ELSE c.relkind::text
  END AS relation_kind_label
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
ORDER BY c.relname;

-- SECTION D — required columns / types / nullability (absence-safe)
WITH required_columns AS (
  SELECT *
  FROM (
    VALUES
      ('compatibility_purchase_contexts', 'id', 'uuid', 'NO'),
      ('compatibility_purchase_contexts', 'owner_user_id', 'text', 'NO'),
      ('compatibility_purchase_contexts', 'product_key', 'text', 'NO'),
      ('compatibility_purchase_contexts', 'snapshot_version', 'text', 'NO'),
      ('compatibility_purchase_contexts', 'pending_snapshot', 'jsonb', 'NO'),
      ('compatibility_purchase_contexts', 'status', 'text', 'NO'),
      ('compatibility_purchase_contexts', 'stripe_checkout_session_id', 'text', 'YES'),
      ('compatibility_purchase_contexts', 'stripe_payment_intent_id', 'text', 'YES'),
      ('compatibility_purchase_contexts', 'stripe_session_expires_at', 'timestamp with time zone', 'YES'),
      ('compatibility_purchase_contexts', 'created_at', 'timestamp with time zone', 'NO'),
      ('compatibility_purchase_contexts', 'updated_at', 'timestamp with time zone', 'NO'),
      ('compatibility_purchase_contexts', 'fulfilled_at', 'timestamp with time zone', 'YES'),
      ('compatibility_owned_reports', 'id', 'uuid', 'NO'),
      ('compatibility_owned_reports', 'owner_user_id', 'text', 'NO'),
      ('compatibility_owned_reports', 'purchase_context_id', 'uuid', 'NO'),
      ('compatibility_owned_reports', 'product_key', 'text', 'NO'),
      ('compatibility_owned_reports', 'snapshot_version', 'text', 'NO'),
      ('compatibility_owned_reports', 'snapshot', 'jsonb', 'NO'),
      ('compatibility_owned_reports', 'created_at', 'timestamp with time zone', 'NO')
  ) AS t(table_name, column_name, expected_data_type, expected_is_nullable)
),
observed AS (
  SELECT
    rc.table_name,
    rc.column_name,
    rc.expected_data_type,
    rc.expected_is_nullable,
    c.data_type AS observed_data_type,
    c.is_nullable AS observed_is_nullable,
    (to_regclass('public.' || rc.table_name) IS NOT NULL) AS table_exists,
    (
      to_regclass('public.' || rc.table_name) IS NOT NULL
      AND c.column_name IS NOT NULL
      AND c.data_type = rc.expected_data_type
      AND c.is_nullable = rc.expected_is_nullable
    ) AS column_contract_ok
  FROM required_columns AS rc
  LEFT JOIN information_schema.columns AS c
    ON c.table_schema = 'public'
   AND c.table_name = rc.table_name
   AND c.column_name = rc.column_name
)
SELECT
  table_name,
  column_name,
  table_exists,
  expected_data_type,
  observed_data_type,
  expected_is_nullable,
  observed_is_nullable,
  column_contract_ok
FROM observed
ORDER BY table_name, column_name;

-- SECTION E — constraints (absence-safe)
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  (to_regclass('public.compatibility_purchase_contexts') IS NOT NULL) AS contexts_table_exists,
  EXISTS (
    SELECT 1
    FROM pg_constraint AS con
    JOIN pg_class AS rel ON rel.oid = con.conrelid
    JOIN pg_namespace AS n ON n.oid = rel.relnamespace AND n.nspname = 'public'
    WHERE rel.relname = 'compatibility_purchase_contexts'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%stripe_checkout_session_id%'
  ) AS contexts_stripe_session_unique_present,
  EXISTS (
    SELECT 1
    FROM pg_constraint AS con
    JOIN pg_class AS rel ON rel.oid = con.conrelid
    JOIN pg_namespace AS n ON n.oid = rel.relnamespace AND n.nspname = 'public'
    WHERE rel.relname = 'compatibility_owned_reports'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%purchase_context_id%'
  ) AS owned_reports_context_unique_present,
  EXISTS (
    SELECT 1
    FROM pg_constraint AS con
    JOIN pg_class AS rel ON rel.oid = con.conrelid
    JOIN pg_namespace AS n ON n.oid = rel.relnamespace AND n.nspname = 'public'
    WHERE rel.relname = 'compatibility_owned_reports'
      AND con.contype = 'f'
      AND con.conname = 'compatibility_owned_reports_context_owner_fk'
  ) AS owned_reports_context_owner_fk_present;

-- SECTION F — indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
ORDER BY tablename, indexname;

SELECT
  (to_regclass('public.compatibility_purchase_contexts_owner_created_idx') IS NOT NULL) AS idx_contexts_owner_created,
  (to_regclass('public.compatibility_purchase_contexts_pending_idx') IS NOT NULL) AS idx_contexts_pending,
  (to_regclass('public.compatibility_owned_reports_owner_created_idx') IS NOT NULL) AS idx_owned_owner_created;

-- SECTION G — RLS / policy state
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COALESCE(pol.policy_count, 0) AS policy_count
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN (
  SELECT schemaname, tablename, COUNT(*)::integer AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
) AS pol
  ON pol.tablename = c.relname
WHERE c.relname IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
ORDER BY c.relname;

-- SECTION H — RPC existence
SELECT EXISTS (
  SELECT 1
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
) AS fulfill_rpc_exists;

SELECT EXISTS (
  SELECT 1
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_compatibility_account_delete_v1'
) AS compatibility_account_delete_rpc_exists;

SELECT EXISTS (
  SELECT 1
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_account_deletion_process_base_v1'
) AS account_deletion_base_rpc_exists;

SELECT EXISTS (
  SELECT 1
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_account_deletion_process_v1'
) AS account_deletion_wrapper_rpc_exists;

-- SECTION I — RPC identity arguments / result
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid)::text AS rpc_identity_arguments,
  pg_get_function_result(p.oid)::text AS rpc_result_type,
  p.prosecdef AS security_definer
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname IN (
  'm55_fulfill_compatibility_report_v1',
  'm55_compatibility_account_delete_v1',
  'm55_account_deletion_process_base_v1',
  'm55_account_deletion_process_v1'
)
ORDER BY p.proname;

-- SECTION J — RPC body markers (fulfillment + deletion wrapper)
SELECT
  (position('compatibility_report_full_v1' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_body_product_key_present,
  (position('paid_compatibility_report_v1' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_body_snapshot_version_present,
  (position('ON CONFLICT (purchase_context_id) DO NOTHING' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_body_idempotent_insert_present,
  (position('FOR UPDATE' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_body_row_lock_present,
  (position('duplicate' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_body_duplicate_return_present
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_fulfill_compatibility_report_v1';

SELECT
  (position('m55_account_deletion_process_base_v1' IN pg_get_functiondef(p.oid)) > 0) AS wrapper_calls_base,
  (position('m55_compatibility_account_delete_v1' IN pg_get_functiondef(p.oid)) > 0) AS wrapper_calls_compatibility_delete
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_account_deletion_process_v1';

-- SECTION K — service_role execute privilege
SELECT
  p.proname,
  EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges AS rp
    WHERE rp.specific_schema = 'public'
      AND rp.routine_name = p.proname
      AND rp.grantee = 'service_role'
      AND rp.privilege_type = 'EXECUTE'
  ) AS service_role_execute_granted
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname IN (
  'm55_fulfill_compatibility_report_v1',
  'm55_account_deletion_process_v1'
)
ORDER BY p.proname;

-- SECTION L — triggers
SELECT
  tg.tgname AS trigger_name,
  c.relname AS table_name
FROM pg_trigger AS tg
JOIN pg_class AS c ON c.oid = tg.tgrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE NOT tg.tgisinternal
  AND tg.tgname IN (
    'compatibility_purchase_context_snapshot_immutable',
    'compatibility_owned_report_immutable'
  )
ORDER BY tg.tgname;

-- SECTION M — current compatibility row counts (only if relations exist)
SELECT
  CASE
    WHEN to_regclass('public.compatibility_purchase_contexts') IS NULL THEN NULL::bigint
    ELSE (SELECT COUNT(*)::bigint FROM public.compatibility_purchase_contexts)
  END AS compatibility_purchase_contexts_count,
  CASE
    WHEN to_regclass('public.compatibility_owned_reports') IS NULL THEN NULL::bigint
    ELSE (SELECT COUNT(*)::bigint FROM public.compatibility_owned_reports)
  END AS compatibility_owned_reports_count;

-- SECTION N — decisive classification
WITH flags AS (
  SELECT
    (
      current_database()::text = 'postgres'
      OR current_database()::text ILIKE '%soul%'
    ) AS database_name_hint_matches_soul_core,
    (to_regclass('public.compatibility_purchase_contexts') IS NOT NULL) AS contexts_exists,
    (to_regclass('public.compatibility_owned_reports') IS NOT NULL) AS owned_exists,
    EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
        AND pg_get_function_identity_arguments(p.oid) = 'p_purchase_context_id uuid, p_checkout_session_id text, p_payment_intent_id text'
        AND pg_get_function_result(p.oid) = 'jsonb'
    ) AS fulfill_rpc_identity_ok,
    EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
        AND position('compatibility_report_full_v1' IN pg_get_functiondef(p.oid)) > 0
        AND position('ON CONFLICT (purchase_context_id) DO NOTHING' IN pg_get_functiondef(p.oid)) > 0
    ) AS fulfill_rpc_body_ok,
    EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      JOIN information_schema.routine_privileges AS rp
        ON rp.specific_schema = 'public'
       AND rp.routine_name = p.proname
       AND rp.grantee = 'service_role'
       AND rp.privilege_type = 'EXECUTE'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
    ) AS fulfill_service_role_execute,
    EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_account_deletion_process_base_v1'
    ) AS deletion_base_exists,
    EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_account_deletion_process_v1'
        AND position('m55_compatibility_account_delete_v1' IN pg_get_functiondef(p.oid)) > 0
    ) AS deletion_wrapper_ok,
    (
      SELECT BOOL_AND(c.relrowsecurity)
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relname IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
    ) AS both_tables_rls_enabled,
    (
      SELECT COUNT(*) = 2
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relname IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
    ) AS both_tables_present,
    (
      to_regclass('public.compatibility_purchase_contexts_owner_created_idx') IS NOT NULL
      AND to_regclass('public.compatibility_purchase_contexts_pending_idx') IS NOT NULL
      AND to_regclass('public.compatibility_owned_reports_owner_created_idx') IS NOT NULL
    ) AS required_indexes_present,
    EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_account_deletion_process_v1'
        AND NOT EXISTS (
          SELECT 1 FROM pg_proc AS p2
          JOIN pg_namespace AS n2 ON p2.pronamespace = n2.oid AND n2.nspname = 'public'
          WHERE p2.proname = 'm55_account_deletion_process_base_v1'
        )
    ) AS pre_migration_deletion_state,
    (
      (to_regclass('public.compatibility_purchase_contexts') IS NOT NULL)
      OR (to_regclass('public.compatibility_owned_reports') IS NOT NULL)
      OR EXISTS (
        SELECT 1 FROM pg_proc AS p
        JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
        WHERE p.proname IN (
          'm55_fulfill_compatibility_report_v1',
          'm55_compatibility_account_delete_v1'
        )
      )
      OR EXISTS (
        SELECT 1 FROM pg_proc AS p
        JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
        WHERE p.proname = 'm55_account_deletion_process_base_v1'
      )
    ) AS any_compatibility_artifact_present
)
SELECT
  database_name_hint_matches_soul_core,
  contexts_exists,
  owned_exists,
  fulfill_rpc_identity_ok,
  fulfill_rpc_body_ok,
  fulfill_service_role_execute,
  deletion_base_exists,
  deletion_wrapper_ok,
  both_tables_rls_enabled,
  both_tables_present,
  required_indexes_present,
  pre_migration_deletion_state,
  any_compatibility_artifact_present,
  CASE
    WHEN NOT database_name_hint_matches_soul_core THEN 'STOP_PRODUCTION_IDENTITY_UNVERIFIED'
    WHEN contexts_exists
      AND owned_exists
      AND fulfill_rpc_identity_ok
      AND fulfill_rpc_body_ok
      AND fulfill_service_role_execute
      AND deletion_base_exists
      AND deletion_wrapper_ok
      AND both_tables_rls_enabled
      AND required_indexes_present
      THEN 'ALREADY_APPLIED'
    WHEN any_compatibility_artifact_present
      AND NOT (
        contexts_exists
        AND owned_exists
        AND fulfill_rpc_identity_ok
        AND fulfill_rpc_body_ok
        AND fulfill_service_role_execute
        AND deletion_base_exists
        AND deletion_wrapper_ok
        AND both_tables_rls_enabled
        AND required_indexes_present
      )
      THEN 'PARTIAL_OR_DRIFTED'
    WHEN NOT any_compatibility_artifact_present
      AND pre_migration_deletion_state
      THEN 'SAFE_TO_APPLY_COMPATIBILITY_DELIVERY_V1'
    WHEN NOT any_compatibility_artifact_present
      AND NOT pre_migration_deletion_state
      THEN 'STOP_ACCOUNT_DELETION_RPC_PREREQUISITE_MISSING'
    ELSE 'PARTIAL_OR_DRIFTED'
  END AS precheck_classification
FROM flags;
