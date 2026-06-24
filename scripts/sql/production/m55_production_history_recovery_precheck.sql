-- =============================================================================
-- READ-ONLY — M55 Production History-Only Backfill precheck
-- Path: scripts/sql/production/m55_production_history_recovery_precheck.sql
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- Exactly one top-level SELECT/WITH. SELECT/WITH only. No DDL/DML/CALL/COPY/DO.
-- No application-row reads. No secrets.
--
-- Same Run: prepend three GUC SET statements before this file (preflight convention).
-- Phase 2 version excluded from recovery scope (not in expected_versions).
-- =============================================================================

WITH
params AS (
  SELECT
    'm55-soul'::text AS expected_org,
    'm55-soul-core'::text AS expected_project,
    'PRODUCTION'::text AS expected_environment,
    'postgres'::text AS expected_database,
    'postgres'::text AS expected_role,
    ARRAY[
      'consult_messages',
      'consult_send_commits',
      'consult_threads',
      'dtr_guest_drafts',
      'dtr_report_snapshots',
      'entitlement_rights',
      'entitlements',
      'failed_fulfillments',
      'one_time_fulfillments',
      'reply_documents',
      'reply_sessions',
      'reply_ticket_wallets',
      'reply_wallet_ledgers',
      'stripe_events',
      'stripe_processed_events'
    ]::text[] AS baseline_relations,
    ARRAY[
      '20260614000000',
      '20260615000001',
      '20260615000002',
      '20260615000003',
      '20260615000004',
      '20260615000005',
      '20260615000006'
    ]::text[] AS recovery_versions
),
human_identity AS (
  SELECT
    current_setting('m55.production.human_supabase_org_confirmed', true) AS human_org,
    current_setting('m55.production.human_supabase_project_confirmed', true) AS human_project,
    current_setting('m55.production.human_supabase_environment_confirmed', true) AS human_environment
),
session_identity AS (
  SELECT
    current_database()::text AS current_database_name,
    current_user::text AS current_user_name
),
ui_identity AS (
  SELECT
    (
      COALESCE(hi.human_org = p.expected_org, false)
      AND COALESCE(hi.human_project = p.expected_project, false)
      AND COALESCE(hi.human_environment = p.expected_environment, false)
      AND COALESCE(si.current_database_name = p.expected_database, false)
      AND COALESCE(si.current_user_name = p.expected_role, false)
    ) AS ui_identity_exact
  FROM params p
  CROSS JOIN human_identity hi
  CROSS JOIN session_identity si
),
history_catalog AS (
  SELECT
    to_regnamespace('supabase_migrations') IS NOT NULL AS history_schema_exists,
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS canonical_history_relation_exists,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'schema', n.nspname,
            'relname', c.relname,
            'relkind', c.relkind::text,
            'is_canonical', (n.nspname = 'supabase_migrations' AND c.relname = 'schema_migrations')
          )
          ORDER BY n.nspname, c.relname
        )
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'schema_migrations'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ),
      '[]'::jsonb
    ) AS schema_migrations_relations_any_schema
),
baseline_relations AS (
  SELECT
    bool_and(
      to_regclass(format('public.%I', r.relation_name)) IS NOT NULL
      AND COALESCE(
        (
          SELECT c.relkind::text
          FROM pg_catalog.pg_class c
          WHERE c.oid = to_regclass(format('public.%I', r.relation_name))
        ),
        ''
      ) = 'r'
    ) AS baseline_complete
  FROM (
    SELECT unnest(p.baseline_relations) AS relation_name
    FROM params p
  ) r
),
chain_objects AS (
  SELECT
    (
      (CASE WHEN to_regclass('public.clerk_webhook_events') IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN to_regprocedure('public.m55_account_deletion_process_v1(text,text,text,text)') IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN (
          EXISTS (
            SELECT 1
            FROM pg_catalog.pg_class ic
            JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
            JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
            JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
            WHERE rn.nspname = 'public'
              AND rc.relname = 'entitlements'
              AND ic.relname = 'entitlements_user_id_product_id_key'
          )
          OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint con
            JOIN pg_catalog.pg_class rc ON rc.oid = con.conrelid
            JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
            WHERE rn.nspname = 'public'
              AND rc.relname = 'entitlements'
              AND con.conname = 'entitlements_user_id_product_id_key'
              AND con.contype = 'u'
          )
        ) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class ic
          JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
          JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
          JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
          WHERE rn.nspname = 'public'
            AND rc.relname = 'dtr_report_snapshots'
            AND ic.relname LIKE '%visible%'
        ) THEN 1 ELSE 0 END)
      + (CASE WHEN EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute a
          JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = 'failed_fulfillments'
            AND a.attname = 'user_ref_hash'
            AND a.attnum > 0
            AND NOT a.attisdropped
        ) THEN 1 ELSE 0 END)
    )::integer AS chain_object_present_count,
    (
      (
        EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class ic
          JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
          JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
          JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
          WHERE rn.nspname = 'public'
            AND rc.relname = 'entitlements'
            AND ic.relname = 'entitlements_user_id_product_id_key'
        )
        OR EXISTS (
          SELECT 1
          FROM pg_catalog.pg_constraint con
          JOIN pg_catalog.pg_class rc ON rc.oid = con.conrelid
          JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
          WHERE rn.nspname = 'public'
            AND rc.relname = 'entitlements'
            AND con.conname = 'entitlements_user_id_product_id_key'
            AND con.contype = 'u'
        )
      )
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class ic
        JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
        JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
        JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
        WHERE rn.nspname = 'public'
          AND rc.relname = 'dtr_report_snapshots'
          AND ic.relname LIKE '%visible%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class ic
        JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
        JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
        JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
        WHERE rn.nspname = 'public'
          AND rc.relname = 'entitlements'
          AND ic.relname = 'entitlements_user_product_uq'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class ic
        JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
        JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
        JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
        WHERE rn.nspname = 'public'
          AND rc.relname = 'entitlements'
          AND ic.relname = 'uq_entitlements_user_product'
      )
    ) AS has_p7_final_state
  FROM params p
),
recovery_eval AS (
  SELECT
    ui.ui_identity_exact,
    NOT hc.canonical_history_relation_exists AS canonical_history_absent,
    NOT hc.history_schema_exists AS history_schema_absent,
    hc.schema_migrations_relations_any_schema AS non_canonical_schema_migrations,
    br.baseline_complete,
    co.chain_object_present_count,
    co.has_p7_final_state,
    (
      ui.ui_identity_exact
      AND NOT hc.canonical_history_relation_exists
      AND NOT hc.history_schema_exists
      AND br.baseline_complete
      AND co.chain_object_present_count = 5
      AND co.has_p7_final_state
    ) AS recovery_precheck_pass
  FROM ui_identity ui
  CROSS JOIN history_catalog hc
  CROSS JOIN baseline_relations br
  CROSS JOIN chain_objects co
)
SELECT
  CASE
    WHEN NOT re.ui_identity_exact THEN 'HOLD_IDENTITY_MISMATCH'
    WHEN NOT re.canonical_history_absent THEN 'HOLD_CANONICAL_HISTORY_PRESENT'
    WHEN NOT re.history_schema_absent THEN 'HOLD_HISTORY_SCHEMA_PRESENT'
    WHEN NOT re.baseline_complete THEN 'HOLD_BASELINE_INCOMPLETE'
    WHEN re.chain_object_present_count <> 5 THEN 'HOLD_CHAIN_OBJECT_PARTIAL'
    WHEN NOT re.has_p7_final_state THEN 'HOLD_P7_FINAL_STATE_INCOMPLETE'
    WHEN re.recovery_precheck_pass THEN 'HISTORY_RECOVERY_PRECHECK_GREEN'
    ELSE 'HOLD_RECOVERY_PRECHECK_UNKNOWN'
  END AS precheck_classification,
  re.ui_identity_exact,
  re.canonical_history_absent,
  re.baseline_complete,
  re.chain_object_present_count,
  re.has_p7_final_state,
  re.recovery_precheck_pass,
  re.non_canonical_schema_migrations,
  NOT re.recovery_precheck_pass AS stop_required,
  CASE
    WHEN re.recovery_precheck_pass THEN
      'CATEGORY-1-M55-PRODUCTION-MIGRATION-HISTORY-RECOVERY-EXECUTION-AUTHORITY-REV1'::text
    ELSE
      'CATEGORY-1-M55-PRODUCTION-MIGRATION-HISTORY-RECOVERY-HOLD-REV1'::text
  END AS recommended_next_gate
FROM recovery_eval re;
