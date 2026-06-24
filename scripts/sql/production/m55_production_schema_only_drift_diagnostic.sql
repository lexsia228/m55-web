-- =============================================================================
-- READ-ONLY — M55 Production SCHEMA_ONLY_DRIFT diagnostic
-- Path: scripts/sql/production/m55_production_schema_only_drift_diagnostic.sql
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- Forbidden: m55-preview / m55-soul-preview
--
-- Exactly one top-level SELECT/WITH. SELECT/WITH only. No DDL/DML/CALL/COPY/DO.
-- No application-row reads. No business-table row counts. No secrets/PII.
-- Catalog / information_schema / pg_catalog / to_regclass / to_regprocedure only.
--
-- Human confirms UI identity outside SQL; supply safe labels only:
--   human_supabase_org_confirmed = 'm55-soul'
--   human_supabase_project_confirmed = 'm55-soul-core'
--   human_supabase_environment_confirmed = 'PRODUCTION'
--
-- Execute in same Run as the three GUC SET statements (preflight convention).
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
    ]::text[] AS expected_versions
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
    si.current_database_name,
    si.current_user_name,
    hi.human_org,
    hi.human_project,
    hi.human_environment,
    COALESCE(hi.human_org = p.expected_org, false) AS ui_org_exact,
    COALESCE(hi.human_project = p.expected_project, false) AS ui_project_exact,
    COALESCE(hi.human_environment = p.expected_environment, false) AS ui_environment_exact,
    COALESCE(si.current_database_name = p.expected_database, false) AS database_exact,
    COALESCE(si.current_user_name = p.expected_role, false) AS role_exact,
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
    to_regclass('supabase_migrations.schema_migrations') AS canonical_history_relation_oid,
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS canonical_history_relation_exists,
    COALESCE(
      (
        SELECT c.relkind::text
        FROM pg_catalog.pg_class c
        WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
      ),
      NULL
    ) AS canonical_history_relation_relkind,
    COALESCE(
      (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = to_regclass('supabase_migrations.schema_migrations')
            AND a.attname = 'version'
            AND a.attnum > 0
            AND NOT a.attisdropped
        )
      ),
      false
    ) AS canonical_version_column_exists,
    COALESCE(
      (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = to_regclass('supabase_migrations.schema_migrations')
            AND a.attname = 'statements'
            AND a.attnum > 0
            AND NOT a.attisdropped
        )
      ),
      false
    ) AS canonical_statements_column_exists,
    COALESCE(
      (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute a
          WHERE a.attrelid = to_regclass('supabase_migrations.schema_migrations')
            AND a.attname = 'name'
            AND a.attnum > 0
            AND NOT a.attisdropped
        )
      ),
      false
    ) AS canonical_name_column_exists,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'schema', n.nspname,
            'relname', c.relname,
            'relkind', c.relkind::text
          )
          ORDER BY n.nspname, c.relname
        )
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'schema_migrations'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ),
      '[]'::jsonb
    ) AS schema_migrations_relations_any_schema,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'schema', n.nspname,
            'relname', c.relname,
            'relkind', c.relkind::text
          )
          ORDER BY n.nspname, c.relname
        )
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'supabase_migrations'
          AND c.relkind IN ('r', 'v', 'm')
          AND c.relname <> 'schema_migrations'
      ),
      '[]'::jsonb
    ) AS alternate_supabase_migrations_relations
),
history_discovery AS (
  SELECT
    hc.*,
    (
      hc.canonical_history_relation_exists
      AND hc.canonical_history_relation_relkind = 'r'
      AND hc.canonical_version_column_exists
      AND hc.canonical_statements_column_exists
      AND hc.canonical_name_column_exists
    ) AS canonical_history_relation_supported,
    CASE
      WHEN NOT hc.history_schema_exists
        AND NOT hc.canonical_history_relation_exists
        AND jsonb_array_length(hc.schema_migrations_relations_any_schema) = 0
        THEN 'CLEANLY_ABSENT'
      WHEN hc.history_schema_exists
        AND NOT hc.canonical_history_relation_exists
        THEN 'SCHEMA_PRESENT_RELATION_MISSING'
      WHEN hc.canonical_history_relation_exists
        AND (
          hc.canonical_history_relation_relkind IS DISTINCT FROM 'r'
          OR NOT hc.canonical_version_column_exists
          OR NOT hc.canonical_statements_column_exists
          OR NOT hc.canonical_name_column_exists
        )
        THEN 'RELATION_MALFORMED'
      WHEN hc.canonical_history_relation_exists
        AND hc.canonical_history_relation_relkind = 'r'
        AND hc.canonical_version_column_exists
        AND hc.canonical_statements_column_exists
        AND hc.canonical_name_column_exists
        THEN 'RELATION_SUPPORTED'
      WHEN jsonb_array_length(hc.schema_migrations_relations_any_schema) > 0
        THEN 'ALTERNATE_SCHEMA_MIGRATIONS_RELATION_PRESENT'
      ELSE 'UNKNOWN'
    END AS history_discovery_classification
  FROM history_catalog hc
),
baseline_relations AS (
  SELECT
    r.relation_name,
    to_regclass(format('public.%I', r.relation_name)) IS NOT NULL AS relation_exists,
    COALESCE(
      (
        SELECT c.relkind::text
        FROM pg_catalog.pg_class c
        WHERE c.oid = to_regclass(format('public.%I', r.relation_name))
      ),
      NULL
    ) AS relation_relkind
  FROM (
    SELECT unnest(p.baseline_relations) AS relation_name
    FROM params p
  ) r
),
baseline_summary AS (
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'relation', br.relation_name,
            'exists', br.relation_exists,
            'relkind', br.relation_relkind
          )
          ORDER BY br.relation_name
        )
        FROM baseline_relations br
      ),
      '[]'::jsonb
    ) AS baseline_relations_detail,
    COALESCE(
      (
        SELECT array_agg(br.relation_name ORDER BY br.relation_name)
        FROM baseline_relations br
        WHERE NOT br.relation_exists
      ),
      ARRAY[]::text[]
    ) AS baseline_missing,
    COALESCE(
      (
        SELECT array_agg(br.relation_name ORDER BY br.relation_name)
        FROM baseline_relations br
        WHERE br.relation_exists
          AND br.relation_relkind IS DISTINCT FROM 'r'
      ),
      ARRAY[]::text[]
    ) AS baseline_malformed,
    COALESCE(
      (
        SELECT bool_and(br.relation_exists AND br.relation_relkind = 'r')
        FROM baseline_relations br
      ),
      false
    ) AS baseline_complete
  FROM baseline_relations br
  LIMIT 1
),
entitlements_index_catalog AS (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'index_name', ic.relname,
          'is_unique', i.indisunique,
          'is_primary', i.indisprimary,
          'column_names', (
            SELECT COALESCE(array_agg(a.attname::text ORDER BY k.ord), ARRAY[]::text[])
            FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_catalog.pg_attribute a
              ON a.attrelid = rc.oid
             AND a.attnum = k.attnum
             AND a.attnum > 0
             AND NOT a.attisdropped
          )
        )
        ORDER BY ic.relname
      )
      FROM pg_catalog.pg_class rc
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      JOIN pg_catalog.pg_index i ON i.indrelid = rc.oid
      JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
    ),
    '[]'::jsonb
  ) AS entitlements_unique_indexes_detail,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'constraint_name', con.conname,
          'constraint_type', con.contype::text,
          'column_names', (
            SELECT COALESCE(array_agg(a.attname::text ORDER BY u.ord), ARRAY[]::text[])
            FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord)
            JOIN pg_catalog.pg_attribute a
              ON a.attrelid = con.conrelid
             AND a.attnum = u.attnum
             AND a.attnum > 0
             AND NOT a.attisdropped
          )
        )
        ORDER BY con.conname
      )
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class rc ON rc.oid = con.conrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND con.contype IN ('u', 'p')
    ),
    '[]'::jsonb
  ) AS entitlements_unique_constraints_detail
),
dtr_visible_index_catalog AS (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(ic.relname ORDER BY ic.relname)
      FROM pg_catalog.pg_class rc
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      JOIN pg_catalog.pg_index i ON i.indrelid = rc.oid
      JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
      WHERE rn.nspname = 'public'
        AND rc.relname = 'dtr_report_snapshots'
        AND ic.relname LIKE '%visible%'
    ),
    '[]'::jsonb
  ) AS dtr_visible_related_index_names
),
deletion_rpc_catalog AS (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'identity_args', pg_catalog.pg_get_function_identity_arguments(p.oid),
          'arg_count', p.pronargs
        )
        ORDER BY pg_catalog.pg_get_function_identity_arguments(p.oid)
      )
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
    ),
    '[]'::jsonb
  ) AS deletion_rpc_signatures
),
chain_probes AS (
  SELECT
    to_regclass('public.clerk_webhook_events') IS NOT NULL AS clerk_webhook_events,
    to_regprocedure('public.m55_account_deletion_process_v1(text,text,text)') IS NOT NULL AS deletion_rpc_3arg,
    to_regprocedure('public.m55_account_deletion_process_v1(text,text,text,text)') IS NOT NULL AS deletion_rpc_4arg,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_id_key_unique'
    ) AS entitlements_index_preflight_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_id_product_id_key'
    ) AS entitlements_index_canonical_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class rc ON rc.oid = con.conrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND con.conname = 'entitlements_user_id_product_id_key'
        AND con.contype = 'u'
    ) AS entitlements_constraint_canonical_name,
    jsonb_array_length(dvic.dtr_visible_related_index_names) > 0 AS dtr_visible_index,
    dvic.dtr_visible_related_index_names,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'failed_fulfillments'
        AND a.attname = 'user_ref_hash'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS failed_fulfillments_user_ref_hash,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_product_uq'
    ) AS entitlements_dup_index_user_product_uq,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND ic.relname = 'uq_entitlements_user_product'
    ) AS entitlements_dup_index_uq_entitlements_user_product,
    drc.deletion_rpc_signatures,
    eic.entitlements_unique_indexes_detail,
    eic.entitlements_unique_constraints_detail
  FROM dtr_visible_index_catalog dvic
  CROSS JOIN deletion_rpc_catalog drc
  CROSS JOIN entitlements_index_catalog eic
),
chain_counts AS (
  SELECT
    cp.*,
    (
      (CASE WHEN cp.clerk_webhook_events THEN 1 ELSE 0 END)
      + (CASE WHEN cp.deletion_rpc_3arg THEN 1 ELSE 0 END)
      + (CASE WHEN cp.entitlements_index_preflight_name THEN 1 ELSE 0 END)
      + (CASE WHEN cp.dtr_visible_index THEN 1 ELSE 0 END)
      + (CASE WHEN cp.failed_fulfillments_user_ref_hash THEN 1 ELSE 0 END)
    )::integer AS chain_object_present_count_preflight,
    (
      (CASE WHEN cp.clerk_webhook_events THEN 1 ELSE 0 END)
      + (CASE WHEN cp.deletion_rpc_4arg THEN 1 ELSE 0 END)
      + (CASE WHEN cp.entitlements_index_canonical_name OR cp.entitlements_constraint_canonical_name THEN 1 ELSE 0 END)
      + (CASE WHEN cp.dtr_visible_index THEN 1 ELSE 0 END)
      + (CASE WHEN cp.failed_fulfillments_user_ref_hash THEN 1 ELSE 0 END)
    )::integer AS chain_object_present_count_alternate
  FROM chain_probes cp
),
chain_detail AS (
  SELECT
    cc.*,
    jsonb_build_object(
      'clerk_webhook_events', cc.clerk_webhook_events,
      'deletion_rpc_3arg', cc.deletion_rpc_3arg,
      'entitlements_index_preflight_name', cc.entitlements_index_preflight_name,
      'dtr_visible_index', cc.dtr_visible_index,
      'failed_fulfillments_user_ref_hash', cc.failed_fulfillments_user_ref_hash
    ) AS chain_objects_preflight_detail,
    jsonb_build_object(
      'clerk_webhook_events', cc.clerk_webhook_events,
      'deletion_rpc_3arg', cc.deletion_rpc_3arg,
      'deletion_rpc_4arg', cc.deletion_rpc_4arg,
      'deletion_rpc_signatures', cc.deletion_rpc_signatures,
      'entitlements_index_preflight_name', cc.entitlements_index_preflight_name,
      'entitlements_index_canonical_name', cc.entitlements_index_canonical_name,
      'entitlements_constraint_canonical_name', cc.entitlements_constraint_canonical_name,
      'entitlements_unique_indexes_detail', cc.entitlements_unique_indexes_detail,
      'entitlements_unique_constraints_detail', cc.entitlements_unique_constraints_detail,
      'dtr_visible_index', cc.dtr_visible_index,
      'dtr_visible_related_index_names', cc.dtr_visible_related_index_names,
      'failed_fulfillments_user_ref_hash', cc.failed_fulfillments_user_ref_hash,
      'entitlements_dup_index_user_product_uq', cc.entitlements_dup_index_user_product_uq,
      'entitlements_dup_index_uq_entitlements_user_product', cc.entitlements_dup_index_uq_entitlements_user_product
    ) AS chain_objects_alternate_detail
  FROM chain_counts cc
),
chain_detail_resolved AS (
  SELECT
    cd.*,
    (
      (cd.deletion_rpc_4arg AND NOT cd.deletion_rpc_3arg)
      OR (
        (cd.entitlements_index_canonical_name OR cd.entitlements_constraint_canonical_name)
        AND NOT cd.entitlements_index_preflight_name
      )
      OR cd.chain_object_present_count_alternate <> cd.chain_object_present_count_preflight
    ) AS probe_mismatch_suspected
  FROM chain_detail cd
),
version_fingerprint_raw AS (
  SELECT
    v.version,
    v.ordinal,
    v.expected_object,
    v.preflight_probe_status,
    v.alternate_probe_status,
    CASE
      WHEN v.preflight_probe_status AND v.alternate_probe_status THEN 'OBJECT_PRESENT'
      WHEN NOT v.preflight_probe_status AND NOT v.alternate_probe_status THEN 'OBJECT_MISSING'
      WHEN NOT v.preflight_probe_status AND v.alternate_probe_status THEN 'PROBE_MISMATCH_SUSPECTED'
      WHEN v.preflight_probe_status AND NOT v.alternate_probe_status THEN 'PARTIAL'
      ELSE 'UNKNOWN'
    END AS fingerprint_classification
  FROM chain_detail_resolved cdr
  CROSS JOIN baseline_summary bs
  CROSS JOIN LATERAL (
    VALUES
      (
        1,
        '20260614000000',
        'baseline_15_relations_complete',
        bs.baseline_complete,
        bs.baseline_complete
      ),
      (
        2,
        '20260615000001',
        'failed_fulfillments.user_ref_hash',
        cdr.failed_fulfillments_user_ref_hash,
        cdr.failed_fulfillments_user_ref_hash
      ),
      (
        3,
        '20260615000002',
        'public.clerk_webhook_events',
        cdr.clerk_webhook_events,
        cdr.clerk_webhook_events
      ),
      (
        4,
        '20260615000003',
        'public.m55_account_deletion_process_v1',
        cdr.deletion_rpc_3arg,
        cdr.deletion_rpc_4arg
      ),
      (
        5,
        '20260615000004',
        'entitlements_security_and_canonical_unique',
        cdr.entitlements_index_preflight_name,
        (cdr.entitlements_index_canonical_name OR cdr.entitlements_constraint_canonical_name)
      ),
      (
        6,
        '20260615000005',
        'dtr_report_snapshots_visible_index',
        cdr.dtr_visible_index,
        cdr.dtr_visible_index
      ),
      (
        7,
        '20260615000006',
        'entitlements_unique_index_cleanup_final_state',
        (
          cdr.entitlements_index_preflight_name
          AND cdr.dtr_visible_index
          AND NOT cdr.entitlements_dup_index_user_product_uq
          AND NOT cdr.entitlements_dup_index_uq_entitlements_user_product
        ),
        (
          (cdr.entitlements_index_canonical_name OR cdr.entitlements_constraint_canonical_name)
          AND cdr.dtr_visible_index
          AND NOT cdr.entitlements_dup_index_user_product_uq
          AND NOT cdr.entitlements_dup_index_uq_entitlements_user_product
        )
      )
  ) AS v(ordinal, version, expected_object, preflight_probe_status, alternate_probe_status)
),
version_fingerprint AS (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'ordinal', 'P' || vfr.ordinal::text,
          'version', vfr.version,
          'expected_object', vfr.expected_object,
          'preflight_probe_status', vfr.preflight_probe_status,
          'alternate_probe_status', vfr.alternate_probe_status,
          'fingerprint_classification', vfr.fingerprint_classification
        )
        ORDER BY vfr.ordinal
      )
      FROM version_fingerprint_raw vfr
    ),
    '[]'::jsonb
  ) AS per_version_fingerprint
  FROM version_fingerprint_raw vfr
  LIMIT 1
),
reconciliation_inputs AS (
  SELECT
    ui.ui_identity_exact,
    hd.history_discovery_classification,
    hd.canonical_history_relation_exists,
    hd.canonical_history_relation_supported,
    bs.baseline_complete,
    cdr.chain_object_present_count_preflight,
    cdr.chain_object_present_count_alternate,
    cdr.probe_mismatch_suspected,
    vf.per_version_fingerprint
  FROM ui_identity ui
  CROSS JOIN history_discovery hd
  CROSS JOIN baseline_summary bs
  CROSS JOIN chain_detail_resolved cdr
  CROSS JOIN version_fingerprint vf
),
reconciliation AS (
  SELECT
    ri.*,
    CASE
      WHEN NOT ri.ui_identity_exact THEN 'HOLD_IDENTITY_MISMATCH'
      WHEN ri.probe_mismatch_suspected THEN 'PROBE_MISMATCH_SUSPECTED'
      WHEN ri.history_discovery_classification = 'SCHEMA_PRESENT_RELATION_MISSING' THEN 'HISTORY_SCHEMA_PRESENT_RELATION_MISSING'
      WHEN ri.history_discovery_classification = 'RELATION_MALFORMED' THEN 'HISTORY_RELATION_MALFORMED'
      WHEN ri.history_discovery_classification IN ('CLEANLY_ABSENT', 'UNKNOWN')
        AND ri.baseline_complete
        AND ri.chain_object_present_count_alternate > 0
        AND ri.chain_object_present_count_alternate < 5
        THEN 'CHAIN_PARTIAL_KNOWN'
      WHEN ri.history_discovery_classification IN ('CLEANLY_ABSENT', 'UNKNOWN')
        AND ri.baseline_complete
        AND NOT ri.canonical_history_relation_exists
        AND ri.chain_object_present_count_alternate > 0
        THEN 'HISTORY_CLEANLY_ABSENT_WITH_BASELINE_PRESENT'
      WHEN ri.history_discovery_classification = 'ALTERNATE_SCHEMA_MIGRATIONS_RELATION_PRESENT'
        AND NOT ri.canonical_history_relation_exists
        AND ri.chain_object_present_count_alternate > 0
        THEN 'HISTORY_AND_OBJECT_CONFLICT'
      ELSE 'DIAGNOSTIC_UNKNOWN'
    END AS reconciliation_class,
    CASE
      WHEN NOT ri.ui_identity_exact THEN 'HOLD_IDENTITY_MISMATCH'
      WHEN ri.probe_mismatch_suspected THEN 'PROBE_MISMATCH_SUSPECTED'
      WHEN ri.history_discovery_classification IN ('CLEANLY_ABSENT', 'SCHEMA_PRESENT_RELATION_MISSING', 'RELATION_MALFORMED', 'UNKNOWN')
        AND ri.baseline_complete
        THEN 'SCHEMA_ONLY_DRIFT_CONFIRMED'
      ELSE 'DIAGNOSTIC_UNKNOWN'
    END AS diagnostic_classification
  FROM reconciliation_inputs ri
),
final_flags AS (
  SELECT
    r.*,
    jsonb_build_object(
      'history_schema_exists', hd.history_schema_exists,
      'canonical_history_relation_exists', hd.canonical_history_relation_exists,
      'canonical_version_column_exists', hd.canonical_version_column_exists,
      'canonical_history_relation_supported', hd.canonical_history_relation_supported,
      'history_discovery_classification', hd.history_discovery_classification,
      'schema_migrations_relations_any_schema', hd.schema_migrations_relations_any_schema,
      'alternate_supabase_migrations_relations', hd.alternate_supabase_migrations_relations
    ) AS history_discovery,
    (
      NOT r.ui_identity_exact
      OR r.reconciliation_class IN (
        'HOLD_IDENTITY_MISMATCH',
        'HISTORY_RELATION_MALFORMED',
        'HISTORY_AND_OBJECT_CONFLICT',
        'DIAGNOSTIC_UNKNOWN'
      )
      OR r.probe_mismatch_suspected
      OR (
        NOT hd.canonical_history_relation_supported
        AND r.chain_object_present_count_alternate > 0
      )
    ) AS stop_required,
    (
      r.ui_identity_exact
      AND hd.history_discovery_classification IN ('CLEANLY_ABSENT', 'SCHEMA_PRESENT_RELATION_MISSING')
      AND r.baseline_complete
      AND NOT r.probe_mismatch_suspected
    ) AS safe_to_plan_history_recovery,
    false AS safe_to_plan_apply,
    CASE
      WHEN NOT r.ui_identity_exact THEN
        'CATEGORY-1-M55-PRODUCTION-SCHEMA-ONLY-DRIFT-DIAGNOSTIC-IDENTITY-HOLD-REV1'
      WHEN r.probe_mismatch_suspected THEN
        'CATEGORY-1-M55-PRODUCTION-SCHEMA-ONLY-DRIFT-DIAGNOSTIC-RESULT-REVIEW-REV1'
      WHEN r.reconciliation_class IN (
        'HISTORY_CLEANLY_ABSENT_WITH_BASELINE_PRESENT',
        'CHAIN_PARTIAL_KNOWN',
        'HISTORY_SCHEMA_PRESENT_RELATION_MISSING'
      ) THEN
        'CATEGORY-1-M55-PRODUCTION-MIGRATION-HISTORY-RECOVERY-PLANNING-REV1'
      ELSE
        'CATEGORY-1-M55-PRODUCTION-SCHEMA-ONLY-DRIFT-DIAGNOSTIC-RESULT-REVIEW-REV1'
    END AS recommended_next_gate
  FROM reconciliation r
  CROSS JOIN history_discovery hd
  CROSS JOIN baseline_summary bs
  CROSS JOIN chain_detail_resolved cdr
)
SELECT
  ff.diagnostic_classification,
  ff.ui_identity_exact,
  jsonb_build_object(
    'current_database', ui.current_database_name,
    'current_user', ui.current_user_name,
    'human_org', ui.human_org,
    'human_project', ui.human_project,
    'human_environment', ui.human_environment,
    'ui_org_exact', ui.ui_org_exact,
    'ui_project_exact', ui.ui_project_exact,
    'ui_environment_exact', ui.ui_environment_exact,
    'database_exact', ui.database_exact,
    'role_exact', ui.role_exact
  ) AS session_identity_detail,
  ff.history_discovery,
  bs.baseline_relations_detail,
  bs.baseline_missing,
  bs.baseline_malformed,
  bs.baseline_complete,
  cdr.chain_objects_preflight_detail,
  cdr.chain_objects_alternate_detail,
  cdr.chain_object_present_count_preflight,
  cdr.chain_object_present_count_alternate,
  ff.per_version_fingerprint,
  ff.reconciliation_class,
  ff.probe_mismatch_suspected,
  ff.stop_required,
  ff.safe_to_plan_history_recovery,
  ff.safe_to_plan_apply,
  ff.recommended_next_gate
FROM final_flags ff
CROSS JOIN ui_identity ui
CROSS JOIN baseline_summary bs
CROSS JOIN chain_detail_resolved cdr;
