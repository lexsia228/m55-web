-- M55 Preview DB Pre-Apply Read-Only Preflight PATCH-2
-- Human target: Supabase organization m55-preview / project m55-soul-preview ONLY
-- Forbidden: m55-soul-core
-- Exactly one top-level SELECT/WITH. SELECT/WITH only. No DDL/DML. No application-row reads.

WITH
params AS (
  SELECT
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
    ]::text[] AS baseline_relations,
    'SELECT version::text AS version FROM supabase_migrations.schema_migrations'::text AS history_query_text
),
history_shape_safe AS (
  SELECT
    to_regclass('supabase_migrations.schema_migrations') AS history_relation_oid,
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history_relation_exists,
    (
      SELECT c.relkind::text
      FROM pg_catalog.pg_class c
      WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
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
    ) AS history_version_column_exists,
    (
      SELECT format_type(a.atttypid, a.atttypmod)
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('supabase_migrations.schema_migrations')
        AND a.attname = 'version'
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS history_version_column_type,
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
    ) AS history_relation_is_supported
),
history_rows AS (
  SELECT x.version
  FROM history_shape_safe hss
  CROSS JOIN params p
  CROSS JOIN LATERAL (
    SELECT query_to_xml(p.history_query_text, false, false, '') AS doc
  ) q
  CROSS JOIN LATERAL XMLTABLE(
    '/table/row'
    PASSING q.doc
    COLUMNS version text PATH 'version'
  ) AS x
  WHERE hss.history_relation_is_supported
    AND x.version IS NOT NULL
),
history_read AS (
  SELECT
    hss.history_relation_oid,
    hss.history_relation_exists,
    hss.history_relation_relkind,
    hss.history_version_column_exists,
    hss.history_version_column_type,
    hss.history_relation_is_supported,
    hss.history_relation_is_supported AS history_read_supported,
    hss.history_relation_is_supported AS history_read_attempted,
    CASE
      WHEN NOT hss.history_relation_exists THEN true
      WHEN NOT hss.history_relation_is_supported THEN false
      ELSE true
    END AS history_read_succeeded,
    CASE
      WHEN NOT hss.history_relation_exists THEN 0::bigint
      WHEN NOT hss.history_relation_is_supported THEN 0::bigint
      ELSE (SELECT count(*)::bigint FROM history_rows)
    END AS history_row_count,
    CASE
      WHEN NOT hss.history_relation_exists OR NOT hss.history_relation_is_supported THEN ARRAY[]::text[]
      ELSE COALESCE((SELECT array_agg(hr.version ORDER BY hr.version) FROM history_rows hr), ARRAY[]::text[])
    END AS applied_versions,
    CASE
      WHEN NOT hss.history_relation_exists OR NOT hss.history_relation_is_supported THEN ARRAY[]::text[]
      ELSE COALESCE(
        (
          SELECT array_agg(d.version ORDER BY d.version)
          FROM (
            SELECT hr.version
            FROM history_rows hr
            GROUP BY hr.version
            HAVING count(*) > 1
          ) AS d
        ),
        ARRAY[]::text[]
      )
    END AS duplicate_versions
  FROM history_shape_safe hss
),
version_sets AS (
  SELECT
    hr.*,
    p.expected_versions,
    COALESCE(
      (
        SELECT array_agg(ev ORDER BY ev)
        FROM unnest(p.expected_versions) AS ev
        WHERE ev = ANY (COALESCE(hr.applied_versions, ARRAY[]::text[]))
      ),
      ARRAY[]::text[]
    ) AS present_expected_versions,
    COALESCE(
      (
        SELECT array_agg(ev ORDER BY ev)
        FROM unnest(p.expected_versions) AS ev
        WHERE NOT (ev = ANY (COALESCE(hr.applied_versions, ARRAY[]::text[])))
      ),
      ARRAY[]::text[]
    ) AS absent_expected_versions,
    COALESCE(
      (
        SELECT array_agg(v ORDER BY v)
        FROM unnest(COALESCE(hr.applied_versions, ARRAY[]::text[])) AS v
        WHERE NOT (v = ANY (p.expected_versions))
      ),
      ARRAY[]::text[]
    ) AS unexpected_history_versions
  FROM history_read hr
  CROSS JOIN params p
),
baseline_rel AS (
  SELECT
    p.baseline_relations,
    cardinality(p.baseline_relations) AS baseline_expected_count,
    COALESCE(
      (
        SELECT bool_or(to_regclass(format('public.%I', expected.name)) IS NOT NULL)
        FROM unnest(p.baseline_relations) AS expected(name)
      ),
      false
    ) AS any_baseline_object_by_name,
    COALESCE(
      (
        SELECT array_agg(r.relname ORDER BY r.relname)
        FROM unnest(p.baseline_relations) AS expected(name)
        JOIN pg_catalog.pg_class r ON r.oid = to_regclass(format('public.%I', expected.name))
        JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace AND n.nspname = 'public'
        WHERE r.relkind = 'r'
      ),
      ARRAY[]::text[]
    ) AS baseline_present_relations,
    COALESCE(
      (
        SELECT array_agg(expected.name ORDER BY expected.name)
        FROM unnest(p.baseline_relations) AS expected(name)
        WHERE to_regclass(format('public.%I', expected.name)) IS NULL
      ),
      ARRAY[]::text[]
    ) AS baseline_missing_relations,
    COALESCE(
      (
        SELECT array_agg(expected.name ORDER BY expected.name)
        FROM unnest(p.baseline_relations) AS expected(name)
        JOIN pg_catalog.pg_class r ON r.oid = to_regclass(format('public.%I', expected.name))
        JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace AND n.nspname = 'public'
        WHERE r.relkind <> 'r'
      ),
      ARRAY[]::text[]
    ) AS baseline_wrong_relkind_relations
  FROM params p
),
baseline_flags AS (
  SELECT
    br.*,
    br.any_baseline_object_by_name AS any_baseline_object_present,
    cardinality(COALESCE(br.baseline_missing_relations, ARRAY[]::text[])) = 0
      AND cardinality(COALESCE(br.baseline_wrong_relkind_relations, ARRAY[]::text[])) = 0
      AND cardinality(COALESCE(br.baseline_present_relations, ARRAY[]::text[])) = br.baseline_expected_count AS all_baseline_objects_exact
  FROM baseline_rel br
),
function_flags AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
    ) AS has_account_deletion_process_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_reply_generate_commit'
    ) AS has_reply_generate_commit_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_consult_reply_commit'
    ) AS has_consult_reply_commit_name,
    to_regprocedure('public.m55_account_deletion_process_v1(text, text, text, text)') IS NOT NULL AS has_account_deletion_process_exact,
    to_regprocedure('public.m55_reply_generate_commit(text, uuid, jsonb, text, text)') IS NOT NULL AS has_reply_generate_commit_exact,
    to_regprocedure(
      'public.m55_consult_reply_commit(text, uuid, uuid, text, text, text, timestamp with time zone)'
    ) IS NOT NULL AS has_consult_reply_commit_exact
),
p2_p3_flags AS (
  SELECT
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
    ) AS has_failed_fulfillments_user_ref_hash,
    to_regclass('public.clerk_webhook_events') IS NOT NULL AS has_clerk_webhook_events_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.oid = to_regclass('public.clerk_webhook_events')
        AND n.nspname = 'public'
        AND c.relkind = 'r'
    ) AS has_clerk_webhook_events_exact_table
),
p7_flags AS (
  SELECT
    to_regclass('public.entitlements_user_id_product_id_key') IS NOT NULL AS has_canonical_entitlements_index_name,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace in_ns ON in_ns.oid = ic.relnamespace
      JOIN pg_catalog.pg_namespace tbl_ns ON tbl_ns.oid = rc.relnamespace
      JOIN pg_catalog.pg_am am ON am.oid = ic.relam
      JOIN pg_catalog.pg_constraint con ON con.conindid = i.indexrelid AND con.contype = 'u'
      WHERE in_ns.nspname = 'public'
        AND tbl_ns.nspname = 'public'
        AND ic.relname = 'entitlements_user_id_product_id_key'
        AND rc.relname = 'entitlements'
        AND am.amname = 'btree'
        AND i.indisunique
        AND NOT i.indisprimary
        AND i.indisvalid
        AND i.indisready
        AND i.indislive
        AND i.indnatts = 2
        AND i.indnkeyatts = 2
        AND i.indpred IS NULL
        AND i.indexprs IS NULL
        AND con.conname = 'entitlements_user_id_product_id_key'
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(i.indkey[:i.indnkeyatts]) AS k(attnum)
          WHERE k.attnum <= 0
        )
        AND (
          SELECT array_agg(a.attname ORDER BY ord)
          FROM unnest(i.indkey[:i.indnkeyatts]) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_catalog.pg_attribute a
            ON a.attrelid = i.indrelid
           AND a.attnum = k.attnum
        ) = ARRAY['user_id', 'product_id']::name[]
    ) AS canonical_entitlements_unique_exact,
    to_regclass('public.entitlements_user_product_uq') IS NULL AS redundant_entitlements_user_product_uq_absent,
    to_regclass('public.uq_entitlements_user_product') IS NULL AS redundant_uq_entitlements_user_product_absent
),
chain_presence AS (
  SELECT
    ff.*,
    p23.has_failed_fulfillments_user_ref_hash,
    p23.has_clerk_webhook_events_name,
    p23.has_clerk_webhook_events_exact_table,
    p7.has_canonical_entitlements_index_name,
    p7.canonical_entitlements_unique_exact,
    p7.redundant_entitlements_user_product_uq_absent,
    p7.redundant_uq_entitlements_user_product_absent,
    (
      ff.has_account_deletion_process_name
      OR ff.has_reply_generate_commit_name
      OR ff.has_consult_reply_commit_name
      OR p23.has_failed_fulfillments_user_ref_hash
      OR p23.has_clerk_webhook_events_name
      OR p7.has_canonical_entitlements_index_name
      OR NOT p7.redundant_entitlements_user_product_uq_absent
      OR NOT p7.redundant_uq_entitlements_user_product_absent
    ) AS any_chain_named_object_present,
    (
      ff.has_account_deletion_process_exact
      AND ff.has_reply_generate_commit_exact
      AND ff.has_consult_reply_commit_exact
      AND p23.has_failed_fulfillments_user_ref_hash
      AND p23.has_clerk_webhook_events_exact_table
      AND p7.canonical_entitlements_unique_exact
      AND p7.redundant_entitlements_user_product_uq_absent
      AND p7.redundant_uq_entitlements_user_product_absent
    ) AS all_required_end_state_exact,
    (ff.has_account_deletion_process_name AND NOT ff.has_account_deletion_process_exact) AS account_deletion_name_but_not_exact_signature,
    (ff.has_reply_generate_commit_name AND NOT ff.has_reply_generate_commit_exact) AS reply_generate_name_but_not_exact_signature,
    (ff.has_consult_reply_commit_name AND NOT ff.has_consult_reply_commit_exact) AS consult_reply_name_but_not_exact_signature,
    (p23.has_clerk_webhook_events_name AND NOT p23.has_clerk_webhook_events_exact_table) AS clerk_name_present_but_wrong_relkind,
    (p7.has_canonical_entitlements_index_name AND NOT p7.canonical_entitlements_unique_exact) AS canonical_index_name_present_but_shape_wrong
  FROM function_flags ff
  CROSS JOIN p2_p3_flags p23
  CROSS JOIN p7_flags p7
),
signals AS (
  SELECT
    vs.*,
    bf.*,
    cp.*,
    cardinality(COALESCE(vs.duplicate_versions, ARRAY[]::text[])) > 0 AS has_duplicate_versions,
    cardinality(COALESCE(vs.unexpected_history_versions, ARRAY[]::text[])) > 0 AS has_unexpected_versions,
    cardinality(COALESCE(bf.baseline_wrong_relkind_relations, ARRAY[]::text[])) > 0 AS has_wrong_relkind,
    (
      vs.history_relation_exists
      AND NOT vs.history_relation_is_supported
    ) AS history_relation_malformed,
    (
      vs.history_relation_is_supported
      AND NOT vs.history_read_succeeded
    ) AS history_read_failed,
    (
      cp.account_deletion_name_but_not_exact_signature
      OR cp.reply_generate_name_but_not_exact_signature
      OR cp.consult_reply_name_but_not_exact_signature
      OR cp.clerk_name_present_but_wrong_relkind
      OR cp.canonical_index_name_present_but_shape_wrong
    ) AS chain_named_object_malformed,
    (
      vs.history_relation_is_supported
      AND cardinality(COALESCE(vs.present_expected_versions, ARRAY[]::text[])) BETWEEN 1
        AND cardinality(vs.expected_versions) - 1
      AND NOT (
        cardinality(COALESCE(vs.duplicate_versions, ARRAY[]::text[])) > 0
        OR cardinality(COALESCE(vs.unexpected_history_versions, ARRAY[]::text[])) > 0
      )
    ) AS partial_chain_signal,
    (
      (NOT vs.history_relation_exists OR vs.history_row_count = 0)
      AND NOT (
        vs.history_relation_exists
        AND NOT vs.history_relation_is_supported
      )
      AND (bf.any_baseline_object_by_name OR cp.any_chain_named_object_present)
    ) AS baseline_without_history_signal,
    (
      cardinality(COALESCE(vs.present_expected_versions, ARRAY[]::text[])) = cardinality(vs.expected_versions)
      AND vs.expected_versions @> COALESCE(vs.applied_versions, ARRAY[]::text[])
      AND COALESCE(vs.applied_versions, ARRAY[]::text[]) @> vs.expected_versions
      AND cardinality(COALESCE(vs.duplicate_versions, ARRAY[]::text[])) = 0
      AND cardinality(COALESCE(vs.unexpected_history_versions, ARRAY[]::text[])) = 0
      AND vs.history_relation_is_supported
      AND NOT (bf.all_baseline_objects_exact AND cp.all_required_end_state_exact)
    ) AS history_without_objects_signal,
    (
      (NOT vs.history_relation_exists OR (vs.history_relation_is_supported AND vs.history_row_count = 0))
      AND NOT bf.any_baseline_object_by_name
      AND NOT cp.any_chain_named_object_present
      AND cardinality(COALESCE(vs.duplicate_versions, ARRAY[]::text[])) = 0
      AND cardinality(COALESCE(vs.unexpected_history_versions, ARRAY[]::text[])) = 0
      AND NOT (
        vs.history_relation_exists
        AND NOT vs.history_relation_is_supported
      )
    ) AS greenfield_signal,
    (
      cardinality(COALESCE(vs.present_expected_versions, ARRAY[]::text[])) = cardinality(vs.expected_versions)
      AND vs.expected_versions @> COALESCE(vs.applied_versions, ARRAY[]::text[])
      AND COALESCE(vs.applied_versions, ARRAY[]::text[]) @> vs.expected_versions
      AND cardinality(COALESCE(vs.duplicate_versions, ARRAY[]::text[])) = 0
      AND cardinality(COALESCE(vs.unexpected_history_versions, ARRAY[]::text[])) = 0
      AND vs.history_relation_is_supported
      AND bf.all_baseline_objects_exact
      AND cp.all_required_end_state_exact
    ) AS already_complete_signal
  FROM version_sets vs
  CROSS JOIN baseline_flags bf
  CROSS JOIN chain_presence cp
),
classification AS (
  SELECT
    s.*,
    CASE
      WHEN s.history_relation_malformed
        OR s.history_read_failed
        OR s.has_duplicate_versions
        OR s.has_unexpected_versions
        OR s.has_wrong_relkind
        OR (
          s.chain_named_object_malformed
          AND NOT s.baseline_without_history_signal
          AND NOT s.history_without_objects_signal
        )
        OR (
          s.any_baseline_object_by_name
          AND s.any_chain_named_object_present
          AND NOT s.already_complete_signal
          AND NOT s.partial_chain_signal
          AND NOT s.baseline_without_history_signal
          AND NOT s.history_without_objects_signal
          AND NOT s.greenfield_signal
        ) THEN 'UNKNOWN_OR_MISMATCH'
      WHEN s.already_complete_signal THEN 'ALREADY_COMPLETE'
      WHEN s.partial_chain_signal THEN 'PARTIAL_CHAIN'
      WHEN s.baseline_without_history_signal THEN 'BASELINE_OBJECTS_WITHOUT_HISTORY'
      WHEN s.history_without_objects_signal THEN 'HISTORY_WITHOUT_REQUIRED_OBJECTS'
      WHEN s.greenfield_signal THEN 'GREENFIELD_READY'
      ELSE 'UNKNOWN_OR_MISMATCH'
    END AS preflight_classification
  FROM signals s
)
SELECT
  current_database() AS current_database,
  current_user AS current_user,
  c.history_relation_oid,
  c.history_relation_exists,
  c.history_relation_relkind,
  c.history_version_column_exists,
  c.history_version_column_type,
  c.history_relation_is_supported,
  c.history_read_supported,
  c.history_read_attempted,
  c.history_read_succeeded,
  c.history_row_count,
  c.applied_versions,
  c.duplicate_versions,
  c.expected_versions,
  c.present_expected_versions,
  c.absent_expected_versions,
  c.unexpected_history_versions,
  c.baseline_expected_count,
  c.baseline_present_relations,
  c.baseline_missing_relations,
  c.baseline_wrong_relkind_relations,
  c.any_baseline_object_by_name,
  c.any_baseline_object_present,
  c.all_baseline_objects_exact,
  c.has_account_deletion_process_name,
  c.has_reply_generate_commit_name,
  c.has_consult_reply_commit_name,
  c.has_account_deletion_process_exact,
  c.has_reply_generate_commit_exact,
  c.has_consult_reply_commit_exact,
  c.account_deletion_name_but_not_exact_signature,
  c.reply_generate_name_but_not_exact_signature,
  c.consult_reply_name_but_not_exact_signature,
  c.has_failed_fulfillments_user_ref_hash,
  c.has_clerk_webhook_events_name,
  c.has_clerk_webhook_events_exact_table,
  c.clerk_name_present_but_wrong_relkind,
  c.has_canonical_entitlements_index_name,
  c.canonical_entitlements_unique_exact,
  c.canonical_index_name_present_but_shape_wrong,
  c.redundant_entitlements_user_product_uq_absent,
  c.redundant_uq_entitlements_user_product_absent,
  c.any_chain_named_object_present,
  c.all_required_end_state_exact,
  c.chain_named_object_malformed,
  c.preflight_classification,
  (c.preflight_classification = 'GREENFIELD_READY') AS greenfield_ready,
  (c.preflight_classification = 'ALREADY_COMPLETE') AS already_complete,
  (c.preflight_classification = 'GREENFIELD_READY') AS ready_for_apply_mechanism_planning,
  (c.preflight_classification = 'GREENFIELD_READY') AS apply_required,
  (c.preflight_classification = 'ALREADY_COMPLETE') AS no_apply_needed,
  (c.preflight_classification NOT IN ('GREENFIELD_READY', 'ALREADY_COMPLETE')) AS stop_required,
  CASE c.preflight_classification
    WHEN 'GREENFIELD_READY' THEN NULL
    WHEN 'ALREADY_COMPLETE' THEN NULL
    WHEN 'UNKNOWN_OR_MISMATCH' THEN
      CASE
        WHEN c.history_relation_malformed THEN 'malformed_migration_history_relation'
        WHEN c.history_read_failed THEN 'history_read_failed'
        WHEN c.has_duplicate_versions THEN 'duplicate_migration_history_versions'
        WHEN c.has_unexpected_versions THEN 'unexpected_migration_history_versions'
        WHEN c.has_wrong_relkind THEN 'baseline_relation_wrong_relkind'
        WHEN c.chain_named_object_malformed THEN 'chain_named_object_malformed_shape'
        ELSE 'unknown_or_mismatch_state'
      END
    WHEN 'PARTIAL_CHAIN' THEN 'partial_chain_requires_independent_review'
    WHEN 'BASELINE_OBJECTS_WITHOUT_HISTORY' THEN 'baseline_objects_without_history'
    WHEN 'HISTORY_WITHOUT_REQUIRED_OBJECTS' THEN 'history_without_required_objects'
    ELSE 'review_required'
  END AS stop_reason,
  'PREVIEW DB PREAPPLY HUMAN RESULT REVIEW'::text AS next_gate_label
FROM classification c;
