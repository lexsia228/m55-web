-- =============================================================================
-- M55 — Compatibility purchase delivery v1 — Human postcheck (SELECT ONLY)
-- Run ONLY after applying:
--   supabase/migrations/20260713000000_compatibility_purchase_delivery_v1.sql
-- SHA-256: b0e51fabfc00d123fd0562bf75b58741167021befd78272cea82fd5d6dce5760
-- =============================================================================

SELECT current_database()::text AS current_database_name;

-- Tables + RLS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE(pol.policy_count, 0) AS policy_count
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN (
  SELECT tablename, COUNT(*)::integer AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) AS pol ON pol.tablename = c.relname
WHERE c.relname IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
ORDER BY c.relname;

-- Fulfillment RPC contract
SELECT
  pg_get_function_identity_arguments(p.oid)::text AS fulfill_rpc_identity_arguments,
  pg_get_function_result(p.oid)::text AS fulfill_rpc_result_type,
  (position('compatibility_report_full_v1' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_product_key_guard,
  (position('paid_compatibility_report_v1' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_snapshot_version_guard,
  (position('FOR UPDATE' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_row_lock,
  (position('ON CONFLICT (purchase_context_id) DO NOTHING' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_idempotent_insert,
  (position('duplicate' IN pg_get_functiondef(p.oid)) > 0) AS fulfill_duplicate_ack
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_fulfill_compatibility_report_v1';

-- Account deletion wrapper contract
SELECT
  (position('m55_account_deletion_process_base_v1' IN pg_get_functiondef(p.oid)) > 0) AS wrapper_calls_base,
  (position('m55_compatibility_account_delete_v1' IN pg_get_functiondef(p.oid)) > 0) AS wrapper_calls_compatibility_delete
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_account_deletion_process_v1';

-- service_role execute grants
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

-- Indexes
SELECT
  (to_regclass('public.compatibility_purchase_contexts_owner_created_idx') IS NOT NULL) AS idx_contexts_owner_created,
  (to_regclass('public.compatibility_purchase_contexts_pending_idx') IS NOT NULL) AS idx_contexts_pending,
  (to_regclass('public.compatibility_owned_reports_owner_created_idx') IS NOT NULL) AS idx_owned_owner_created;

-- Triggers
SELECT
  EXISTS (
    SELECT 1
    FROM pg_trigger AS tg
    JOIN pg_class AS c ON c.oid = tg.tgrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE tg.tgname = 'compatibility_purchase_context_snapshot_immutable'
  ) AS trigger_context_snapshot_immutable,
  EXISTS (
    SELECT 1
    FROM pg_trigger AS tg
    JOIN pg_class AS c ON c.oid = tg.tgrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE tg.tgname = 'compatibility_owned_report_immutable'
  ) AS trigger_owned_report_immutable;

-- Decisive postcheck classification
SELECT
  CASE
    WHEN to_regclass('public.compatibility_purchase_contexts') IS NULL THEN 'STOP_CONTEXTS_TABLE_MISSING'
    WHEN to_regclass('public.compatibility_owned_reports') IS NULL THEN 'STOP_OWNED_REPORTS_TABLE_MISSING'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
        AND pg_get_function_identity_arguments(p.oid) = 'p_purchase_context_id uuid, p_checkout_session_id text, p_payment_intent_id text'
        AND pg_get_function_result(p.oid) = 'jsonb'
    ) THEN 'STOP_FULFILL_RPC_IDENTITY_MISMATCH'
    WHEN (
      SELECT position('compatibility_report_full_v1' IN pg_get_functiondef(p.oid)) = 0
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
      LIMIT 1
    ) THEN 'STOP_FULFILL_RPC_BODY_PRODUCT_KEY_MISSING'
    WHEN (
      SELECT position('ON CONFLICT (purchase_context_id) DO NOTHING' IN pg_get_functiondef(p.oid)) = 0
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
      LIMIT 1
    ) THEN 'STOP_FULFILL_RPC_BODY_IDEMPOTENCY_MISSING'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_account_deletion_process_base_v1'
    ) THEN 'STOP_ACCOUNT_DELETION_BASE_MISSING'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_compatibility_account_delete_v1'
    ) THEN 'STOP_COMPATIBILITY_ACCOUNT_DELETE_RPC_MISSING'
    WHEN (
      SELECT position('m55_compatibility_account_delete_v1' IN pg_get_functiondef(p.oid)) = 0
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      WHERE p.proname = 'm55_account_deletion_process_v1'
      LIMIT 1
    ) THEN 'STOP_ACCOUNT_DELETION_WRAPPER_MISSING_COMPATIBILITY_DELETE'
    WHEN NOT (
      EXISTS (
        SELECT 1
        FROM pg_trigger AS tg
        JOIN pg_class AS c ON c.oid = tg.tgrelid
        JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE NOT tg.tgisinternal
          AND tg.tgname = 'compatibility_purchase_context_snapshot_immutable'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_trigger AS tg
        JOIN pg_class AS c ON c.oid = tg.tgrelid
        JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE NOT tg.tgisinternal
          AND tg.tgname = 'compatibility_owned_report_immutable'
      )
    ) THEN 'STOP_REQUIRED_TRIGGERS_MISSING'
    WHEN EXISTS (
      SELECT 1
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
      ) AS rc(table_name, column_name, expected_data_type, expected_is_nullable)
      LEFT JOIN information_schema.columns AS c
        ON c.table_schema = 'public'
       AND c.table_name = rc.table_name
       AND c.column_name = rc.column_name
      WHERE to_regclass('public.' || rc.table_name) IS NOT NULL
        AND (
          c.column_name IS NULL
          OR c.data_type <> rc.expected_data_type
          OR c.is_nullable <> rc.expected_is_nullable
        )
    ) THEN 'STOP_COLUMN_CONTRACT_MISMATCH'
    WHEN NOT (
      EXISTS (
        SELECT 1
        FROM pg_constraint AS con
        JOIN pg_class AS rel ON rel.oid = con.conrelid
        JOIN pg_namespace AS n ON n.oid = rel.relnamespace AND n.nspname = 'public'
        WHERE rel.relname = 'compatibility_purchase_contexts'
          AND con.contype = 'u'
          AND pg_get_constraintdef(con.oid) ILIKE '%stripe_checkout_session_id%'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint AS con
        JOIN pg_class AS rel ON rel.oid = con.conrelid
        JOIN pg_namespace AS n ON n.oid = rel.relnamespace AND n.nspname = 'public'
        WHERE rel.relname = 'compatibility_owned_reports'
          AND con.contype = 'u'
          AND pg_get_constraintdef(con.oid) ILIKE '%purchase_context_id%'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint AS con
        JOIN pg_class AS rel ON rel.oid = con.conrelid
        JOIN pg_namespace AS n ON n.oid = rel.relnamespace AND n.nspname = 'public'
        WHERE rel.relname = 'compatibility_owned_reports'
          AND con.contype = 'f'
          AND con.conname = 'compatibility_owned_reports_context_owner_fk'
      )
    ) THEN 'STOP_REQUIRED_CONSTRAINTS_MISSING'
    WHEN NOT (
      to_regclass('public.compatibility_purchase_contexts_owner_created_idx') IS NOT NULL
      AND to_regclass('public.compatibility_purchase_contexts_pending_idx') IS NOT NULL
      AND to_regclass('public.compatibility_owned_reports_owner_created_idx') IS NOT NULL
    ) THEN 'STOP_REQUIRED_INDEXES_MISSING'
    WHEN NOT (
      SELECT BOOL_AND(c.relrowsecurity)
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relname IN ('compatibility_purchase_contexts', 'compatibility_owned_reports')
    ) THEN 'STOP_RLS_NOT_ENABLED'
    WHEN NOT EXISTS (
      SELECT 1
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      JOIN information_schema.routine_privileges AS rp
        ON rp.specific_schema = 'public'
       AND rp.routine_name = p.proname
       AND rp.grantee = 'service_role'
       AND rp.privilege_type = 'EXECUTE'
      WHERE p.proname = 'm55_fulfill_compatibility_report_v1'
    ) THEN 'STOP_FULFILL_SERVICE_ROLE_EXECUTE_MISSING'
    WHEN NOT EXISTS (
      SELECT 1
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
      JOIN information_schema.routine_privileges AS rp
        ON rp.specific_schema = 'public'
       AND rp.routine_name = p.proname
       AND rp.grantee = 'service_role'
       AND rp.privilege_type = 'EXECUTE'
      WHERE p.proname = 'm55_account_deletion_process_v1'
    ) THEN 'STOP_ACCOUNT_DELETION_SERVICE_ROLE_EXECUTE_MISSING'
    ELSE 'POSTCHECK_GREEN'
  END AS postcheck_classification;
