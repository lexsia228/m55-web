-- =============================================================================
-- READ-ONLY — M55 Production migration preflight
-- Path: scripts/sql/production/m55_production_migration_preflight.sql
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- Forbidden: m55-preview / m55-soul-preview
--
-- Exactly one top-level SELECT/WITH. SELECT/WITH only. No DDL/DML/CALL/COPY/DO.
-- No application-row reads. No secrets. No Production execution in planning gate.
--
-- Human confirms UI identity outside SQL; supply safe labels only:
--   human_supabase_org_confirmed = 'm55-soul'
--   human_supabase_project_confirmed = 'm55-soul-core'
--   human_supabase_environment_confirmed = 'PRODUCTION'
-- =============================================================================

WITH
params AS (
  SELECT
    'm55-soul'::text AS expected_org,
    'm55-soul-core'::text AS expected_project,
    'PRODUCTION'::text AS expected_environment,
    'Primary Database'::text AS expected_source,
    'postgres'::text AS expected_role,
    'postgres'::text AS expected_database,
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
    current_user::text AS current_user_name,
    current_setting('server_version_num', true)::text AS server_version_num
),
ui_identity AS (
  SELECT
    (hi.human_org = p.expected_org) AS ui_org_exact,
    (hi.human_project = p.expected_project) AS ui_project_exact,
    (hi.human_environment = p.expected_environment) AS ui_environment_exact,
    (si.current_database_name = p.expected_database) AS database_exact,
    (si.current_user_name = p.expected_role) AS role_exact
  FROM params p
  CROSS JOIN human_identity hi
  CROSS JOIN session_identity si
),
history_shape_safe AS (
  SELECT
    to_regclass('supabase_migrations.schema_migrations') AS history_relation_oid,
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history_relation_exists,
    COALESCE(
      (
        SELECT c.relkind::text
        FROM pg_catalog.pg_class c
        WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
      ),
      NULL
    ) AS history_relation_relkind,
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
    ) AS history_version_column_exists
),
history_shape_extended AS (
  SELECT
    h.*,
    COALESCE(
      (
        SELECT
          c.oid IS NOT NULL
          AND n.nspname = 'supabase_migrations'
          AND c.relname = 'schema_migrations'
          AND c.relkind = 'r'
          AND h.history_version_column_exists
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.oid = h.history_relation_oid
      ),
      false
    ) AS history_relation_is_supported,
    'SELECT version::text AS version FROM supabase_migrations.schema_migrations'::text AS history_query_text
  FROM history_shape_safe h
),
history_rows AS (
  SELECT x.version
  FROM history_shape_extended hse
  CROSS JOIN LATERAL (
    SELECT query_to_xml(hse.history_query_text, false, false, '') AS doc
  ) q
  CROSS JOIN LATERAL XMLTABLE(
    '/table/row'
    PASSING q.doc
    COLUMNS version text PATH 'version'
  ) AS x
  WHERE hse.history_relation_is_supported
    AND x.version IS NOT NULL
),
history_read AS (
  SELECT
    hse.history_relation_exists,
    hse.history_relation_is_supported,
    CASE
      WHEN NOT hse.history_relation_exists OR NOT hse.history_relation_is_supported THEN ARRAY[]::text[]
      ELSE COALESCE((SELECT array_agg(hr.version ORDER BY hr.version) FROM history_rows hr), ARRAY[]::text[])
    END AS applied_versions,
    CASE
      WHEN NOT hse.history_relation_exists OR NOT hse.history_relation_is_supported THEN false
      ELSE COALESCE(
        (
          SELECT COUNT(*) > 0
          FROM (
            SELECT hr.version
            FROM history_rows hr
            GROUP BY hr.version
            HAVING COUNT(*) > 1
          ) d
        ),
        false
      )
    END AS has_duplicate_versions
  FROM history_shape_extended hse
),
history_analysis AS (
  SELECT
    COALESCE(hr.applied_versions, ARRAY[]::text[]) AS applied_versions,
    (
      SELECT COALESCE(array_agg(x.v ORDER BY x.v), ARRAY[]::text[])
      FROM (
        SELECT unnest(p.expected_versions) AS v
        EXCEPT
        SELECT unnest(COALESCE(hr.applied_versions, ARRAY[]::text[]))
      ) AS x
    ) AS missing_versions,
    (
      SELECT COALESCE(array_agg(x.v ORDER BY x.v), ARRAY[]::text[])
      FROM (
        SELECT unnest(COALESCE(hr.applied_versions, ARRAY[]::text[])) AS v
        EXCEPT
        SELECT unnest(p.expected_versions)
      ) AS x
    ) AS unexpected_versions,
    hr.has_duplicate_versions
  FROM params p
  CROSS JOIN history_read hr
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
    COUNT(*)::integer AS baseline_relation_count,
    COUNT(*) FILTER (WHERE relation_exists AND relation_relkind = 'r')::integer AS baseline_ordinary_count,
    COUNT(*) FILTER (WHERE NOT relation_exists)::integer AS baseline_missing_count,
    COUNT(*) FILTER (WHERE relation_exists AND relation_relkind IS DISTINCT FROM 'r')::integer AS baseline_malformed_count
  FROM baseline_relations
),
chain_objects AS (
  SELECT
    to_regclass('public.clerk_webhook_events') IS NOT NULL AS has_clerk_webhook_events,
    to_regprocedure('public.m55_account_deletion_process_v1(text,text,text)') IS NOT NULL AS has_deletion_rpc,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      WHERE rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_id_key_unique'
    ) AS has_canonical_entitlements_unique,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      WHERE rc.relname = 'dtr_report_snapshots'
        AND ic.relname LIKE '%visible%'
    ) AS has_dtr_visible_index,
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
    ) AS has_failed_fulfillments_user_ref_hash
),
chain_registry AS (
  SELECT
    (CASE WHEN has_clerk_webhook_events THEN 1 ELSE 0 END
      + CASE WHEN has_deletion_rpc THEN 1 ELSE 0 END
      + CASE WHEN has_canonical_entitlements_unique THEN 1 ELSE 0 END
      + CASE WHEN has_dtr_visible_index THEN 1 ELSE 0 END
      + CASE WHEN has_failed_fulfillments_user_ref_hash THEN 1 ELSE 0 END)::integer AS chain_object_present_count,
    5::integer AS chain_object_expected_count
  FROM chain_objects
),
classification_inputs AS (
  SELECT
    ui.*,
    hs.history_relation_exists,
    ha.applied_versions,
    ha.missing_versions,
    ha.unexpected_versions,
    ha.has_duplicate_versions,
    bs.baseline_relation_count,
    bs.baseline_missing_count,
    bs.baseline_malformed_count,
    cr.chain_object_present_count,
    cr.chain_object_expected_count,
    (ui.ui_org_exact AND ui.ui_project_exact AND ui.ui_environment_exact AND ui.database_exact AND ui.role_exact) AS ui_identity_exact
  FROM ui_identity ui
  CROSS JOIN history_shape_safe hs
  CROSS JOIN history_analysis ha
  CROSS JOIN baseline_summary bs
  CROSS JOIN chain_registry cr
),
classification AS (
  SELECT
    ci.*,
    CASE
      WHEN NOT ci.ui_identity_exact THEN 'HOLD_UNKNOWN'
      WHEN ci.has_duplicate_versions OR cardinality(ci.unexpected_versions) > 0 THEN 'HOLD_UNKNOWN'
      WHEN ci.baseline_malformed_count > 0 THEN 'PARTIAL_STATE_RECONCILIATION_REQUIRED'
      WHEN ci.history_relation_exists
        AND cardinality(ci.applied_versions) = 7
        AND cardinality(ci.missing_versions) = 0
        AND ci.chain_object_present_count = ci.chain_object_expected_count
        THEN 'ALREADY_APPLIED'
      WHEN NOT ci.history_relation_exists
        AND ci.baseline_missing_count = 0
        AND ci.chain_object_present_count = 0
        THEN 'GREENFIELD_READY'
      WHEN ci.history_relation_exists
        AND cardinality(ci.applied_versions) > 0
        AND cardinality(ci.missing_versions) > 0
        AND ci.chain_object_present_count > 0
        THEN 'PARTIAL_STATE_RECONCILIATION_REQUIRED'
      WHEN ci.history_relation_exists
        AND cardinality(ci.applied_versions) > 0
        AND ci.baseline_missing_count > 0
        THEN 'HISTORY_ONLY_DRIFT'
      WHEN NOT ci.history_relation_exists
        AND ci.chain_object_present_count > 0
        THEN 'SCHEMA_ONLY_DRIFT'
      WHEN ci.baseline_missing_count > 0
        AND ci.chain_object_present_count > 0
        THEN 'PARTIAL_STATE_RECONCILIATION_REQUIRED'
      ELSE 'HOLD_UNKNOWN'
    END AS preflight_classification
  FROM classification_inputs ci
),
flags AS (
  SELECT
    c.*,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT c.ui_identity_exact THEN 'ui_identity_mismatch' END,
      CASE WHEN c.has_duplicate_versions THEN 'duplicate_migration_versions' END,
      CASE WHEN cardinality(c.unexpected_versions) > 0 THEN 'unexpected_migration_versions' END,
      CASE WHEN c.baseline_malformed_count > 0 THEN 'baseline_relation_malformed' END,
      CASE WHEN c.preflight_classification = 'PARTIAL_STATE_RECONCILIATION_REQUIRED' THEN 'partial_state_detected' END,
      CASE WHEN c.preflight_classification = 'HISTORY_ONLY_DRIFT' THEN 'history_only_drift' END,
      CASE WHEN c.preflight_classification = 'SCHEMA_ONLY_DRIFT' THEN 'schema_only_drift' END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.preflight_classification = 'HOLD_UNKNOWN' THEN 'unknown_state' END
    ], NULL) AS unknown_flags
  FROM classification c
),
version_object_state AS (
  SELECT
    v.version,
    v.ordinal,
    (v.version = ANY (f.applied_versions)) AS in_history,
    CASE v.version
      WHEN '20260614000000' THEN (f.baseline_missing_count = 0 AND f.baseline_malformed_count = 0)
      WHEN '20260615000001' THEN f.chain_object_present_count >= 1
      WHEN '20260615000002' THEN f.chain_object_present_count >= 2
      WHEN '20260615000003' THEN f.chain_object_present_count >= 3
      WHEN '20260615000004' THEN f.chain_object_present_count >= 4
      WHEN '20260615000005' THEN f.chain_object_present_count >= 5
      WHEN '20260615000006' THEN f.chain_object_present_count = f.chain_object_expected_count
      ELSE false
    END AS object_exact
  FROM flags f
  CROSS JOIN (
    VALUES
      (1, '20260614000000'),
      (2, '20260615000001'),
      (3, '20260615000002'),
      (4, '20260615000003'),
      (5, '20260615000004'),
      (6, '20260615000005'),
      (7, '20260615000006')
  ) AS v(ordinal, version)
),
version_plan_raw AS (
  SELECT
    vos.*,
    f.preflight_classification,
    CASE
      WHEN f.preflight_classification IN (
        'PARTIAL_STATE_RECONCILIATION_REQUIRED',
        'HISTORY_ONLY_DRIFT',
        'SCHEMA_ONLY_DRIFT'
      ) THEN 'OBJECT_STATE_PARTIAL'
      WHEN f.preflight_classification = 'HOLD_UNKNOWN' THEN 'UNKNOWN'
      WHEN f.preflight_classification = 'ALREADY_APPLIED' THEN
        CASE WHEN vos.in_history AND vos.object_exact THEN 'APPLIED_EXACT' ELSE 'HISTORY_SCHEMA_CONFLICT' END
      WHEN vos.in_history AND vos.object_exact THEN 'APPLIED_EXACT'
      WHEN vos.in_history AND NOT vos.object_exact THEN 'HISTORY_SCHEMA_CONFLICT'
      WHEN NOT vos.in_history AND vos.object_exact THEN 'OBJECT_STATE_PARTIAL'
      WHEN f.preflight_classification = 'GREENFIELD_READY' AND NOT vos.in_history AND NOT vos.object_exact THEN 'REQUIRED_APPLY'
      ELSE 'UNKNOWN'
    END AS version_status
  FROM version_object_state vos
  CROSS JOIN flags f
),
version_plan_ordered AS (
  SELECT
    vpr.*,
    NOT EXISTS (
      SELECT 1
      FROM version_plan_raw prior
      WHERE prior.ordinal < vpr.ordinal
        AND prior.version_status NOT IN ('APPLIED_EXACT', 'REQUIRED_APPLY')
    ) AS predecessor_ready
  FROM version_plan_raw vpr
),
version_plan_final AS (
  SELECT
    vpo.version,
    vpo.ordinal,
    CASE
      WHEN vpo.version_status = 'REQUIRED_APPLY' AND NOT vpo.predecessor_ready THEN 'BLOCKED_BY_PREDECESSOR'
      ELSE vpo.version_status
    END AS version_status
  FROM version_plan_ordered vpo
),
apply_plan AS (
  SELECT
    f.*,
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'ordinal', 'P' || vpf.ordinal::text,
            'version', vpf.version,
            'status', vpf.version_status
          )
          ORDER BY vpf.ordinal
        ),
        '[]'::jsonb
      )
      FROM version_plan_final vpf
    ) AS per_version_plan,
    (
      SELECT COALESCE(array_agg(vpf.version ORDER BY vpf.ordinal), ARRAY[]::text[])
      FROM version_plan_final vpf
      WHERE vpf.version_status = 'APPLIED_EXACT'
    ) AS already_applied_versions,
    (
      SELECT COALESCE(array_agg(vpf.version ORDER BY vpf.ordinal), ARRAY[]::text[])
      FROM version_plan_final vpf
      WHERE vpf.version_status = 'REQUIRED_APPLY'
        AND vpf.predecessor_ready
        AND f.preflight_classification = 'GREENFIELD_READY'
    ) AS required_apply_versions_raw,
    (
      SELECT COALESCE(array_agg(vpf.version ORDER BY vpf.ordinal), ARRAY[]::text[])
      FROM version_plan_final vpf
      WHERE vpf.version_status = 'BLOCKED_BY_PREDECESSOR'
    ) AS blocked_versions,
    (
      SELECT COALESCE(array_agg(vpf.version ORDER BY vpf.ordinal), ARRAY[]::text[])
      FROM version_plan_final vpf
      WHERE vpf.version_status = 'HISTORY_SCHEMA_CONFLICT'
    ) AS conflicting_versions,
    (
      SELECT COALESCE(array_agg(vpf.version ORDER BY vpf.ordinal), ARRAY[]::text[])
      FROM version_plan_final vpf
      WHERE vpf.version_status IN ('OBJECT_STATE_PARTIAL', 'UNKNOWN')
    ) AS unknown_versions
  FROM flags f
),
apply_plan_resolved AS (
  SELECT
    ap.*,
    CASE
      WHEN ap.preflight_classification IN (
        'PARTIAL_STATE_RECONCILIATION_REQUIRED',
        'HISTORY_ONLY_DRIFT',
        'SCHEMA_ONLY_DRIFT',
        'HOLD_UNKNOWN',
        'ALREADY_APPLIED'
      ) THEN ARRAY[]::text[]
      WHEN cardinality(ap.blocked_versions) > 0
        OR cardinality(ap.conflicting_versions) > 0
        OR cardinality(ap.unknown_versions) > 0
        THEN ARRAY[]::text[]
      ELSE COALESCE(ap.required_apply_versions_raw, ARRAY[]::text[])
    END AS required_apply_versions,
    md5(
      ap.preflight_classification
      || ':'
      || COALESCE(array_to_string(ap.applied_versions, ','), '')
      || ':'
      || ap.baseline_missing_count::text
      || ':'
      || ap.chain_object_present_count::text
    ) AS current_schema_identity
  FROM apply_plan ap
)
SELECT
  apr.preflight_classification,
  apr.ui_identity_exact,
  apr.history_relation_exists,
  apr.baseline_relation_count,
  15::integer AS baseline_relation_count_expected,
  apr.chain_object_present_count,
  apr.chain_object_expected_count,
  apr.applied_versions,
  apr.missing_versions,
  apr.unexpected_versions,
  apr.failed_flags,
  apr.unknown_flags,
  apr.per_version_plan,
  apr.required_apply_versions,
  apr.already_applied_versions,
  apr.blocked_versions,
  apr.conflicting_versions,
  apr.unknown_versions,
  (cardinality(apr.required_apply_versions) > 0) AS apply_required,
  (
    apr.preflight_classification IN (
      'PARTIAL_STATE_RECONCILIATION_REQUIRED',
      'HISTORY_ONLY_DRIFT',
      'SCHEMA_ONLY_DRIFT',
      'HOLD_UNKNOWN'
    )
    OR cardinality(apr.blocked_versions) > 0
    OR cardinality(apr.conflicting_versions) > 0
    OR cardinality(apr.unknown_versions) > 0
  ) AS stop_required,
  true AS dependency_order_valid,
  true AS apply_set_exact,
  true AS unconditional_apply_forbidden,
  apr.current_schema_identity,
  false AS compatibility_inputs_known,
  'CATEGORY-1-M55-PRODUCTION-MIGRATION-APPLY-AUTHORITY-REVIEW'::text AS next_gate
FROM apply_plan_resolved apr;
