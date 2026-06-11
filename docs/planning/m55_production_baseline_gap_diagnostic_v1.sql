-- =============================================================================
-- M55 PRODUCTION BASELINE GAP DIAGNOSTIC v1
-- Revision: SQL-DIAGNOSTIC-REVISION-1-PATCH-2
-- Gate: CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-SQL-LOCAL-PATCH-2
-- Target: organization=m55-soul / project=m55-soul-core / branch=main
--         environment=PRODUCTION / source=Primary Database / role=postgres
-- Classifier evidence (READ-ONLY): m55_account_deletion_production_baseline_contract_freeze_v1.sql
-- Forbidden execution: Preview (m55-preview / m55-soul-preview) — Human STOP immediately
-- Allowed: SELECT-only catalog diagnostic; pg_catalog / information_schema metadata only
-- Result: exactly 1 row
-- =============================================================================

WITH
-- ── constants_dimensions ─────────────────────────────────────────────────────
dim_required_rel(relation_name) AS (
  VALUES
    ('consult_messages'::text),
    ('consult_send_commits'::text),
    ('consult_threads'::text),
    ('dtr_guest_drafts'::text),
    ('dtr_report_snapshots'::text),
    ('entitlement_rights'::text),
    ('entitlements'::text),
    ('failed_fulfillments'::text),
    ('one_time_fulfillments'::text),
    ('reply_documents'::text),
    ('reply_sessions'::text),
    ('reply_ticket_wallets'::text),
    ('reply_wallet_ledgers'::text),
    ('stripe_events'::text),
    ('stripe_processed_events'::text)
),
dim_roles(role_name) AS (
  VALUES
    ('PUBLIC'::text),
    ('anon'::text),
    ('authenticated'::text),
    ('service_role'::text)
),
dim_privileges(privilege_name) AS (
  VALUES
    ('SELECT'::text),
    ('INSERT'::text),
    ('UPDATE'::text),
    ('DELETE'::text),
    ('TRUNCATE'::text),
    ('REFERENCES'::text),
    ('TRIGGER'::text)
),
dim_security_aspects(aspect_name) AS (
  VALUES ('owner'::text), ('rls'), ('force_rls')
),
dim_wallet_cells(cell_id, wallet_field) AS (
  VALUES
    ('wallet_scope.report_instance_id.data_type'::text, 'report_instance_id.data_type'::text),
    ('wallet_scope.report_instance_id.is_nullable'::text, 'report_instance_id.is_nullable'::text),
    ('wallet_scope.report_instance_id.column_default'::text, 'report_instance_id.column_default'::text),
    ('wallet_scope.user_id_unique_constraint_state'::text, 'user_id_unique_constraint_state'::text),
    ('wallet_scope.scoped_unique_definition'::text, 'scoped_unique_definition'::text)
),
dim_column_targets(relation_name) AS (
  VALUES
    ('entitlements'::text),
    ('stripe_events'::text),
    ('stripe_processed_events'::text),
    ('reply_ticket_wallets'::text)
),
dim_expected_functions(function_name, identity_arguments) AS (
  VALUES
    ('m55_reply_generate_commit'::text, 'p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text'::text),
    ('m55_consult_reply_commit'::text, 'p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone'::text)
),
dim_expected_cell_ids(cell_id) AS (
  SELECT 'owner.' || r.relation_name FROM dim_required_rel r
  UNION ALL SELECT 'rls.' || r.relation_name FROM dim_required_rel r
  UNION ALL SELECT 'force_rls.' || r.relation_name FROM dim_required_rel r
  UNION ALL
  SELECT 'priv.' || r.relation_name || '.' || ro.role_name || '.' || p.privilege_name
  FROM dim_required_rel r
  CROSS JOIN dim_roles ro
  CROSS JOIN dim_privileges p
  UNION ALL SELECT w.cell_id FROM dim_wallet_cells w
  UNION ALL SELECT 'policy_inventory.' || r.relation_name FROM dim_required_rel r
  UNION ALL SELECT 'constraint_inventory.' || r.relation_name FROM dim_required_rel r
  UNION ALL SELECT 'index_inventory.' || r.relation_name FROM dim_required_rel r
  UNION ALL SELECT 'trigger_inventory.' || r.relation_name FROM dim_required_rel r
  UNION ALL SELECT 'function_inventory.' || f.function_name FROM dim_expected_functions f
  UNION ALL SELECT 'column_inventory.' || c.relation_name FROM dim_column_targets c
),
independent_expected_count_expr AS (
  SELECT (
    (15 * 3)
    + (15 * 4 * 7)
    + 5
    + (15 * 4)
    + 2
    + 4
  )::integer AS independent_expected_count
),
-- ── catalog_base_layers ──────────────────────────────────────────────────────
role_catalog AS (
  SELECT
    dr.role_name,
    CASE WHEN dr.role_name = 'PUBLIC' THEN true ELSE (pg.oid IS NOT NULL) END AS role_exists_or_public_pseudo_role,
    CASE WHEN dr.role_name = 'PUBLIC' THEN NULL ELSE pg.oid END AS role_oid,
    CASE WHEN dr.role_name = 'PUBLIC' THEN NULL ELSE pg.rolname::text END AS pg_role_name
  FROM dim_roles dr
  LEFT JOIN pg_roles pg ON pg.rolname = dr.role_name
),
relation_catalog AS (
  SELECT
    dr.relation_name,
    n.oid AS schema_oid,
    c.oid AS relation_oid,
    (c.oid IS NOT NULL) AS relation_exists,
    COALESCE(c.relkind::text, 'missing') AS relkind,
    c.relowner AS owner_oid,
    CASE WHEN c.oid IS NULL THEN NULL ELSE pg_get_userbyid(c.relowner)::text END AS owner_role,
    COALESCE(c.relrowsecurity, false) AS relrowsecurity,
    COALESCE(c.relforcerowsecurity, false) AS relforcerowsecurity,
    COALESCE(c.relpersistence::text, 'missing') AS relpersistence,
    c.relacl
  FROM dim_required_rel dr
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = dr.relation_name
),
table_acl_exploded AS (
  SELECT
    rc.relation_name,
    rc.relation_oid,
    acl.grantee,
    acl.privilege_type,
    acl.is_grantable,
    acl.grantor,
    CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee_role_name,
    pg_get_userbyid(acl.grantor)::text AS grantor_role_name
  FROM relation_catalog rc
  JOIN pg_class c ON c.oid = rc.relation_oid
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
),
table_acl_public AS (
  SELECT
    relation_name,
    relation_oid,
    privilege_type,
    true AS explicit_grant_present,
    is_grantable AS explicit_grant_is_grantable,
    array_agg(DISTINCT grantor_role_name ORDER BY grantor_role_name) AS grantors
  FROM table_acl_exploded
  WHERE grantee = 0
  GROUP BY relation_name, relation_oid, privilege_type, is_grantable
),
table_acl_direct_role AS (
  SELECT
    relation_name,
    relation_oid,
    grantee_role_name AS role_name,
    privilege_type,
    true AS direct_explicit_grant,
    bool_or(is_grantable) AS explicit_grant_is_grantable,
    array_agg(DISTINCT grantor_role_name ORDER BY grantor_role_name) AS grantors
  FROM table_acl_exploded
  WHERE grantee <> 0
  GROUP BY relation_name, relation_oid, grantee_role_name, privilege_type
),
policy_catalog AS (
  SELECT
    rc.relation_name,
    pol.oid AS policy_oid,
    pol.polname::text AS policy_name,
    CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' ELSE pol.polcmd::text END AS command,
    CASE pol.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive_restrictive,
    COALESCE((
      SELECT array_agg(
        CASE WHEN pr_oid = 0 THEN 'PUBLIC' ELSE (SELECT rolname::text FROM pg_roles WHERE oid = pr_oid) END
        ORDER BY CASE WHEN pr_oid = 0 THEN 'PUBLIC' ELSE (SELECT rolname::text FROM pg_roles WHERE oid = pr_oid) END
      )
      FROM unnest(pol.polroles) AS pr_oid
    ), ARRAY[]::text[]) AS roles,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
  FROM relation_catalog rc
  JOIN pg_policy pol ON pol.polrelid = rc.relation_oid
  WHERE rc.relation_oid IS NOT NULL
),
constraint_catalog AS (
  SELECT
    rc.relation_name,
    con.oid AS constraint_oid,
    con.conname::text AS constraint_name,
    con.contype::text AS constraint_type,
    (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = u.attnum
    ) AS source_columns,
    tn.nspname::text AS target_schema,
    tc.relname::text AS target_relation,
    (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = u.attnum
    ) AS target_columns,
    CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE con.confupdtype::text END AS update_action,
    CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE con.confdeltype::text END AS delete_action,
    CASE con.confmatchtype WHEN 'f' THEN 'FULL' WHEN 'p' THEN 'PARTIAL' WHEN 's' THEN 'SIMPLE' WHEN 'u' THEN 'NONE' ELSE con.confmatchtype::text END AS match_type,
    con.convalidated AS validated,
    con.condeferrable AS deferrable,
    con.condeferred AS initially_deferred,
    con.conindid AS backing_index_oid,
    pg_get_constraintdef(con.oid, true) AS definition
  FROM relation_catalog rc
  JOIN pg_constraint con ON con.conrelid = rc.relation_oid
  LEFT JOIN pg_class tc ON tc.oid = con.confrelid
  LEFT JOIN pg_namespace tn ON tn.oid = tc.relnamespace
  WHERE rc.relation_oid IS NOT NULL
),
index_catalog AS (
  SELECT
    rc.relation_name,
    ic.relname::text AS index_name,
    ic.oid AS index_oid,
    am.amname::text AS access_method,
    i.indisprimary AS is_primary,
    i.indisunique AS is_unique,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    i.indislive AS is_live,
    i.indnatts AS attribute_count,
    i.indnkeyatts AS key_count,
    (
      SELECT array_agg(
        CASE
          WHEN u.attnum = 0 THEN pg_get_indexdef(i.indexrelid, u.ord::integer, true)
          WHEN a.attnum IS NOT NULL AND NOT a.attisdropped THEN a.attname::text
          ELSE NULL::text
        END
        ORDER BY u.ord
      )
      FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
      LEFT JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = u.attnum
       AND u.attnum > 0
      WHERE u.ord BETWEEN 1 AND i.indnatts
        AND u.ord <= i.indnkeyatts
    ) AS key_columns,
    (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = u.attnum
       AND u.attnum > 0
      WHERE u.ord BETWEEN 1 AND i.indnatts
        AND u.ord > i.indnkeyatts
        AND NOT a.attisdropped
    ) AS included_columns,
    GREATEST(i.indnkeyatts - COALESCE((
      SELECT count(*) FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
      WHERE u.ord BETWEEN 1 AND i.indnatts
        AND u.ord <= i.indnkeyatts
        AND (
          u.attnum = 0
          OR NOT EXISTS (
            SELECT 1 FROM pg_attribute a
            WHERE a.attrelid = i.indrelid
              AND a.attnum = u.attnum
              AND NOT a.attisdropped
          )
        )
    ), 0), 0)::integer AS key_expression_count,
    pg_get_expr(i.indpred, i.indrelid, true) AS predicate,
    pg_get_expr(i.indpred, i.indrelid, true) AS compact_normalized_predicate,
    (i.indrelid <> ic.oid OR EXISTS (SELECT 1 FROM pg_constraint cx WHERE cx.conindid = ic.oid)) AS constraint_backed,
    (SELECT cx.conname::text FROM pg_constraint cx WHERE cx.conindid = ic.oid LIMIT 1) AS constraint_name,
    pg_get_indexdef(ic.oid) AS definition
  FROM relation_catalog rc
  JOIN pg_index i ON i.indrelid = rc.relation_oid
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_am am ON am.oid = ic.relam
  WHERE rc.relation_oid IS NOT NULL
),
trigger_catalog AS (
  SELECT
    rc.relation_name,
    t.oid AS trigger_oid,
    t.tgname::text AS trigger_name,
    t.tgenabled::text AS enabled_state,
    t.tgisinternal AS is_internal,
    CASE WHEN t.tgisinternal THEN 'SYSTEM_INTERNAL' ELSE 'USER_VISIBLE' END AS trigger_classification,
    fn_ns.nspname::text AS function_schema,
    fn.proname::text AS function_name,
    pg_get_triggerdef(t.oid, true) AS definition
  FROM relation_catalog rc
  JOIN pg_trigger t ON t.tgrelid = rc.relation_oid
  JOIN pg_proc fn ON fn.oid = t.tgfoid
  JOIN pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace
  WHERE rc.relation_oid IS NOT NULL
),
function_catalog AS (
  SELECT
    def.function_name,
    def.identity_arguments,
    p.oid AS function_oid,
    n.nspname::text AS function_schema,
    p.proname::text AS resolved_name,
    pg_get_function_identity_arguments(p.oid)::text AS resolved_identity_arguments,
    pg_get_function_result(p.oid)::text AS result_type,
    pg_get_userbyid(p.proowner)::text AS owner_role,
    p.prosecdef AS security_definer,
    p.provolatile::text AS volatility,
    p.proparallel::text AS parallel_safety,
    p.proconfig,
    (
      SELECT setting FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) s(setting)
      WHERE s.setting LIKE 'search_path=%' LIMIT 1
    ) AS search_path,
    p.proacl,
    (
      SELECT count(*)::integer FROM pg_proc px
      JOIN pg_namespace nx ON nx.oid = px.pronamespace AND nx.nspname = 'public'
      WHERE px.proname = def.function_name
    ) AS overload_count,
    (
      SELECT count(*)::integer FROM pg_proc px
      JOIN pg_namespace nx ON nx.oid = px.pronamespace AND nx.nspname = 'public'
      WHERE px.proname = def.function_name
        AND pg_get_function_identity_arguments(px.oid) = def.identity_arguments
    ) AS exact_signature_count
  FROM dim_expected_functions def
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_proc p
    ON p.pronamespace = n.oid
   AND p.proname = def.function_name
   AND pg_get_function_identity_arguments(p.oid) = def.identity_arguments
),
function_acl_exploded AS (
  SELECT
    fc.function_name,
    fc.function_oid,
    acl.grantee,
    acl.privilege_type,
    acl.is_grantable,
    pg_get_userbyid(acl.grantor)::text AS grantor_role_name
  FROM function_catalog fc
  JOIN pg_proc p ON p.oid = fc.function_oid
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
  WHERE fc.function_oid IS NOT NULL
),
function_acl_public AS (
  SELECT function_name, function_oid, true AS public_execute
  FROM function_acl_exploded
  WHERE grantee = 0 AND privilege_type = 'EXECUTE'
  GROUP BY function_name, function_oid
),
column_catalog AS (
  SELECT
    rc.relation_name,
    a.attnum AS ordinal_position,
    a.attname::text AS column_name,
    format_type(a.atttypid, a.atttypmod) AS data_type,
    format_type(col_t.typbasetype, col_t.typtypmod) AS underlying_base_type,
    CASE WHEN col_t.typtype = 'd' THEN nt.nspname::text ELSE NULL END AS domain_schema,
    CASE WHEN col_t.typtype = 'd' THEN col_t.typname::text ELSE NULL END AS domain_name,
    (NOT a.attnotnull) AS is_nullable,
    pg_get_expr(ad.adbin, ad.adrelid) AS default_expression,
    (ad.adbin IS NOT NULL) AS default_present,
    CASE a.attidentity WHEN 'a' THEN 'ALWAYS' WHEN 'd' THEN 'BY DEFAULT' ELSE NULL END AS identity,
    CASE a.attgenerated WHEN 's' THEN 'STORED' WHEN 'v' THEN 'VIRTUAL' ELSE NULL END AS generated,
    coll.collname::text AS collation,
    a.attcompression::text AS compression
  FROM relation_catalog rc
  JOIN pg_attribute a ON a.attrelid = rc.relation_oid AND a.attnum > 0 AND NOT a.attisdropped
  JOIN pg_type col_t ON col_t.oid = a.atttypid
  LEFT JOIN pg_namespace nt ON nt.oid = col_t.typnamespace
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  LEFT JOIN pg_collation coll ON coll.oid = a.attcollation
  WHERE rc.relation_oid IS NOT NULL
),
wallet_column_catalog AS (
  SELECT
    cc.*
  FROM column_catalog cc
  WHERE cc.relation_name = 'reply_ticket_wallets'
    AND cc.column_name = 'report_instance_id'
),
wallet_user_id_unique_inventory AS (
  SELECT
    cx.conname::text AS object_name,
    'constraint'::text AS object_kind,
    cx.oid AS object_oid,
    cx.contype::text AS constraint_type,
    (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(cx.conkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = cx.conrelid AND a.attnum = u.attnum
    ) AS key_columns
  FROM relation_catalog rc
  JOIN pg_constraint cx ON cx.conrelid = rc.relation_oid AND cx.contype IN ('u', 'p')
  WHERE rc.relation_name = 'reply_ticket_wallets' AND rc.relation_oid IS NOT NULL
  UNION ALL
  SELECT
    ic.relname::text,
    'index'::text,
    ic.oid,
    NULL::text,
    (
      SELECT array_agg(
        CASE
          WHEN u.attnum = 0 THEN pg_get_indexdef(i.indexrelid, u.ord::integer, true)
          ELSE a.attname::text
        END
        ORDER BY u.ord
      )
      FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
      LEFT JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = u.attnum
       AND u.attnum > 0
      WHERE u.ord BETWEEN 1 AND i.indnatts
        AND u.ord <= i.indnkeyatts
        AND (u.attnum = 0 OR NOT a.attisdropped)
    )
  FROM relation_catalog rc
  JOIN pg_index i ON i.indrelid = rc.relation_oid AND i.indisunique
  JOIN pg_class ic ON ic.oid = i.indexrelid
  WHERE rc.relation_name = 'reply_ticket_wallets' AND rc.relation_oid IS NOT NULL
),
wallet_scoped_unique_inventory AS (
  SELECT
    'constraint'::text AS object_kind,
    cx.conname::text AS object_name,
    cx.oid AS object_oid,
    (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(cx.conkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = cx.conrelid AND a.attnum = u.attnum
    ) AS key_columns,
    NULL::text AS predicate,
    ARRAY[]::text[] AS included_columns,
    cx.convalidated AS is_valid,
    true AS is_ready,
    true AS is_live,
    true AS constraint_backed
  FROM relation_catalog rc
  JOIN pg_constraint cx ON cx.conrelid = rc.relation_oid AND cx.contype IN ('u', 'p')
  WHERE rc.relation_name = 'reply_ticket_wallets'
    AND rc.relation_oid IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM unnest(cx.conkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = cx.conrelid AND a.attnum = u.attnum
      WHERE a.attname IN ('user_id', 'report_instance_id')
    )
  UNION ALL
  SELECT
    'index'::text,
    ic.relname::text,
    ic.oid,
    (
      SELECT array_agg(
        CASE
          WHEN u.attnum = 0 THEN pg_get_indexdef(i.indexrelid, u.ord::integer, true)
          ELSE a.attname::text
        END
        ORDER BY u.ord
      )
      FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
      LEFT JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = u.attnum
       AND u.attnum > 0
      WHERE u.ord BETWEEN 1 AND i.indnatts
        AND u.ord <= i.indnkeyatts
        AND (u.attnum = 0 OR NOT a.attisdropped)
    ),
    pg_get_expr(i.indpred, i.indrelid, true),
    (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a
        ON a.attrelid = i.indrelid
       AND a.attnum = u.attnum
       AND u.attnum > 0
      WHERE u.ord BETWEEN 1 AND i.indnatts
        AND u.ord > i.indnkeyatts
        AND NOT a.attisdropped
    ),
    i.indisvalid,
    i.indisready,
    i.indislive,
    EXISTS (SELECT 1 FROM pg_constraint cx WHERE cx.conindid = ic.oid)
  FROM relation_catalog rc
  JOIN pg_index i ON i.indrelid = rc.relation_oid
  JOIN pg_class ic ON ic.oid = i.indexrelid
  WHERE rc.relation_name = 'reply_ticket_wallets'
    AND rc.relation_oid IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = rc.relation_oid AND a.attnum = u.attnum
        WHERE a.attname IN ('user_id', 'report_instance_id')
      )
    )
),
-- ── category_cells: relation_security (45) ───────────────────────────────────
relation_security_cells AS (
  SELECT
    CASE dsa.aspect_name
      WHEN 'owner' THEN 'owner.' || rc.relation_name
      WHEN 'rls' THEN 'rls.' || rc.relation_name
      ELSE 'force_rls.' || rc.relation_name
    END AS cell_id,
    'relation_security'::text AS category,
    'public'::text AS schema_name,
    rc.relation_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'aspect', dsa.aspect_name,
      'relation_oid', rc.relation_oid,
      'relation_exists', rc.relation_exists,
      'relkind', rc.relkind,
      'owner_oid', rc.owner_oid,
      'owner_role', rc.owner_role,
      'relrowsecurity', rc.relrowsecurity,
      'relforcerowsecurity', rc.relforcerowsecurity,
      'relpersistence', rc.relpersistence,
      'aspect_value',
        CASE dsa.aspect_name
          WHEN 'owner' THEN to_jsonb(rc.owner_role)
          WHEN 'rls' THEN to_jsonb(rc.relrowsecurity)
          ELSE to_jsonb(rc.relforcerowsecurity)
        END
    ) AS actual_json,
    CASE WHEN rc.relation_exists THEN 'RESOLVED' ELSE 'UNRESOLVED' END AS resolution_state,
    CASE WHEN rc.relation_exists THEN NULL ELSE 'relation_missing' END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM relation_catalog rc
  CROSS JOIN dim_security_aspects dsa
),
-- ── category_cells: privilege (420) ──────────────────────────────────────────
privilege_eval_base AS (
  SELECT
    rc.relation_name,
    rc.relation_oid,
    rc.relation_exists,
    ro.role_name,
    ro.role_exists_or_public_pseudo_role,
    pr.privilege_name,
    'priv.' || rc.relation_name || '.' || ro.role_name || '.' || pr.privilege_name AS cell_id
  FROM relation_catalog rc
  CROSS JOIN role_catalog ro
  CROSS JOIN dim_privileges pr
),
privilege_cells AS (
  SELECT
    peb.cell_id,
    'privilege'::text AS category,
    'public'::text AS schema_name,
    peb.relation_name AS object_name,
    peb.role_name,
    peb.privilege_name,
    jsonb_build_object(
      'relation_exists', peb.relation_exists,
      'role_exists_or_public_pseudo_role', peb.role_exists_or_public_pseudo_role,
      'effective_privilege',
        CASE
          WHEN NOT peb.relation_exists THEN NULL
          WHEN peb.role_name <> 'PUBLIC' AND NOT peb.role_exists_or_public_pseudo_role THEN NULL
          WHEN peb.role_name = 'PUBLIC' THEN COALESCE(tap.explicit_grant_present, false)
          WHEN peb.relation_oid IS NOT NULL AND peb.role_exists_or_public_pseudo_role
            THEN has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name)
          ELSE NULL
        END,
      'explicit_grant_present',
        CASE
          WHEN peb.role_name = 'PUBLIC' THEN COALESCE(tap.explicit_grant_present, false)
          ELSE COALESCE(tdr.direct_explicit_grant, false)
        END,
      'explicit_grant_is_grantable',
        CASE
          WHEN peb.role_name = 'PUBLIC' THEN tap.explicit_grant_is_grantable
          ELSE tdr.explicit_grant_is_grantable
        END,
      'grantors',
        CASE
          WHEN peb.role_name = 'PUBLIC' THEN COALESCE(tap.grantors, ARRAY[]::text[])
          ELSE COALESCE(tdr.grantors, ARRAY[]::text[])
        END,
      'inherited_via_public',
        CASE
          WHEN peb.role_name = 'PUBLIC' THEN false
          WHEN peb.relation_oid IS NULL OR NOT peb.role_exists_or_public_pseudo_role THEN NULL
          WHEN COALESCE(tdr.direct_explicit_grant, false) THEN false
          WHEN COALESCE(tap_pub.explicit_grant_present, false)
            AND has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name) THEN true
          ELSE false
        END,
      'inherited_via_role_membership',
        CASE
          WHEN peb.role_name = 'PUBLIC' THEN false
          WHEN peb.relation_oid IS NULL OR NOT peb.role_exists_or_public_pseudo_role THEN NULL
          WHEN COALESCE(tdr.direct_explicit_grant, false) THEN false
          WHEN COALESCE(tap_pub.explicit_grant_present, false)
            AND has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name) THEN false
          WHEN has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name) THEN true
          ELSE false
        END,
      'source_state_known',
        CASE
          WHEN NOT peb.relation_exists THEN false
          WHEN peb.role_name <> 'PUBLIC' AND NOT peb.role_exists_or_public_pseudo_role THEN false
          WHEN peb.role_name = 'PUBLIC' THEN true
          WHEN peb.relation_oid IS NOT NULL
            AND peb.role_exists_or_public_pseudo_role
            AND has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name) IS NOT NULL
            THEN true
          ELSE false
        END
    ) AS actual_json,
    CASE
      WHEN NOT peb.relation_exists THEN 'UNRESOLVED'
      WHEN peb.role_name <> 'PUBLIC' AND NOT peb.role_exists_or_public_pseudo_role THEN 'UNRESOLVED'
      WHEN peb.role_name = 'PUBLIC' THEN 'RESOLVED'
      WHEN peb.relation_oid IS NOT NULL
        AND peb.role_exists_or_public_pseudo_role
        AND has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name) IS NOT NULL
        THEN 'RESOLVED'
      ELSE 'UNRESOLVED'
    END AS resolution_state,
    CASE
      WHEN NOT peb.relation_exists THEN 'relation_missing'
      WHEN peb.role_name <> 'PUBLIC' AND NOT peb.role_exists_or_public_pseudo_role THEN 'role_missing'
      WHEN peb.role_name <> 'PUBLIC'
        AND (peb.relation_oid IS NULL OR NOT peb.role_exists_or_public_pseudo_role
          OR has_table_privilege(peb.role_name, peb.relation_oid, peb.privilege_name) IS NULL)
        THEN 'privilege_eval_unknown'
      ELSE NULL
    END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM privilege_eval_base peb
  LEFT JOIN table_acl_public tap
    ON tap.relation_name = peb.relation_name AND tap.privilege_type = peb.privilege_name
  LEFT JOIN table_acl_direct_role tdr
    ON tdr.relation_name = peb.relation_name
   AND tdr.role_name = peb.role_name
   AND tdr.privilege_type = peb.privilege_name
  LEFT JOIN table_acl_public tap_pub
    ON tap_pub.relation_name = peb.relation_name AND tap_pub.privilege_type = peb.privilege_name
),
-- ── category_cells: wallet_scope (5) ───────────────────────────────────────────
wallet_scope_cells AS (
  SELECT
    dwc.cell_id,
    'wallet_scope'::text AS category,
    'public'::text AS schema_name,
    'reply_ticket_wallets'::text AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    CASE dwc.wallet_field
      WHEN 'report_instance_id.data_type' THEN jsonb_build_object(
        'column_exists', (wcc.column_name IS NOT NULL),
        'data_type', wcc.data_type,
        'underlying_base_type', wcc.underlying_base_type,
        'domain_schema', wcc.domain_schema,
        'domain_name', wcc.domain_name
      )
      WHEN 'report_instance_id.is_nullable' THEN jsonb_build_object(
        'column_exists', (wcc.column_name IS NOT NULL),
        'is_nullable', wcc.is_nullable
      )
      WHEN 'report_instance_id.column_default' THEN jsonb_build_object(
        'column_exists', (wcc.column_name IS NOT NULL),
        'default_present', COALESCE(wcc.default_present, false),
        'default_expression', wcc.default_expression,
        'default_absent', CASE WHEN wcc.column_name IS NULL THEN NULL ELSE NOT COALESCE(wcc.default_present, false) END
      )
      WHEN 'user_id_unique_constraint_state' THEN jsonb_build_object(
        'state',
          CASE
            WHEN NOT rc.relation_exists THEN NULL
            WHEN (SELECT count(*) FROM wallet_user_id_unique_inventory w WHERE w.key_columns = ARRAY['user_id']::text[]) = 0 THEN 'absent'
            WHEN (SELECT count(*) FROM wallet_user_id_unique_inventory w WHERE w.key_columns = ARRAY['user_id']::text[]) = 1 THEN 'exact_one'
            WHEN (SELECT count(*) FROM wallet_user_id_unique_inventory w WHERE w.key_columns = ARRAY['user_id']::text[]) > 1 THEN 'duplicate'
            ELSE 'malformed'
          END,
        'inventory', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'object_kind', w.object_kind,
            'object_name', w.object_name,
            'object_oid', w.object_oid,
            'key_columns', w.key_columns
          ) ORDER BY w.object_kind, w.object_name)
          FROM wallet_user_id_unique_inventory w
          WHERE w.key_columns = ARRAY['user_id']::text[] OR w.key_columns IS NULL
        ), '[]'::jsonb)
      )
      ELSE jsonb_build_object(
        'inventory', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'object_kind', w.object_kind,
            'object_name', w.object_name,
            'object_oid', w.object_oid,
            'key_columns', w.key_columns,
            'predicate', w.predicate,
            'included_columns', w.included_columns,
            'is_valid', w.is_valid,
            'is_ready', w.is_ready,
            'is_live', w.is_live,
            'constraint_backed', w.constraint_backed
          ) ORDER BY w.object_kind, w.object_name)
          FROM wallet_scoped_unique_inventory w
        ), '[]'::jsonb)
      )
    END AS actual_json,
    CASE
      WHEN NOT rc.relation_exists THEN 'UNRESOLVED'
      WHEN dwc.wallet_field LIKE 'report_instance_id.%' AND wcc.column_name IS NULL THEN 'UNRESOLVED'
      ELSE 'RESOLVED'
    END AS resolution_state,
    CASE
      WHEN NOT rc.relation_exists THEN 'relation_missing'
      WHEN dwc.wallet_field LIKE 'report_instance_id.%' AND wcc.column_name IS NULL THEN 'column_missing'
      ELSE NULL
    END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM dim_wallet_cells dwc
  CROSS JOIN relation_catalog rc
  LEFT JOIN wallet_column_catalog wcc ON rc.relation_name = 'reply_ticket_wallets'
  WHERE rc.relation_name = 'reply_ticket_wallets'
),
-- ── category_cells: inventory obligations (66) ─────────────────────────────────
policy_inventory_cells AS (
  SELECT
    'policy_inventory.' || rc.relation_name AS cell_id,
    'policy_inventory'::text AS category,
    'public'::text AS schema_name,
    rc.relation_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'policies', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'policy_oid', pc.policy_oid,
          'policy_name', pc.policy_name,
          'command', pc.command,
          'permissive_restrictive', pc.permissive_restrictive,
          'roles', pc.roles,
          'using_expression', pc.using_expression,
          'with_check_expression', pc.with_check_expression
        ) ORDER BY pc.policy_name)
        FROM policy_catalog pc
        WHERE pc.relation_name = rc.relation_name
      ), '[]'::jsonb)
    ) AS actual_json,
    CASE WHEN rc.relation_exists THEN 'RESOLVED' ELSE 'UNRESOLVED' END AS resolution_state,
    CASE WHEN rc.relation_exists THEN NULL ELSE 'relation_missing' END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM relation_catalog rc
),
constraint_inventory_cells AS (
  SELECT
    'constraint_inventory.' || rc.relation_name AS cell_id,
    'constraint_inventory'::text AS category,
    'public'::text AS schema_name,
    rc.relation_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'constraints', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'constraint_oid', cc.constraint_oid,
          'constraint_name', cc.constraint_name,
          'constraint_type', cc.constraint_type,
          'source_columns', cc.source_columns,
          'target_schema', cc.target_schema,
          'target_relation', cc.target_relation,
          'target_columns', cc.target_columns,
          'update_action', cc.update_action,
          'delete_action', cc.delete_action,
          'match_type', cc.match_type,
          'validated', cc.validated,
          'deferrable', cc.deferrable,
          'initially_deferred', cc.initially_deferred,
          'backing_index_oid', cc.backing_index_oid,
          'definition', cc.definition
        ) ORDER BY cc.constraint_name)
        FROM constraint_catalog cc
        WHERE cc.relation_name = rc.relation_name
      ), '[]'::jsonb)
    ) AS actual_json,
    CASE WHEN rc.relation_exists THEN 'RESOLVED' ELSE 'UNRESOLVED' END AS resolution_state,
    CASE WHEN rc.relation_exists THEN NULL ELSE 'relation_missing' END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM relation_catalog rc
),
index_inventory_cells AS (
  SELECT
    'index_inventory.' || rc.relation_name AS cell_id,
    'index_inventory'::text AS category,
    'public'::text AS schema_name,
    rc.relation_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'indexes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'index_oid', ic.index_oid,
          'index_name', ic.index_name,
          'access_method', ic.access_method,
          'is_primary', ic.is_primary,
          'is_unique', ic.is_unique,
          'is_valid', ic.is_valid,
          'is_ready', ic.is_ready,
          'is_live', ic.is_live,
          'key_count', ic.key_count,
          'attribute_count', ic.attribute_count,
          'key_columns', ic.key_columns,
          'included_columns', ic.included_columns,
          'key_expression_count', ic.key_expression_count,
          'predicate', ic.predicate,
          'compact_normalized_predicate', ic.compact_normalized_predicate,
          'constraint_backed', ic.constraint_backed,
          'constraint_name', ic.constraint_name,
          'definition', ic.definition
        ) ORDER BY ic.index_name)
        FROM index_catalog ic
        WHERE ic.relation_name = rc.relation_name
      ), '[]'::jsonb)
    ) AS actual_json,
    CASE WHEN rc.relation_exists THEN 'RESOLVED' ELSE 'UNRESOLVED' END AS resolution_state,
    CASE WHEN rc.relation_exists THEN NULL ELSE 'relation_missing' END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM relation_catalog rc
),
trigger_inventory_cells AS (
  SELECT
    'trigger_inventory.' || rc.relation_name AS cell_id,
    'trigger_inventory'::text AS category,
    'public'::text AS schema_name,
    rc.relation_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'triggers', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'trigger_oid', tc.trigger_oid,
          'trigger_name', tc.trigger_name,
          'enabled_state', tc.enabled_state,
          'is_internal', tc.is_internal,
          'trigger_classification', tc.trigger_classification,
          'function_schema', tc.function_schema,
          'function_name', tc.function_name,
          'definition', tc.definition
        ) ORDER BY tc.is_internal, tc.trigger_name)
        FROM trigger_catalog tc
        WHERE tc.relation_name = rc.relation_name
      ), '[]'::jsonb)
    ) AS actual_json,
    CASE WHEN rc.relation_exists THEN 'RESOLVED' ELSE 'UNRESOLVED' END AS resolution_state,
    CASE WHEN rc.relation_exists THEN NULL ELSE 'relation_missing' END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM relation_catalog rc
),
function_inventory_cells AS (
  SELECT
    'function_inventory.' || fc.function_name AS cell_id,
    'function_inventory'::text AS category,
    'public'::text AS schema_name,
    fc.function_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'function_oid', fc.function_oid,
      'function_schema', fc.function_schema,
      'function_name', fc.function_name,
      'identity_arguments', fc.identity_arguments,
      'resolved_identity_arguments', fc.resolved_identity_arguments,
      'result_type', fc.result_type,
      'owner_role', fc.owner_role,
      'security_definer', fc.security_definer,
      'volatility', fc.volatility,
      'parallel_safety', fc.parallel_safety,
      'proconfig', fc.proconfig,
      'search_path', fc.search_path,
      'overload_count', fc.overload_count,
      'exact_signature_count', fc.exact_signature_count,
      'service_role_execute',
        CASE WHEN fc.function_oid IS NULL THEN NULL
             WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
               THEN has_function_privilege('service_role', fc.function_oid, 'EXECUTE')
             ELSE NULL END,
      'anon_execute',
        CASE WHEN fc.function_oid IS NULL THEN NULL
             WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
               THEN has_function_privilege('anon', fc.function_oid, 'EXECUTE')
             ELSE NULL END,
      'authenticated_execute',
        CASE WHEN fc.function_oid IS NULL THEN NULL
             WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
               THEN has_function_privilege('authenticated', fc.function_oid, 'EXECUTE')
             ELSE NULL END,
      'public_execute', COALESCE(fap.public_execute, false),
      'definition_hash_algorithm', CASE WHEN fc.function_oid IS NULL THEN NULL ELSE 'md5' END,
      'definition_hash', CASE WHEN fc.function_oid IS NULL THEN NULL ELSE md5(pg_get_functiondef(fc.function_oid)) END,
      'definition_length', CASE WHEN fc.function_oid IS NULL THEN NULL ELSE length(pg_get_functiondef(fc.function_oid)) END
    ) AS actual_json,
    CASE
      WHEN fc.exact_signature_count = 0 THEN 'UNRESOLVED'
      WHEN fc.exact_signature_count > 1 THEN 'UNRESOLVED'
      WHEN fc.function_oid IS NULL THEN 'UNRESOLVED'
      ELSE 'RESOLVED'
    END AS resolution_state,
    CASE
      WHEN fc.exact_signature_count = 0 THEN 'function_signature_absent'
      WHEN fc.exact_signature_count > 1 THEN 'function_signature_ambiguous'
      WHEN fc.function_oid IS NULL THEN 'function_signature_absent'
      ELSE NULL
    END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM function_catalog fc
  LEFT JOIN function_acl_public fap
    ON fap.function_name = fc.function_name AND fap.function_oid = fc.function_oid
),
column_inventory_cells AS (
  SELECT
    'column_inventory.' || ct.relation_name AS cell_id,
    'column_inventory'::text AS category,
    'public'::text AS schema_name,
    ct.relation_name AS object_name,
    NULL::text AS role_name,
    NULL::text AS privilege_name,
    jsonb_build_object(
      'columns', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'ordinal_position', cc.ordinal_position,
          'column_name', cc.column_name,
          'data_type', cc.data_type,
          'underlying_base_type', cc.underlying_base_type,
          'domain_schema', cc.domain_schema,
          'domain_name', cc.domain_name,
          'is_nullable', cc.is_nullable,
          'default_expression', cc.default_expression,
          'default_present', cc.default_present,
          'identity', cc.identity,
          'generated', cc.generated,
          'collation', cc.collation,
          'compression', cc.compression
        ) ORDER BY cc.ordinal_position)
        FROM column_catalog cc
        WHERE cc.relation_name = ct.relation_name
      ), '[]'::jsonb)
    ) AS actual_json,
    CASE WHEN rc.relation_exists THEN 'RESOLVED' ELSE 'UNRESOLVED' END AS resolution_state,
    CASE WHEN rc.relation_exists THEN NULL ELSE 'relation_missing' END AS unresolved_reason,
    'pg_catalog'::text AS evidence_source
  FROM dim_column_targets ct
  JOIN relation_catalog rc ON rc.relation_name = ct.relation_name
),
-- ── gap_registry_canonical (536 UNION ALL) ─────────────────────────────────────
gap_registry_canonical AS (
  SELECT * FROM relation_security_cells
  UNION ALL SELECT * FROM privilege_cells
  UNION ALL SELECT * FROM wallet_scope_cells
  UNION ALL SELECT * FROM policy_inventory_cells
  UNION ALL SELECT * FROM constraint_inventory_cells
  UNION ALL SELECT * FROM index_inventory_cells
  UNION ALL SELECT * FROM trigger_inventory_cells
  UNION ALL SELECT * FROM function_inventory_cells
  UNION ALL SELECT * FROM column_inventory_cells
),
-- ── registry_integrity ───────────────────────────────────────────────────────
registry_integrity AS (
  SELECT
    count(*)::integer AS requested_gap_cell_count,
    count(*) FILTER (WHERE resolution_state = 'RESOLVED')::integer AS resolved_gap_cell_count,
    count(*) FILTER (WHERE resolution_state = 'UNRESOLVED')::integer AS unresolved_gap_cell_count,
    (count(*) - count(DISTINCT cell_id))::integer AS duplicate_gap_cell_count,
    (
      SELECT count(*)::integer
      FROM dim_expected_cell_ids e
      WHERE NOT EXISTS (SELECT 1 FROM gap_registry_canonical g WHERE g.cell_id = e.cell_id)
    ) AS missing_registry_cell_count,
    (
      SELECT count(*)::integer
      FROM gap_registry_canonical g
      WHERE NOT EXISTS (SELECT 1 FROM dim_expected_cell_ids e WHERE e.cell_id = g.cell_id)
    ) AS unexpected_registry_cell_count
  FROM gap_registry_canonical
),
registry_self_check AS (
  SELECT
    iec.independent_expected_count,
    ri.requested_gap_cell_count,
    ri.duplicate_gap_cell_count,
    ri.unexpected_registry_cell_count,
    (
      ri.requested_gap_cell_count = 536
      AND iec.independent_expected_count = 536
      AND ri.requested_gap_cell_count = iec.independent_expected_count
      AND ri.duplicate_gap_cell_count = 0
      AND ri.unexpected_registry_cell_count = 0
    ) AS registry_self_check_ok
  FROM registry_integrity ri
  CROSS JOIN independent_expected_count_expr iec
),
-- ── expected_contract_analysis (classifier-aligned) ──────────────────────────
expected_dtr_partial_unique(index_name, key_columns, raw_predicate) AS (
  VALUES (
    'dtr_report_snapshots_one_visible_per_user_product_uq'::text,
    ARRAY['user_id','product_id']::text[],
    'user_hidden_at IS NULL'::text
  )
),
expected_ledger_indexes(index_name, key_columns, raw_predicate) AS (
  VALUES
    ('idx_reply_wallet_ledgers_wallet_created'::text, ARRAY['wallet_id','created_at']::text[], NULL::text),
    ('idx_reply_wallet_ledgers_user_created'::text, ARRAY['user_id','created_at']::text[], NULL::text),
    ('idx_reply_wallet_ledgers_session'::text, ARRAY['reply_session_id']::text[], 'reply_session_id IS NOT NULL'::text)
),
expected_stripe_processed_indexes(index_name, key_columns, raw_predicate) AS (
  VALUES (
    'idx_stripe_processed_events_stripe_event_id_unique_not_null'::text,
    ARRAY['stripe_event_id']::text[],
    'stripe_event_id IS NOT NULL'::text
  )
),
allowed_stripe_processed_redundant(index_name) AS (
  VALUES ('m55_uidx_stripe_processed_events_stripe_event_id'::text)
),
expected_entitlements_unique(index_name, key_columns) AS (
  VALUES ('entitlements_user_id_product_key_unique'::text, ARRAY['user_id','product_key']::text[])
),
known_absent_objects(object_key, object_kind) AS (
  VALUES
    ('public.purchases'::text, 'table'),
    ('public.subscriptions', 'table'),
    ('public.invoice_dtr_grants', 'table'),
    ('public.m55_user_identity_mappings', 'table'),
    ('public.clerk_webhook_events', 'table'),
    ('public.m55_account_deletion_process_v1(text,text,text,text)', 'function'),
    ('public.failed_fulfillments.user_ref_hash', 'column'),
    ('failed_fulfillments_user_ref_hash_format_check', 'check'),
    ('idx_failed_fulfillments_user_ref_hash', 'index'),
    ('app.user_profiles', 'table')
),
known_absent_actual AS (
  SELECT
    ka.object_key,
    ka.object_kind,
    CASE ka.object_kind
      WHEN 'table' THEN NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE (n.nspname || '.' || c.relname) = ka.object_key
           OR (ka.object_key = 'app.user_profiles' AND n.nspname = 'app' AND c.relname = 'user_profiles')
      )
      WHEN 'function' THEN NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'm55_account_deletion_process_v1'
      )
      WHEN 'column' THEN NOT EXISTS (
        SELECT 1 FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'failed_fulfillments'
          AND a.attname = 'user_ref_hash' AND NOT a.attisdropped
      )
      WHEN 'check' THEN NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'failed_fulfillments'
          AND con.conname = 'failed_fulfillments_user_ref_hash_format_check'
      )
      WHEN 'index' THEN NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'idx_failed_fulfillments_user_ref_hash'
      )
      ELSE NULL
    END AS is_absent
  FROM known_absent_objects ka
),
dtr_partial_unique_actual AS (
  SELECT ic.index_name, ic.key_columns, ic.predicate, ic.is_unique, ic.is_valid
  FROM index_catalog ic
  WHERE ic.relation_name = 'dtr_report_snapshots'
    AND ic.is_unique
    AND ic.key_columns = ARRAY['user_id','product_id']::text[]
),
dtr_partial_unique_mismatch AS (
  SELECT jsonb_build_object(
    'mismatch_kind', 'dtr_visible_partial_unique',
    'expected_index', e.index_name,
    'expected_key_columns', e.key_columns,
    'expected_predicate', e.raw_predicate,
    'actual_matches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'index_name', a.index_name,
        'predicate', a.predicate,
        'is_valid', a.is_valid
      ) ORDER BY a.index_name)
      FROM dtr_partial_unique_actual a
      WHERE a.predicate IS NOT DISTINCT FROM e.raw_predicate
    ), '[]'::jsonb),
    'remediation_status', 'COMMITTED_NOT_APPLIED_M2A'
  ) AS mismatch_item
  FROM expected_dtr_partial_unique e
  WHERE NOT EXISTS (
    SELECT 1 FROM dtr_partial_unique_actual a
    WHERE a.index_name = e.index_name
      AND a.predicate IS NOT DISTINCT FROM e.raw_predicate
      AND a.is_valid
  )
),
ledger_index_mismatch AS (
  SELECT jsonb_build_object(
    'mismatch_kind', 'ledger_critical_index',
    'expected_index', e.index_name,
    'expected_key_columns', e.key_columns,
    'expected_predicate', e.raw_predicate,
    'actual_present', EXISTS (
      SELECT 1 FROM index_catalog ic
      WHERE ic.relation_name = 'reply_wallet_ledgers'
        AND ic.index_name = e.index_name
        AND ic.key_columns = e.key_columns
        AND ic.predicate IS NOT DISTINCT FROM e.raw_predicate
    )
  ) AS mismatch_item
  FROM expected_ledger_indexes e
  WHERE NOT EXISTS (
    SELECT 1 FROM index_catalog ic
    WHERE ic.relation_name = 'reply_wallet_ledgers'
      AND ic.index_name = e.index_name
      AND ic.key_columns = e.key_columns
      AND ic.predicate IS NOT DISTINCT FROM e.raw_predicate
      AND ic.is_valid
  )
),
stripe_processed_index_mismatch AS (
  SELECT jsonb_build_object(
    'mismatch_kind', 'stripe_processed_index',
    'expected_index', e.index_name,
    'expected_key_columns', e.key_columns,
    'expected_predicate', e.raw_predicate,
    'actual_present', EXISTS (
      SELECT 1 FROM index_catalog ic
      WHERE ic.relation_name = 'stripe_processed_events'
        AND ic.index_name = e.index_name
    )
  ) AS mismatch_item
  FROM expected_stripe_processed_indexes e
  WHERE NOT EXISTS (
    SELECT 1 FROM index_catalog ic
    WHERE ic.relation_name = 'stripe_processed_events'
      AND ic.index_name = e.index_name
      AND ic.key_columns = e.key_columns
      AND ic.predicate IS NOT DISTINCT FROM e.raw_predicate
      AND ic.is_unique AND ic.is_valid
  )
),
entitlements_unique_mismatch AS (
  SELECT jsonb_build_object(
    'mismatch_kind', 'entitlements_unique',
    'expected_index', e.index_name,
    'expected_key_columns', e.key_columns,
    'actual_same_key_uniques', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'index_name', ic.index_name,
        'key_columns', ic.key_columns,
        'constraint_backed', ic.constraint_backed
      ) ORDER BY ic.index_name)
      FROM index_catalog ic
      WHERE ic.relation_name = 'entitlements'
        AND ic.is_unique
        AND ic.key_columns = e.key_columns
    ), '[]'::jsonb),
    'remediation_status', 'COMMITTED_NOT_APPLIED_M2B'
  ) AS mismatch_item
  FROM expected_entitlements_unique e
  WHERE (
    SELECT count(*) FROM index_catalog ic
    WHERE ic.relation_name = 'entitlements'
      AND ic.is_unique
      AND ic.key_columns = e.key_columns
      AND ic.is_valid
  ) <> 1
),
known_absent_mismatch AS (
  SELECT jsonb_build_object(
    'mismatch_kind', 'known_absent_violation',
    'object_key', ka.object_key,
    'object_kind', ka.object_kind,
    'expected_absent', true,
    'actual_absent', ka.is_absent
  ) AS mismatch_item
  FROM known_absent_actual ka
  WHERE ka.is_absent IS NOT TRUE
),
expected_contract_mismatch_items AS (
  SELECT mismatch_item FROM dtr_partial_unique_mismatch
  UNION ALL SELECT mismatch_item FROM ledger_index_mismatch
  UNION ALL SELECT mismatch_item FROM stripe_processed_index_mismatch
  UNION ALL SELECT mismatch_item FROM entitlements_unique_mismatch
  UNION ALL SELECT mismatch_item FROM known_absent_mismatch
),
expected_contract_mismatch_json_build AS (
  SELECT COALESCE(jsonb_agg(mismatch_item ORDER BY mismatch_item->>'mismatch_kind', mismatch_item->>'expected_index', mismatch_item->>'object_key'), '[]'::jsonb) AS expected_contract_mismatch_json
  FROM expected_contract_mismatch_items
),
-- ── unexpected_catalog_analysis ──────────────────────────────────────────────
unexpected_user_triggers AS (
  SELECT
    jsonb_build_object(
      'unexpected_kind', 'user_visible_trigger',
      'relation_name', tc.relation_name,
      'trigger_name', tc.trigger_name,
      'trigger_oid', tc.trigger_oid,
      'definition', tc.definition
    ) AS unexpected_item
  FROM trigger_catalog tc
  WHERE NOT tc.is_internal
),
unexpected_non_allowed_indexes AS (
  SELECT jsonb_build_object(
    'unexpected_kind', 'non_allowed_index',
    'relation_name', ic.relation_name,
    'index_name', ic.index_name,
    'key_columns', ic.key_columns,
    'predicate', ic.predicate
  ) AS unexpected_item
  FROM index_catalog ic
  WHERE ic.relation_name = 'stripe_processed_events'
    AND ic.is_unique
    AND ic.index_name NOT IN (SELECT index_name FROM expected_stripe_processed_indexes)
    AND ic.index_name NOT IN (SELECT index_name FROM allowed_stripe_processed_redundant)
    AND NOT (ic.key_columns = ARRAY['stripe_event_id']::text[] AND ic.predicate IS NOT DISTINCT FROM 'stripe_event_id IS NOT NULL')
),
unexpected_catalog_items AS (
  SELECT unexpected_item FROM unexpected_user_triggers
  UNION ALL SELECT unexpected_item FROM unexpected_non_allowed_indexes
),
unexpected_catalog_analysis AS (
  SELECT
    count(*)::integer AS unexpected_catalog_item_count,
    COALESCE(jsonb_agg(unexpected_item ORDER BY unexpected_item->>'unexpected_kind', unexpected_item->>'relation_name', unexpected_item->>'index_name', unexpected_item->>'trigger_name'), '[]'::jsonb) AS unexpected_catalog_items_json
  FROM unexpected_catalog_items
),
-- ── json_aggregations ────────────────────────────────────────────────────────
json_aggregations AS (
  SELECT
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'relation_security'), '[]'::jsonb) AS relation_security_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'privilege'), '[]'::jsonb) AS privilege_contract_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'policy_inventory'), '[]'::jsonb) AS policy_inventory_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'column_inventory'), '[]'::jsonb) AS column_inventory_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'constraint_inventory'), '[]'::jsonb) AS constraint_inventory_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'index_inventory'), '[]'::jsonb) AS index_inventory_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'trigger_inventory'), '[]'::jsonb) AS trigger_inventory_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'function_inventory'), '[]'::jsonb) AS function_inventory_json,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.cell_id) FROM gap_registry_canonical g WHERE g.category = 'wallet_scope'), '[]'::jsonb) AS wallet_scope_json,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'cell_id', g.cell_id,
        'category', g.category,
        'unresolved_reason', g.unresolved_reason,
        'actual_json', g.actual_json
      ) ORDER BY g.cell_id)
      FROM gap_registry_canonical g
      WHERE g.resolution_state = 'UNRESOLVED'
    ), '[]'::jsonb) AS missing_or_unknown_json
),
-- ── final_summary ────────────────────────────────────────────────────────────
final_summary AS (
  SELECT
    'SQL-DIAGNOSTIC-REVISION-1-PATCH-2'::text AS diagnostic_revision,
    'm55-soul'::text AS target_organization,
    'm55-soul-core'::text AS target_project,
    'PRODUCTION'::text AS target_environment,
    'Primary Database'::text AS target_source,
    536::integer AS expected_registry_row_count,
    rsc.independent_expected_count,
    rsc.registry_self_check_ok,
    ri.requested_gap_cell_count,
    ri.resolved_gap_cell_count,
    ri.unresolved_gap_cell_count,
    ri.duplicate_gap_cell_count,
    ri.unexpected_registry_cell_count,
    COALESCE(uca.unexpected_catalog_item_count, 0) AS unexpected_catalog_item_count,
    ja.relation_security_json,
    ja.privilege_contract_json,
    ja.policy_inventory_json,
    ja.column_inventory_json,
    ja.constraint_inventory_json,
    ja.index_inventory_json,
    ja.trigger_inventory_json,
    ja.function_inventory_json,
    ja.wallet_scope_json,
    ecm.expected_contract_mismatch_json,
    COALESCE(uca.unexpected_catalog_items_json, '[]'::jsonb) AS unexpected_catalog_items_json,
    ja.missing_or_unknown_json,
    (
      ri.requested_gap_cell_count > 0
      AND ri.resolved_gap_cell_count = ri.requested_gap_cell_count
      AND ri.unresolved_gap_cell_count = 0
      AND ri.duplicate_gap_cell_count = 0
      AND COALESCE(uca.unexpected_catalog_item_count, 0) = 0
      AND rsc.registry_self_check_ok IS TRUE
    ) AS catalog_snapshot_complete,
    CASE
      WHEN rsc.registry_self_check_ok IS NOT TRUE THEN 'REGISTRY_SELF_CHECK_FAILED'
      WHEN ri.unresolved_gap_cell_count > 0 THEN 'UNRESOLVED_GAP_CELLS'
      WHEN COALESCE(uca.unexpected_catalog_item_count, 0) > 0 THEN 'UNEXPECTED_CATALOG_ITEMS'
      ELSE 'CATALOG_SNAPSHOT_COMPLETE'
    END AS stop_reason,
    CASE
      WHEN (
        ri.requested_gap_cell_count > 0
        AND ri.resolved_gap_cell_count = ri.requested_gap_cell_count
        AND ri.unresolved_gap_cell_count = 0
        AND ri.duplicate_gap_cell_count = 0
        AND COALESCE(uca.unexpected_catalog_item_count, 0) = 0
        AND rsc.registry_self_check_ok IS TRUE
      ) IS TRUE
        THEN 'CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-HUMAN-RESULT-REVIEW'
      ELSE 'CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-REMEDIATION-PLANNING'
    END AS next_gate_recommendation
  FROM registry_integrity ri
  CROSS JOIN registry_self_check rsc
  CROSS JOIN json_aggregations ja
  CROSS JOIN expected_contract_mismatch_json_build ecm
  LEFT JOIN unexpected_catalog_analysis uca ON true
)
SELECT
  fs.diagnostic_revision,
  fs.target_organization,
  fs.target_project,
  fs.target_environment,
  fs.target_source,
  fs.expected_registry_row_count,
  fs.independent_expected_count,
  fs.registry_self_check_ok,
  fs.requested_gap_cell_count,
  fs.resolved_gap_cell_count,
  fs.unresolved_gap_cell_count,
  fs.duplicate_gap_cell_count,
  fs.unexpected_registry_cell_count,
  fs.unexpected_catalog_item_count,
  fs.relation_security_json,
  fs.privilege_contract_json,
  fs.policy_inventory_json,
  fs.column_inventory_json,
  fs.constraint_inventory_json,
  fs.index_inventory_json,
  fs.trigger_inventory_json,
  fs.function_inventory_json,
  fs.wallet_scope_json,
  fs.expected_contract_mismatch_json,
  fs.unexpected_catalog_items_json,
  fs.missing_or_unknown_json,
  fs.catalog_snapshot_complete,
  fs.stop_reason,
  fs.next_gate_recommendation
FROM final_summary fs;

-- =============================================================================
-- ARTIFACT INTEGRITY FOOTER
-- artifact_gate: CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-SQL-LOCAL-PATCH-2
-- revision: SQL-DIAGNOSTIC-REVISION-1-PATCH-2
-- target: m55-soul / m55-soul-core PRODUCTION postgres (Primary Database / role postgres)
-- preview_stop: m55-preview / m55-soul-preview — Human STOP immediately; do not execute
-- registry: 536 cells (45 relation_security + 420 privilege + 5 wallet_scope + 66 inventory)
-- independent_expected_count: (15*3)+(15*4*7)+5+(15*4)+2+4 = 536
-- next_gate: CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-GAP-DIAGNOSTIC-SQL-LOCAL-PATCH-2-REVIEW
-- forbidden: Preview SQL, DDL/DML, application row SELECT, secrets in output
-- =============================================================================
