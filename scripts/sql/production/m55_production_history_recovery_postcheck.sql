-- =============================================================================
-- READ-ONLY — M55 Production History-Only Backfill postcheck
-- Path: scripts/sql/production/m55_production_history_recovery_postcheck.sql
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- Exactly one top-level SELECT/WITH. SELECT/WITH only. No DDL/DML/CALL/COPY/DO.
-- No application-row reads. No secrets.
--
-- Same Run: prepend three GUC SET statements before this file.
-- P1-P7 recovery scope only. Phase 2 gap version excluded from expected_versions.
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
      '20260614000000',
      '20260615000001',
      '20260615000002',
      '20260615000003',
      '20260615000004',
      '20260615000005',
      '20260615000006'
    ]::text[] AS expected_versions,
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
    ]::text[] AS baseline_relations
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
history_shape AS (
  SELECT
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history_relation_exists,
    COALESCE(
      (
        SELECT
          c.oid IS NOT NULL
          AND n.nspname = 'supabase_migrations'
          AND c.relname = 'schema_migrations'
          AND c.relkind = 'r'
          AND EXISTS (
            SELECT 1
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.oid
              AND a.attname = 'version'
              AND a.attnum > 0
              AND NOT a.attisdropped
          )
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
      ),
      false
    ) AS history_supported,
    'SELECT version::text AS version FROM supabase_migrations.schema_migrations'::text AS history_query_text
),
history_rows AS (
  SELECT x.version
  FROM history_shape hs
  CROSS JOIN LATERAL (
    SELECT query_to_xml(hs.history_query_text, false, false, '') AS doc
  ) q
  CROSS JOIN LATERAL XMLTABLE(
    '/table/row'
    PASSING q.doc
    COLUMNS version text PATH 'version'
  ) AS x
  WHERE hs.history_supported
    AND x.version IS NOT NULL
),
history_eval AS (
  SELECT
    hs.history_supported,
    COALESCE((SELECT array_agg(hr.version ORDER BY hr.version) FROM history_rows hr), ARRAY[]::text[]) AS applied_versions,
    (
      SELECT COALESCE(array_agg(ev ORDER BY ev), ARRAY[]::text[])
      FROM unnest(p.expected_versions) AS ev
      WHERE NOT (ev = ANY (COALESCE((SELECT array_agg(hr.version) FROM history_rows hr), ARRAY[]::text[])))
    ) AS missing_versions,
    (
      SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
      FROM unnest(COALESCE((SELECT array_agg(hr.version) FROM history_rows hr), ARRAY[]::text[])) AS v
      WHERE NOT (v = ANY (p.expected_versions))
    ) AS unexpected_versions,
    (
      SELECT cardinality(array_agg(DISTINCT hr.version))
      FROM history_rows hr
      WHERE hr.version = ANY (p.expected_versions)
    ) AS history_row_count
  FROM params p
  CROSS JOIN history_shape hs
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
),
postcheck_eval AS (
  SELECT
    ui.ui_identity_exact,
    he.history_supported,
    he.applied_versions,
    he.missing_versions,
    he.unexpected_versions,
    COALESCE(he.history_row_count, 0)::integer AS history_row_count,
    (
      br.baseline_complete
      AND co.chain_object_present_count = 5
      AND co.has_p7_final_state
    ) AS object_state_exact,
    (
      ui.ui_identity_exact
      AND he.history_supported
      AND he.applied_versions = p.expected_versions
      AND cardinality(he.missing_versions) = 0
      AND cardinality(he.unexpected_versions) = 0
      AND COALESCE(he.history_row_count, 0) = 7
      AND br.baseline_complete
      AND co.chain_object_present_count = 5
      AND co.has_p7_final_state
    ) AS recovery_postcheck_pass
  FROM ui_identity ui
  CROSS JOIN history_eval he
  CROSS JOIN params p
  CROSS JOIN baseline_relations br
  CROSS JOIN chain_objects co
)
SELECT
  CASE
    WHEN NOT pe.ui_identity_exact THEN 'HOLD_IDENTITY_MISMATCH'
    WHEN NOT pe.history_supported THEN 'HOLD_HISTORY_UNSUPPORTED'
    WHEN cardinality(pe.missing_versions) > 0 THEN 'HOLD_HISTORY_MISSING_VERSIONS'
    WHEN cardinality(pe.unexpected_versions) > 0 THEN 'HOLD_HISTORY_UNEXPECTED_VERSIONS'
    WHEN pe.history_row_count <> 7 THEN 'HOLD_HISTORY_ROW_COUNT'
    WHEN NOT pe.object_state_exact THEN 'HOLD_OBJECT_STATE_DRIFT'
    WHEN pe.recovery_postcheck_pass THEN 'HISTORY_RECOVERY_POSTCHECK_GREEN'
    ELSE 'HOLD_RECOVERY_POSTCHECK_UNKNOWN'
  END AS postcheck_classification,
  pe.ui_identity_exact,
  pe.history_supported,
  pe.applied_versions,
  pe.missing_versions,
  pe.unexpected_versions,
  pe.history_row_count,
  pe.object_state_exact,
  pe.recovery_postcheck_pass,
  NOT pe.recovery_postcheck_pass AS stop_required,
  CASE
    WHEN pe.recovery_postcheck_pass THEN
      'CATEGORY-1-M55-PRODUCTION-MIGRATION-POST-RECOVERY-PREFLIGHT-READONLY-REV1'::text
    ELSE
      'CATEGORY-1-M55-PRODUCTION-MIGRATION-HISTORY-RECOVERY-HOLD-REV1'::text
  END AS next_gate
FROM postcheck_eval pe;
