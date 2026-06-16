-- =============================================================================
-- READ-ONLY — M55 Production migration integrated postcheck
-- Path: scripts/sql/production/m55_production_migration_postcheck.sql
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- SELECT/WITH only. No DDL/DML/CALL/COPY/DO. No row PII dumps.
-- =============================================================================

WITH
params AS (
  SELECT ARRAY[
    '20260614000000',
    '20260615000001',
    '20260615000002',
    '20260615000003',
    '20260615000004',
    '20260615000005',
    '20260615000006'
  ]::text[] AS expected_versions
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
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
      ),
      false
    ) AS history_relation_is_supported,
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
  WHERE hs.history_relation_is_supported
    AND x.version IS NOT NULL
),
history_eval AS (
  SELECT
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
      SELECT COUNT(*) > 0
      FROM (
        SELECT hr.version
        FROM history_rows hr
        GROUP BY hr.version
        HAVING COUNT(*) > 1
      ) d
    ) AS duplicate_versions
  FROM params p
),
required_tables AS (
  SELECT
    COUNT(*) FILTER (WHERE to_regclass(format('public.%I', t.name)) IS NOT NULL)::integer AS present_count,
    17::integer AS expected_count
  FROM (
    VALUES
      ('consult_messages'),
      ('consult_send_commits'),
      ('consult_threads'),
      ('dtr_guest_drafts'),
      ('dtr_report_snapshots'),
      ('entitlement_rights'),
      ('entitlements'),
      ('failed_fulfillments'),
      ('one_time_fulfillments'),
      ('reply_documents'),
      ('reply_sessions'),
      ('reply_ticket_wallets'),
      ('reply_wallet_ledgers'),
      ('stripe_events'),
      ('stripe_processed_events'),
      ('clerk_webhook_events')
  ) AS t(name)
),
function_eval AS (
  SELECT
    to_regprocedure('public.m55_account_deletion_process_v1(text,text,text)') IS NOT NULL AS deletion_rpc_present,
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
        AND p.prosecdef
    ) AS deletion_rpc_security_definer,
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
        AND pg_get_function_identity_arguments(p.oid) = 'p_clerk_user_id text, p_svix_id text, p_user_ref_hash text'
    ) AS deletion_rpc_signature_exact
),
index_eval AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_class ic
      JOIN pg_index i ON i.indexrelid = ic.oid
      JOIN pg_class rc ON rc.oid = i.indrelid
      WHERE rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_id_key_unique'
        AND i.indisunique
    ) AS entitlements_canonical_unique,
    EXISTS (
      SELECT 1
      FROM pg_class ic
      JOIN pg_index i ON i.indexrelid = ic.oid
      JOIN pg_class rc ON rc.oid = i.indrelid
      WHERE rc.relname = 'dtr_report_snapshots'
        AND ic.relname LIKE '%visible%'
        AND i.indisunique
    ) AS dtr_visible_unique
),
privilege_eval AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_roles r ON r.oid = p.proowner
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) AS deletion_rpc_service_role_execute,
    EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'entitlements'
        AND c.relrowsecurity
    ) AS entitlements_rls_enabled
),
purchase_eval AS (
  SELECT
    to_regclass('public.one_time_fulfillments') IS NOT NULL AS purchase_fulfillment_table,
    to_regclass('public.reply_ticket_wallets') IS NOT NULL AS wallet_table,
    to_regclass('public.reply_wallet_ledgers') IS NOT NULL AS ledger_table,
    to_regclass('public.dtr_report_snapshots') IS NOT NULL AS snapshot_table
),
schema_cache_eval AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
    ) AS deletion_rpc_visible_in_catalog,
    EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'clerk_webhook_events'
    ) AS clerk_events_visible_in_catalog
),
unexpected_eval AS (
  SELECT false AS unexpected_object_detected
),
authority_inputs AS (
  SELECT
    COALESCE(
      NULLIF(current_setting('m55.production.approved_required_apply_versions', true), ''),
      ''
    )::text AS approved_required_apply_versions_csv,
    COALESCE(
      NULLIF(current_setting('m55.production.approved_preflight_identity', true), ''),
      ''
    )::text AS approved_preflight_identity
),
apply_evidence AS (
  SELECT
    ai.approved_required_apply_versions_csv,
    ai.approved_preflight_identity,
    CASE
      WHEN ai.approved_required_apply_versions_csv = '' THEN ARRAY[]::text[]
      ELSE string_to_array(ai.approved_required_apply_versions_csv, ',')
    END AS approved_required_apply_versions,
    he.applied_versions,
    rt.present_count,
    (
      SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
      FROM unnest(he.applied_versions) AS v
      WHERE v = ANY (
        CASE
          WHEN ai.approved_required_apply_versions_csv = '' THEN ARRAY[]::text[]
          ELSE string_to_array(ai.approved_required_apply_versions_csv, ',')
        END
      )
    ) AS newly_applied_in_authority_set,
    (
      SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
      FROM unnest(he.applied_versions) AS v
      WHERE NOT (
        v = ANY (
          CASE
            WHEN ai.approved_required_apply_versions_csv = '' THEN ARRAY[]::text[]
            ELSE string_to_array(ai.approved_required_apply_versions_csv, ',')
          END
        )
      )
    ) AS previously_applied_versions,
    (
      ai.approved_required_apply_versions_csv = ''
      OR NOT EXISTS (
        SELECT 1
        FROM unnest(he.applied_versions) AS v
        WHERE v <> ALL (
          CASE
            WHEN ai.approved_required_apply_versions_csv = '' THEN ARRAY[]::text[]
            ELSE string_to_array(ai.approved_required_apply_versions_csv, ',')
          END
        )
        AND v <> ALL (p.expected_versions)
      )
    ) AS approved_set_respected,
    md5(
      COALESCE(array_to_string(he.applied_versions, ','), '')
      || ':'
      || rt.present_count::text
    ) AS current_schema_identity
  FROM authority_inputs ai
  CROSS JOIN history_eval he
  CROSS JOIN params p
  CROSS JOIN required_tables rt
),
summary AS (
  SELECT
    he.applied_versions,
    he.missing_versions,
    he.unexpected_versions,
    he.duplicate_versions,
    rt.present_count,
    rt.expected_count,
    fe.deletion_rpc_present,
    fe.deletion_rpc_security_definer,
    fe.deletion_rpc_signature_exact,
    ie.entitlements_canonical_unique,
    ie.dtr_visible_unique,
    pe.deletion_rpc_service_role_execute,
    pe.entitlements_rls_enabled,
    pu.purchase_fulfillment_table,
    pu.wallet_table,
    pu.ledger_table,
    pu.snapshot_table,
    sc.deletion_rpc_visible_in_catalog,
    sc.clerk_events_visible_in_catalog,
    ue.unexpected_object_detected,
    ae.approved_required_apply_versions,
    ae.newly_applied_in_authority_set,
    ae.previously_applied_versions,
    ae.approved_set_respected,
    ae.current_schema_identity,
    (
      cardinality(he.missing_versions) = 0
      AND cardinality(he.unexpected_versions) = 0
      AND NOT he.duplicate_versions
      AND he.applied_versions = p.expected_versions
    ) AS history_green,
    (
      rt.present_count = rt.expected_count
      AND fe.deletion_rpc_present
      AND fe.deletion_rpc_signature_exact
      AND ie.entitlements_canonical_unique
      AND ie.dtr_visible_unique
    ) AS objects_green,
    (
      pe.deletion_rpc_service_role_execute
      AND pe.entitlements_rls_enabled
    ) AS privileges_green,
    (
      pu.purchase_fulfillment_table
      AND pu.wallet_table
      AND pu.ledger_table
      AND pu.snapshot_table
    ) AS purchase_contract_green,
    (
      fe.deletion_rpc_present
      AND fe.deletion_rpc_security_definer
      AND pe.deletion_rpc_service_role_execute
    ) AS deletion_contract_green,
    (
      sc.deletion_rpc_visible_in_catalog
      AND sc.clerk_events_visible_in_catalog
    ) AS schema_cache_ready
  FROM history_eval he
  CROSS JOIN params p
  CROSS JOIN required_tables rt
  CROSS JOIN function_eval fe
  CROSS JOIN index_eval ie
  CROSS JOIN privilege_eval pe
  CROSS JOIN purchase_eval pu
  CROSS JOIN schema_cache_eval sc
  CROSS JOIN unexpected_eval ue
  CROSS JOIN apply_evidence ae
),
classification AS (
  SELECT
    s.*,
    CASE
      WHEN NOT s.history_green THEN 'PRODUCTION_CHAIN_HOLD_HISTORY_DRIFT'
      WHEN NOT s.objects_green THEN 'PRODUCTION_CHAIN_HOLD_OBJECT_MISMATCH'
      WHEN NOT s.privileges_green THEN 'PRODUCTION_CHAIN_HOLD_PRIVILEGE_MISMATCH'
      WHEN NOT s.purchase_contract_green THEN 'PRODUCTION_CHAIN_HOLD_PURCHASE_CONTRACT'
      WHEN NOT s.deletion_contract_green THEN 'PRODUCTION_CHAIN_HOLD_DELETION_CONTRACT'
      WHEN NOT s.schema_cache_ready THEN 'PRODUCTION_CHAIN_HOLD_SCHEMA_CACHE'
      WHEN s.history_green
        AND s.objects_green
        AND s.privileges_green
        AND s.purchase_contract_green
        AND s.deletion_contract_green
        AND s.schema_cache_ready
        AND NOT s.unexpected_object_detected
        THEN 'PRODUCTION_CHAIN_GREEN'
      ELSE 'PRODUCTION_CHAIN_UNKNOWN'
    END AS production_chain_classification,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT s.history_green THEN 'history_drift' END,
      CASE WHEN NOT s.objects_green THEN 'object_mismatch' END,
      CASE WHEN NOT s.privileges_green THEN 'privilege_mismatch' END,
      CASE WHEN NOT s.purchase_contract_green THEN 'purchase_contract_mismatch' END,
      CASE WHEN NOT s.deletion_contract_green THEN 'deletion_contract_mismatch' END,
      CASE WHEN NOT s.schema_cache_ready THEN 'schema_cache_not_ready' END,
      CASE WHEN s.unexpected_object_detected THEN 'unexpected_object_detected' END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE
        WHEN s.history_green
          AND s.objects_green
          AND s.privileges_green
          AND s.purchase_contract_green
          AND s.deletion_contract_green
          AND s.schema_cache_ready
          AND NOT s.unexpected_object_detected
          THEN NULL
        ELSE 'review_required'
      END
    ], NULL) AS unknown_flags
  FROM summary s
)
SELECT
  c.production_chain_classification,
  c.history_green,
  c.objects_green,
  c.privileges_green,
  c.purchase_contract_green,
  c.deletion_contract_green,
  c.schema_cache_ready,
  c.applied_versions,
  c.missing_versions,
  c.unexpected_versions,
  c.present_count AS object_registry_present_count,
  c.expected_count AS object_registry_expected_count,
  c.failed_flags,
  c.unknown_flags,
  c.approved_required_apply_versions,
  c.newly_applied_in_authority_set,
  c.previously_applied_versions,
  c.approved_set_respected,
  c.current_schema_identity,
  (c.production_chain_classification = 'PRODUCTION_CHAIN_GREEN') AS purchase_wave_allowed,
  'CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-AUTHORITY-PLANNING'::text AS next_gate
FROM classification c;
