-- =============================================================================
-- READ-ONLY — M55 Production postcheck object/deletion mismatch diagnostic
-- Path: scripts/sql/production/m55_production_postcheck_object_mismatch_diagnostic.sql
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- Exactly one top-level SELECT/WITH. SELECT/WITH only. No DDL/DML/CALL/COPY/DO.
-- No application-row reads. No business-table row counts. No secrets/PII.
-- Catalog / pg_catalog / to_regclass / to_regprocedure / pg_proc / pg_index /
-- pg_constraint only. P1-P7 scope only; Phase 2 gap version excluded.
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
    16::integer AS listed_table_count,
    17::integer AS postcheck_expected_count,
    'p_clerk_user_id text, p_svix_id text, p_user_ref_hash text'::text AS deletion_rpc_signature_postcheck_expected,
    'p_svix_id text, p_event_type text, p_clerk_user_id text, p_user_ref_hash text'::text AS deletion_rpc_signature_canonical_expected,
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
      'stripe_processed_events',
      'clerk_webhook_events'
    ]::text[] AS required_tables
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
required_table_rows AS (
  SELECT
    t.table_name,
    to_regclass(format('public.%I', t.table_name)) IS NOT NULL AS relation_exists,
    COALESCE(
      (
        SELECT c.relkind = 'r'
        FROM pg_catalog.pg_class c
        WHERE c.oid = to_regclass(format('public.%I', t.table_name))
      ),
      false
    ) AS relation_is_ordinary_table
  FROM (
    SELECT unnest(p.required_tables) AS table_name
    FROM params p
  ) t
),
required_table_summary AS (
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'object_key', rtr.table_name,
            'expected_kind', 'table',
            'postcheck_probe_summary', format('to_regclass(public.%I)', rtr.table_name),
            'postcheck_probe_present', rtr.relation_exists AND rtr.relation_is_ordinary_table,
            'alternate_probe_present', rtr.relation_exists AND rtr.relation_is_ordinary_table,
            'present', rtr.relation_exists AND rtr.relation_is_ordinary_table,
            'reason_if_false', CASE
              WHEN NOT rtr.relation_exists THEN 'relation_absent'
              WHEN NOT rtr.relation_is_ordinary_table THEN 'relation_not_ordinary_table'
              ELSE NULL
            END
          )
          ORDER BY rtr.table_name
        )
        FROM required_table_rows rtr
      ),
      '[]'::jsonb
    ) AS required_table_detail,
    COALESCE(
      (
        SELECT SUM(
          CASE
            WHEN rtr.relation_exists AND rtr.relation_is_ordinary_table THEN 1
            ELSE 0
          END
        )::integer
        FROM required_table_rows rtr
      ),
      0
    ) AS present_table_count,
    COALESCE(
      (
        SELECT array_agg(rtr.table_name ORDER BY rtr.table_name)
        FROM required_table_rows rtr
        WHERE NOT (rtr.relation_exists AND rtr.relation_is_ordinary_table)
      ),
      ARRAY[]::text[]
    ) AS missing_required_tables
  FROM required_table_rows rtr
  LIMIT 1
),
deletion_rpc_catalog AS (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'identity_args', pg_catalog.pg_get_function_identity_arguments(p.oid),
          'arg_count', p.pronargs,
          'security_definer', p.prosecdef,
          'service_role_execute', (
            EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = 'service_role')
            AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
          )
        )
        ORDER BY pg_catalog.pg_get_function_identity_arguments(p.oid)
      )
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'm55_account_deletion_process_v1'
    ),
    '[]'::jsonb
  ) AS all_signatures
),
deletion_rpc_eval AS (
  SELECT
    to_regprocedure('public.m55_account_deletion_process_v1(text,text,text)') IS NOT NULL AS deletion_rpc_present_3arg,
    to_regprocedure('public.m55_account_deletion_process_v1(text,text,text,text)') IS NOT NULL AS deletion_rpc_present_4arg,
    COALESCE(
      (
        SELECT bool_or(p.prosecdef)
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'm55_account_deletion_process_v1'
      ),
      false
    ) AS deletion_rpc_security_definer_any,
    COALESCE(
      (
        SELECT p.prosecdef
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'm55_account_deletion_process_v1'
          AND p.pronargs = 4
        ORDER BY p.oid
        LIMIT 1
      ),
      false
    ) AS deletion_rpc_security_definer_4arg,
    COALESCE(
      (
        SELECT bool_or(
          EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = 'service_role')
          AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
        )
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'm55_account_deletion_process_v1'
      ),
      false
    ) AS deletion_rpc_service_role_execute_any,
    COALESCE(
      (
        SELECT
          EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = 'service_role')
          AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'm55_account_deletion_process_v1'
          AND p.pronargs = 4
        ORDER BY p.oid
        LIMIT 1
      ),
      false
    ) AS deletion_rpc_service_role_execute_4arg,
    COALESCE(
      (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_proc p
          JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = 'm55_account_deletion_process_v1'
            AND pg_catalog.pg_get_function_identity_arguments(p.oid) = p_params.deletion_rpc_signature_postcheck_expected
        )
        FROM params p_params
      ),
      false
    ) AS deletion_rpc_signature_postcheck_match,
    COALESCE(
      (
        SELECT pg_catalog.pg_get_function_identity_arguments(p.oid)
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'm55_account_deletion_process_v1'
          AND p.pronargs = 4
        ORDER BY p.oid
        LIMIT 1
      ),
      NULL
    ) AS deletion_rpc_signature_canonical_actual
  FROM deletion_rpc_catalog drc
  CROSS JOIN params p_params
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
        AND i.indisunique
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
entitlements_probe_eval AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_id_key_unique'
        AND i.indisunique
    ) AS entitlements_stale_index_present,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class ic
      JOIN pg_catalog.pg_index i ON i.indexrelid = ic.oid
      JOIN pg_catalog.pg_class rc ON rc.oid = i.indrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND ic.relname = 'entitlements_user_id_product_id_key'
        AND i.indisunique
    ) AS entitlements_canonical_index_present,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class rc ON rc.oid = con.conrelid
      JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
      WHERE rn.nspname = 'public'
        AND rc.relname = 'entitlements'
        AND con.conname = 'entitlements_user_id_product_id_key'
        AND con.contype = 'u'
    ) AS entitlements_canonical_constraint_present,
    to_regclass('public.entitlements_user_product_uq') IS NOT NULL AS p7_dup_index_user_product_uq_present,
    to_regclass('public.uq_entitlements_user_product') IS NOT NULL AS p7_dup_index_uq_entitlements_user_product_present
  FROM entitlements_index_catalog eic
),
dtr_visible_eval AS (
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'index_name', ic.relname,
          'is_unique', i.indisunique,
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
        AND rc.relname = 'dtr_report_snapshots'
        AND ic.relname LIKE '%visible%'
        AND i.indisunique
    ),
    '[]'::jsonb
  ) AS dtr_visible_unique_indexes_detail,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class rc
    JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
    JOIN pg_catalog.pg_index i ON i.indrelid = rc.oid
    JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
    WHERE rn.nspname = 'public'
      AND rc.relname = 'dtr_report_snapshots'
      AND ic.relname LIKE '%visible%'
      AND i.indisunique
  ) AS dtr_visible_unique_present,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class rc
    JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
    JOIN pg_catalog.pg_index i ON i.indrelid = rc.oid
    JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
    WHERE rn.nspname = 'public'
      AND rc.relname = 'dtr_report_snapshots'
      AND ic.relname LIKE '%visible%'
      AND i.indisunique
  ) AS postcheck_dtr_visible_unique_present
),
postcheck_probe_eval AS (
  SELECT
    rts.present_table_count,
    p.listed_table_count,
    p.postcheck_expected_count,
    (
      rts.present_table_count = p.postcheck_expected_count
    ) AS postcheck_table_count_green,
    dre.deletion_rpc_present_3arg AS postcheck_deletion_rpc_present,
    dre.deletion_rpc_signature_postcheck_match AS postcheck_deletion_rpc_signature_exact,
    epe.entitlements_stale_index_present AS postcheck_entitlements_unique_present,
    dve.postcheck_dtr_visible_unique_present AS postcheck_dtr_visible_unique_present,
    (
      rts.present_table_count = p.postcheck_expected_count
      AND dre.deletion_rpc_present_3arg
      AND dre.deletion_rpc_signature_postcheck_match
      AND epe.entitlements_stale_index_present
      AND dve.postcheck_dtr_visible_unique_present
    ) AS postcheck_objects_green,
    (
      dre.deletion_rpc_present_3arg
      AND dre.deletion_rpc_security_definer_any
      AND dre.deletion_rpc_service_role_execute_any
    ) AS deletion_contract_postcheck_green
  FROM required_table_summary rts
  CROSS JOIN params p
  CROSS JOIN deletion_rpc_eval dre
  CROSS JOIN entitlements_probe_eval epe
  CROSS JOIN dtr_visible_eval dve
),
canonical_probe_eval AS (
  SELECT
    (
      rts.present_table_count = p.listed_table_count
    ) AS canonical_table_count_green,
    dre.deletion_rpc_present_4arg AS canonical_deletion_rpc_present,
    (
      dre.deletion_rpc_signature_canonical_actual IS NOT NULL
      AND dre.deletion_rpc_signature_canonical_actual = p.deletion_rpc_signature_canonical_expected
    ) AS canonical_deletion_rpc_signature_exact,
    (
      epe.entitlements_canonical_index_present
      OR epe.entitlements_canonical_constraint_present
    ) AS canonical_entitlements_unique_present,
    dve.dtr_visible_unique_present AS canonical_dtr_visible_unique_present,
    NOT epe.p7_dup_index_user_product_uq_present AS p7_dup_index_user_product_uq_absent,
    NOT epe.p7_dup_index_uq_entitlements_user_product_present AS p7_dup_index_uq_entitlements_user_product_absent,
    (
      rts.present_table_count = p.listed_table_count
      AND dre.deletion_rpc_present_4arg
      AND (
        dre.deletion_rpc_signature_canonical_actual IS NOT NULL
        AND dre.deletion_rpc_signature_canonical_actual = p.deletion_rpc_signature_canonical_expected
      )
      AND (
        epe.entitlements_canonical_index_present
        OR epe.entitlements_canonical_constraint_present
      )
      AND dve.dtr_visible_unique_present
      AND NOT epe.p7_dup_index_user_product_uq_present
      AND NOT epe.p7_dup_index_uq_entitlements_user_product_present
    ) AS canonical_objects_green,
    (
      dre.deletion_rpc_present_4arg
      AND dre.deletion_rpc_security_definer_4arg
      AND dre.deletion_rpc_service_role_execute_4arg
    ) AS deletion_contract_canonical_green
  FROM required_table_summary rts
  CROSS JOIN params p
  CROSS JOIN deletion_rpc_eval dre
  CROSS JOIN entitlements_probe_eval epe
  CROSS JOIN dtr_visible_eval dve
),
registry_payload AS (
  SELECT
    rts.required_table_detail,
    jsonb_build_object(
      'listed_table_count', p.listed_table_count,
      'present_table_count', rts.present_table_count,
      'postcheck_expected_count', p.postcheck_expected_count,
      'postcheck_table_count_green', ppe.postcheck_table_count_green,
      'canonical_table_count_green', cpe.canonical_table_count_green,
      'count_mismatch_reason', CASE
        WHEN rts.present_table_count = p.listed_table_count
          AND p.listed_table_count <> p.postcheck_expected_count
          THEN 'postcheck_expected_count_exceeds_listed_table_count'
        WHEN rts.present_table_count < p.listed_table_count
          THEN 'required_table_missing'
        WHEN rts.present_table_count > p.listed_table_count
          THEN 'unexpected_extra_required_tables'
        ELSE NULL
      END
    ) AS table_count_comparison,
    jsonb_build_object(
      'object_key', 'deletion_rpc_3arg',
      'expected_kind', 'function',
      'postcheck_probe_summary', 'to_regprocedure(public.m55_account_deletion_process_v1(text,text,text))',
      'postcheck_probe_present', dre.deletion_rpc_present_3arg,
      'alternate_probe_summary', 'to_regprocedure(public.m55_account_deletion_process_v1(text,text,text,text))',
      'alternate_probe_present', dre.deletion_rpc_present_4arg,
      'present', dre.deletion_rpc_present_4arg,
      'reason_if_false', CASE
        WHEN dre.deletion_rpc_present_4arg THEN NULL
        WHEN dre.deletion_rpc_present_3arg THEN 'only_stale_3arg_overload_present'
        ELSE 'canonical_4arg_rpc_absent'
      END,
      'all_signatures', drc.all_signatures,
      'security_definer_any', dre.deletion_rpc_security_definer_any,
      'security_definer_4arg', dre.deletion_rpc_security_definer_4arg,
      'service_role_execute_any', dre.deletion_rpc_service_role_execute_any,
      'service_role_execute_4arg', dre.deletion_rpc_service_role_execute_4arg
    ) AS rpc_probe_detail,
    jsonb_build_object(
      'object_key', 'entitlements_unique',
      'expected_kind', 'index_or_constraint',
      'postcheck_probe_summary', 'index entitlements_user_id_key_unique on public.entitlements',
      'postcheck_probe_present', epe.entitlements_stale_index_present,
      'alternate_probe_summary', 'index or unique constraint entitlements_user_id_product_id_key on public.entitlements',
      'alternate_probe_present', (
        epe.entitlements_canonical_index_present
        OR epe.entitlements_canonical_constraint_present
      ),
      'present', (
        epe.entitlements_canonical_index_present
        OR epe.entitlements_canonical_constraint_present
      ),
      'reason_if_false', CASE
        WHEN epe.entitlements_canonical_index_present
          OR epe.entitlements_canonical_constraint_present THEN NULL
        WHEN epe.entitlements_stale_index_present THEN 'only_stale_index_name_present'
        ELSE 'canonical_entitlements_unique_absent'
      END,
      'entitlements_unique_indexes_detail', eic.entitlements_unique_indexes_detail,
      'entitlements_unique_constraints_detail', eic.entitlements_unique_constraints_detail,
      'canonical_index_present', epe.entitlements_canonical_index_present,
      'canonical_constraint_present', epe.entitlements_canonical_constraint_present
    ) AS entitlements_probe_detail,
    jsonb_build_object(
      'object_key', 'dtr_visible_unique',
      'expected_kind', 'index',
      'postcheck_probe_summary', 'unique index on public.dtr_report_snapshots with name LIKE %visible%',
      'postcheck_probe_present', dve.dtr_visible_unique_present,
      'alternate_probe_present', dve.dtr_visible_unique_present,
      'present', dve.dtr_visible_unique_present,
      'reason_if_false', CASE
        WHEN dve.dtr_visible_unique_present THEN NULL
        ELSE 'dtr_visible_unique_index_absent'
      END,
      'dtr_visible_unique_indexes_detail', dve.dtr_visible_unique_indexes_detail
    ) AS dtr_visible_probe_detail,
    jsonb_build_object(
      'object_key', 'p7_duplicate_index_absence',
      'expected_kind', 'index_absence',
      'entitlements_user_product_uq_present', epe.p7_dup_index_user_product_uq_present,
      'uq_entitlements_user_product_present', epe.p7_dup_index_uq_entitlements_user_product_present,
      'entitlements_user_product_uq_absent', cpe.p7_dup_index_user_product_uq_absent,
      'uq_entitlements_user_product_absent', cpe.p7_dup_index_uq_entitlements_user_product_absent,
      'present', (
        cpe.p7_dup_index_user_product_uq_absent
        AND cpe.p7_dup_index_uq_entitlements_user_product_absent
      ),
      'reason_if_false', CASE
        WHEN epe.p7_dup_index_user_product_uq_present
          AND epe.p7_dup_index_uq_entitlements_user_product_present
          THEN 'both_p7_duplicate_indexes_still_present'
        WHEN epe.p7_dup_index_user_product_uq_present
          THEN 'entitlements_user_product_uq_still_present'
        WHEN epe.p7_dup_index_uq_entitlements_user_product_present
          THEN 'uq_entitlements_user_product_still_present'
        ELSE NULL
      END
    ) AS p7_duplicate_absence_detail
  FROM required_table_summary rts
  CROSS JOIN params p
  CROSS JOIN deletion_rpc_eval dre
  CROSS JOIN deletion_rpc_catalog drc
  CROSS JOIN entitlements_probe_eval epe
  CROSS JOIN entitlements_index_catalog eic
  CROSS JOIN dtr_visible_eval dve
  CROSS JOIN postcheck_probe_eval ppe
  CROSS JOIN canonical_probe_eval cpe
  LIMIT 1
),
object_registry_detail AS (
  SELECT jsonb_build_object(
    'required_tables', rp.required_table_detail,
    'table_count_comparison', rp.table_count_comparison,
    'rpc_probe', rp.rpc_probe_detail,
    'entitlements_unique_probe', rp.entitlements_probe_detail,
    'dtr_visible_probe', rp.dtr_visible_probe_detail,
    'p7_duplicate_index_absence', rp.p7_duplicate_absence_detail,
    'postcheck_objects_green', ppe.postcheck_objects_green,
    'canonical_objects_green', cpe.canonical_objects_green
  ) AS object_registry_detail
  FROM registry_payload rp
  CROSS JOIN postcheck_probe_eval ppe
  CROSS JOIN canonical_probe_eval cpe
),
missing_object_keys AS (
  SELECT COALESCE(
    (
      SELECT array_agg(x.object_key ORDER BY x.object_key)
      FROM (
        SELECT unnest(rts.missing_required_tables) AS object_key
        UNION ALL
        SELECT 'deletion_rpc_4arg'::text
        WHERE NOT dre.deletion_rpc_present_4arg
        UNION ALL
        SELECT 'entitlements_canonical_unique'::text
        WHERE NOT (
          epe.entitlements_canonical_index_present
          OR epe.entitlements_canonical_constraint_present
        )
        UNION ALL
        SELECT 'dtr_visible_unique'::text
        WHERE NOT dve.dtr_visible_unique_present
        UNION ALL
        SELECT 'p7_duplicate_index_absence'::text
        WHERE epe.p7_dup_index_user_product_uq_present
          OR epe.p7_dup_index_uq_entitlements_user_product_present
      ) x
      WHERE x.object_key IS NOT NULL
    ),
    ARRAY[]::text[]
  ) AS missing_object_keys
  FROM required_table_summary rts
  CROSS JOIN deletion_rpc_eval dre
  CROSS JOIN entitlements_probe_eval epe
  CROSS JOIN dtr_visible_eval dve
  LIMIT 1
),
deletion_contract_detail AS (
  SELECT jsonb_build_object(
    'deletion_rpc_present_3arg', dre.deletion_rpc_present_3arg,
    'deletion_rpc_present_4arg', dre.deletion_rpc_present_4arg,
    'deletion_rpc_security_definer', dre.deletion_rpc_security_definer_any,
    'deletion_rpc_security_definer_4arg', dre.deletion_rpc_security_definer_4arg,
    'deletion_rpc_service_role_execute', dre.deletion_rpc_service_role_execute_any,
    'deletion_rpc_service_role_execute_4arg', dre.deletion_rpc_service_role_execute_4arg,
    'deletion_rpc_signature_postcheck_expected', p.deletion_rpc_signature_postcheck_expected,
    'deletion_rpc_signature_postcheck_match', dre.deletion_rpc_signature_postcheck_match,
    'deletion_rpc_signature_canonical_expected', p.deletion_rpc_signature_canonical_expected,
    'deletion_rpc_signature_canonical_actual', dre.deletion_rpc_signature_canonical_actual,
    'deletion_rpc_all_signatures', drc.all_signatures,
    'deletion_contract_postcheck_green', ppe.deletion_contract_postcheck_green,
    'deletion_contract_canonical_green', cpe.deletion_contract_canonical_green,
    'mismatch_reason', CASE
      WHEN cpe.deletion_contract_canonical_green THEN NULL
      WHEN NOT dre.deletion_rpc_present_4arg THEN 'canonical_4arg_rpc_absent'
      WHEN NOT dre.deletion_rpc_security_definer_4arg THEN 'canonical_4arg_rpc_not_security_definer'
      WHEN NOT dre.deletion_rpc_service_role_execute_4arg THEN 'canonical_4arg_rpc_missing_service_role_execute'
      WHEN ppe.deletion_contract_postcheck_green
        AND NOT cpe.deletion_contract_canonical_green THEN 'postcheck_green_but_canonical_contract_red'
      WHEN NOT ppe.deletion_contract_postcheck_green
        AND cpe.deletion_contract_canonical_green THEN 'postcheck_stale_probe_mismatch'
      ELSE 'deletion_contract_state_contradictory'
    END
  ) AS deletion_contract_detail
  FROM params p
  CROSS JOIN deletion_rpc_eval dre
  CROSS JOIN deletion_rpc_catalog drc
  CROSS JOIN postcheck_probe_eval ppe
  CROSS JOIN canonical_probe_eval cpe
),
deletion_mismatch_keys AS (
  SELECT COALESCE(
    (
      SELECT array_agg(x.key ORDER BY x.key)
      FROM (
        SELECT 'deletion_rpc_present_3arg'::text AS key
        WHERE NOT dre.deletion_rpc_present_3arg
        UNION ALL
        SELECT 'deletion_rpc_present_4arg'::text
        WHERE NOT dre.deletion_rpc_present_4arg
        UNION ALL
        SELECT 'deletion_rpc_security_definer'::text
        WHERE NOT dre.deletion_rpc_security_definer_any
        UNION ALL
        SELECT 'deletion_rpc_security_definer_4arg'::text
        WHERE NOT dre.deletion_rpc_security_definer_4arg
        UNION ALL
        SELECT 'deletion_rpc_service_role_execute'::text
        WHERE NOT dre.deletion_rpc_service_role_execute_any
        UNION ALL
        SELECT 'deletion_rpc_service_role_execute_4arg'::text
        WHERE NOT dre.deletion_rpc_service_role_execute_4arg
        UNION ALL
        SELECT 'deletion_rpc_signature_postcheck_match'::text
        WHERE NOT dre.deletion_rpc_signature_postcheck_match
        UNION ALL
        SELECT 'deletion_rpc_signature_canonical_match'::text
        WHERE dre.deletion_rpc_signature_canonical_actual IS DISTINCT FROM p.deletion_rpc_signature_canonical_expected
        UNION ALL
        SELECT 'deletion_contract_postcheck_green'::text
        WHERE NOT ppe.deletion_contract_postcheck_green
        UNION ALL
        SELECT 'deletion_contract_canonical_green'::text
        WHERE NOT cpe.deletion_contract_canonical_green
      ) x
    ),
    ARRAY[]::text[]
  ) AS deletion_mismatch_keys
  FROM params p
  CROSS JOIN deletion_rpc_eval dre
  CROSS JOIN postcheck_probe_eval ppe
  CROSS JOIN canonical_probe_eval cpe
  LIMIT 1
),
probe_mismatch_eval AS (
  SELECT
    (
      cpe.canonical_objects_green
      AND cpe.deletion_contract_canonical_green
      AND NOT ppe.postcheck_objects_green
      AND NOT ppe.deletion_contract_postcheck_green
    ) AS postcheck_probe_mismatch_suspected
  FROM postcheck_probe_eval ppe
  CROSS JOIN canonical_probe_eval cpe
),
classification_inputs AS (
  SELECT
    ui.ui_identity_exact,
    mok.missing_object_keys,
    dmk.deletion_mismatch_keys,
    pme.postcheck_probe_mismatch_suspected,
    cpe.canonical_objects_green,
    cpe.deletion_contract_canonical_green,
    ppe.postcheck_objects_green,
    ppe.deletion_contract_postcheck_green
  FROM ui_identity ui
  CROSS JOIN missing_object_keys mok
  CROSS JOIN deletion_mismatch_keys dmk
  CROSS JOIN probe_mismatch_eval pme
  CROSS JOIN canonical_probe_eval cpe
  CROSS JOIN postcheck_probe_eval ppe
),
classification AS (
  SELECT
    ci.*,
    CASE
      WHEN NOT ci.ui_identity_exact THEN 'HOLD_IDENTITY_MISMATCH'
      WHEN NOT ci.deletion_contract_canonical_green THEN 'POSTCHECK_DELETION_CONTRACT_MISMATCH_CONFIRMED'
      WHEN cardinality(ci.missing_object_keys) > 0 THEN 'POSTCHECK_OBJECT_MISMATCH_CONFIRMED'
      WHEN ci.postcheck_probe_mismatch_suspected THEN 'POSTCHECK_PROBE_MISMATCH_SUSPECTED'
      WHEN ci.canonical_objects_green
        AND ci.deletion_contract_canonical_green
        AND (NOT ci.postcheck_objects_green OR NOT ci.deletion_contract_postcheck_green)
        THEN 'POSTCHECK_PROBE_MISMATCH_SUSPECTED'
      ELSE 'DIAGNOSTIC_UNKNOWN'
    END AS diagnostic_classification
  FROM classification_inputs ci
),
final_output AS (
  SELECT
    c.diagnostic_classification,
    c.ui_identity_exact,
    ord.object_registry_detail,
    c.missing_object_keys,
    dcd.deletion_contract_detail,
    c.deletion_mismatch_keys,
    c.postcheck_probe_mismatch_suspected,
    CASE
      WHEN NOT c.ui_identity_exact THEN
        'CATEGORY-1-M55-PRODUCTION-MIGRATION-POSTCHECK-HOLD-REV1'
      WHEN c.diagnostic_classification = 'POSTCHECK_PROBE_MISMATCH_SUSPECTED' THEN
        'CATEGORY-1-M55-PRODUCTION-MIGRATION-POSTCHECK-PROBE-MISMATCH-PATCH-PLANNING-REV1'
      WHEN c.diagnostic_classification IN (
        'POSTCHECK_OBJECT_MISMATCH_CONFIRMED',
        'POSTCHECK_DELETION_CONTRACT_MISMATCH_CONFIRMED'
      ) THEN
        'CATEGORY-1-M55-PRODUCTION-MIGRATION-POSTCHECK-HOLD-REV1'
      ELSE
        'CATEGORY-1-M55-PRODUCTION-MIGRATION-POSTCHECK-HOLD-REV1'
    END AS recommended_next_gate,
    (
      NOT c.ui_identity_exact
      OR c.diagnostic_classification IN (
        'HOLD_IDENTITY_MISMATCH',
        'POSTCHECK_OBJECT_MISMATCH_CONFIRMED',
        'POSTCHECK_DELETION_CONTRACT_MISMATCH_CONFIRMED',
        'DIAGNOSTIC_UNKNOWN'
      )
      OR c.postcheck_probe_mismatch_suspected
    ) AS stop_required
  FROM classification c
  CROSS JOIN object_registry_detail ord
  CROSS JOIN deletion_contract_detail dcd
)
SELECT
  fo.diagnostic_classification,
  fo.ui_identity_exact,
  fo.object_registry_detail,
  fo.missing_object_keys,
  fo.deletion_contract_detail,
  fo.deletion_mismatch_keys,
  fo.postcheck_probe_mismatch_suspected,
  fo.recommended_next_gate,
  fo.stop_required
FROM final_output fo;
