-- =============================================================================
-- M55 ACCOUNT DELETION — PRODUCTION BASELINE CONTRACT FREEZE v1
-- Gate: CATEGORY-1-M55-ACCOUNT-DELETION-PREVIEW-DB-BASELINE-CONTRACT-FREEZE
-- Revision: SQL-REVISION-1-PATCH-6-PATCH-6 (stripe_events runtime id dependency resolved)
-- Target: Supabase Production safe label m55-soul-core ONLY (org m55-soul)
-- Forbidden: Preview DB, DDL/DML, SET ROLE, DO, CALL, COPY, application row SELECT
-- Allowed FROM: pg_catalog.*, information_schema.*, fixed VALUES allowlists
-- Run: section-by-section in Production SQL Editor; finish with P10-SUMMARY then P11-SELF-TEST
-- Human GREEN requires P10 production_catalog_contract_freeze_pass=true AND catalog_failed_flags={}
-- Baseline apply additionally requires P10 baseline_runtime_ready=true (after S1)
-- =============================================================================

-- =============================================================================
-- P0 — Human Production UI identity instruction (NO SQL EXECUTION)
-- =============================================================================
-- BEFORE ANY SECTION:
--   organization = m55-soul
--   project = m55-soul-core
--   branch = main
--   environment = PRODUCTION
--   Source = Primary Database
--   Role = postgres
-- Confirm Supabase Dashboard project selector matches Production scope.
-- STOP if Preview (m55-preview / m55-soul-preview) or any other project.
-- Do NOT paste secrets, DB URLs, service-role keys, or project ref into chat.
-- EXPECTED: Human sets production_project_ui_confirmed=true outside SQL.
-- =============================================================================

-- =============================================================================
-- P1 — Session identity and required roles
-- =============================================================================
SELECT current_database()::text AS current_database_name;
SELECT current_user::text AS current_user_name;
SELECT
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AS role_anon_exists,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AS role_authenticated_exists,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') AS role_service_role_exists,
  (
    EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
  ) AS required_roles_exist;

-- =============================================================================
-- P2 — Required 15 relation inventory (owner / relkind / RLS / persistence)
-- =============================================================================
WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
),
rel_meta AS (
  SELECT
    r.schema_name,
    r.relation_name,
    c.oid AS relation_oid,
    (c.oid IS NOT NULL) AS relation_exists,
    COALESCE(c.relkind::text, 'missing') AS relkind,
    (c.relkind = 'r') AS is_ordinary_table,
    COALESCE(c.relpersistence::text, 'missing') AS relpersistence,
    COALESCE(c.relrowsecurity, false) AS relrowsecurity,
    COALESCE(c.relforcerowsecurity, false) AS relforcerowsecurity,
    CASE WHEN c.oid IS NULL THEN NULL ELSE pg_get_userbyid(c.relowner)::text END AS owner_role,
    obj_description(c.oid, 'pg_class') AS relation_comment
  FROM required_rel r
  LEFT JOIN pg_namespace n ON n.nspname = r.schema_name
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
),
policy_counts AS (
  SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS relation_name,
    count(p.*)::integer AS policy_count
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE (n.nspname, c.relname) IN (SELECT schema_name, relation_name FROM required_rel)
  GROUP BY n.nspname, c.relname
),
trigger_counts AS (
  SELECT
    n.nspname::text AS schema_name,
    c.relname::text AS relation_name,
    count(tg.*)::integer AS trigger_count
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT tg.tgisinternal
    AND (n.nspname, c.relname) IN (SELECT schema_name, relation_name FROM required_rel)
  GROUP BY n.nspname, c.relname
)
SELECT
  m.schema_name,
  m.relation_name,
  m.relation_oid,
  m.relation_exists,
  m.relkind,
  m.is_ordinary_table,
  m.relpersistence,
  m.owner_role,
  m.relrowsecurity,
  m.relforcerowsecurity,
  COALESCE(pc.policy_count, 0) AS policy_count,
  COALESCE(tc.trigger_count, 0) AS trigger_count,
  m.relation_comment,
  (m.relation_exists AND m.is_ordinary_table AND m.owner_role IS NOT NULL) AS relation_contract_known
FROM rel_meta m
LEFT JOIN policy_counts pc
  ON pc.schema_name = m.schema_name AND pc.relation_name = m.relation_name
LEFT JOIN trigger_counts tc
  ON tc.schema_name = m.schema_name AND tc.relation_name = m.relation_name
ORDER BY m.schema_name, m.relation_name;

-- =============================================================================
-- P3 — Column catalog (domain / compression / default via pg_attrdef)
-- =============================================================================
WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
),
rel_oid AS (
  SELECT r.schema_name, r.relation_name, c.oid AS relation_oid
  FROM required_rel r
  JOIN pg_namespace n ON n.nspname = r.schema_name
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
)
SELECT
  ro.schema_name,
  ro.relation_name,
  a.attnum AS ordinal_position,
  a.attname::text AS column_name,
  format_type(a.atttypid, a.atttypmod) AS formatted_type,
  CASE col_t.typtype
    WHEN 'b' THEN 'base'
    WHEN 'c' THEN 'composite'
    WHEN 'd' THEN 'domain'
    WHEN 'e' THEN 'enum'
    WHEN 'p' THEN 'pseudo'
    WHEN 'r' THEN 'range'
    ELSE col_t.typtype::text
  END AS type_kind,
  col_t.typname::text AS data_type,
  nt.nspname::text AS udt_schema,
  col_t.typname::text AS udt_name,
  CASE WHEN col_t.typtype = 'd' THEN nt.nspname::text ELSE NULL END AS domain_schema,
  CASE WHEN col_t.typtype = 'd' THEN col_t.typname::text ELSE NULL END AS domain_name,
  CASE WHEN col_t.typtype = 'd' THEN format_type(col_t.typbasetype, col_t.typtypmod) ELSE NULL END AS domain_base_type,
  CASE WHEN col_t.typtype = 'd' THEN col_t.typbasetype ELSE NULL END AS domain_base_type_oid,
  CASE WHEN col_t.typtype = 'd' THEN col_t.typnotnull ELSE NULL END AS domain_not_null,
  CASE
    WHEN col_t.typtype = 'd' AND col_t.typdefaultbin IS NOT NULL
      THEN pg_get_expr(col_t.typdefaultbin, 0)
    WHEN col_t.typtype = 'd' AND col_t.typdefault IS NOT NULL
      THEN col_t.typdefault
    ELSE NULL
  END AS domain_default_expression,
  CASE
    WHEN col_t.typtype = 'd' THEN (col_t.typdefaultbin IS NOT NULL OR col_t.typdefault IS NOT NULL)
    ELSE NULL
  END AS domain_default_present,
  CASE
    WHEN col_t.typtype <> 'd' THEN true
    WHEN col_t.typdefaultbin IS NOT NULL OR col_t.typdefault IS NOT NULL OR (col_t.typdefaultbin IS NULL AND col_t.typdefault IS NULL)
      THEN true
    ELSE false
  END AS domain_default_state_known,
  (NOT a.attnotnull) AS is_nullable,
  pg_get_expr(ad.adbin, ad.adrelid) AS default_expression,
  (ad.adbin IS NOT NULL) AS default_present,
  CASE a.attidentity
    WHEN 'a' THEN 'ALWAYS'
    WHEN 'd' THEN 'BY DEFAULT'
    ELSE NULL
  END AS identity_kind,
  CASE a.attgenerated
    WHEN 's' THEN 'STORED'
    WHEN 'v' THEN 'VIRTUAL'
    ELSE NULL
  END AS generated_kind,
  coll.collname::text AS collation,
  CASE a.attstorage
    WHEN 'p' THEN 'plain'
    WHEN 'm' THEN 'main'
    WHEN 'x' THEN 'extended'
    WHEN 'e' THEN 'external'
    ELSE a.attstorage::text
  END AS storage,
  CASE a.attcompression::text
    WHEN 'p' THEN 'pglz'
    WHEN 'l' THEN 'lz4'
    WHEN '' THEN NULL
    ELSE NULLIF(a.attcompression::text, '')
  END AS compression,
  a.attnotnull,
  a.attisdropped,
  col_description(a.attrelid, a.attnum) AS column_comment,
  (
    ro.relation_oid IS NOT NULL
    AND a.attname IS NOT NULL
    AND format_type(a.atttypid, a.atttypmod) IS NOT NULL
    AND (col_t.typtype <> 'd' OR col_t.typbasetype IS NOT NULL)
    AND a.attstorage IS NOT NULL
    AND a.attcompression IS NOT NULL
  ) AS column_contract_known,
  (
    col_t.typtype <> 'd'
    OR (col_t.typbasetype IS NOT NULL AND nt.nspname IS NOT NULL)
  ) AS domain_state_known,
  (a.attcompression IS NOT NULL) AS compression_state_known
FROM rel_oid ro
JOIN pg_attribute a ON a.attrelid = ro.relation_oid
JOIN pg_type col_t ON col_t.oid = a.atttypid
JOIN pg_namespace nt ON nt.oid = col_t.typnamespace
LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
LEFT JOIN pg_collation coll ON coll.oid = a.attcollation
WHERE a.attnum > 0
  AND NOT a.attisdropped
ORDER BY ro.schema_name, ro.relation_name, a.attnum;

-- =============================================================================
-- P4 — Constraints (PK / UNIQUE / CHECK / FK with exact column order)
-- =============================================================================
WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
),
src AS (
  SELECT
    n.nspname::text AS source_schema,
    c.relname::text AS source_relation,
    c.oid AS source_oid,
    con.oid AS constraint_oid,
    con.conname::text AS constraint_name,
    con.contype::text AS constraint_type_char,
    CASE con.contype
      WHEN 'p' THEN 'PRIMARY KEY'
      WHEN 'u' THEN 'UNIQUE'
      WHEN 'c' THEN 'CHECK'
      WHEN 'f' THEN 'FOREIGN KEY'
      ELSE con.contype::text
    END AS constraint_type,
    con.conkey,
    con.confkey,
    con.confrelid,
    con.confupdtype,
    con.confdeltype,
    con.confmatchtype,
    con.condeferrable,
    con.condeferred,
    con.convalidated,
    pg_get_constraintdef(con.oid) AS constraint_definition
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE (n.nspname, c.relname) IN (SELECT schema_name, relation_name FROM required_rel)
),
src_cols AS (
  SELECT
    s.*,
    array_agg(a.attname::text ORDER BY u.ord) FILTER (WHERE u.attnum IS NOT NULL) AS source_columns
  FROM src s
  LEFT JOIN LATERAL unnest(COALESCE(s.conkey, ARRAY[]::smallint[])) WITH ORDINALITY AS u(attnum, ord) ON true
  LEFT JOIN pg_attribute a ON a.attrelid = s.source_oid AND a.attnum = u.attnum
  GROUP BY
    s.source_schema, s.source_relation, s.source_oid, s.constraint_oid, s.constraint_name,
    s.constraint_type_char, s.constraint_type, s.conkey, s.confkey, s.confrelid,
    s.confupdtype, s.confdeltype, s.confmatchtype, s.condeferrable, s.condeferred,
    s.convalidated, s.constraint_definition
),
tgt AS (
  SELECT
    sc.*,
    tn.nspname::text AS target_schema,
    tc.relname::text AS target_relation,
    array_agg(ta.attname::text ORDER BY fu.ord) FILTER (WHERE fu.attnum IS NOT NULL) AS target_columns,
    CASE sc.confupdtype
      WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE sc.confupdtype::text
    END AS on_update,
    CASE sc.confdeltype
      WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE sc.confdeltype::text
    END AS on_delete,
    CASE sc.confmatchtype
      WHEN 'f' THEN 'FULL' WHEN 'p' THEN 'PARTIAL' WHEN 's' THEN 'SIMPLE' ELSE sc.confmatchtype::text
    END AS match_type
  FROM src_cols sc
  LEFT JOIN pg_class tc ON tc.oid = sc.confrelid
  LEFT JOIN pg_namespace tn ON tn.oid = tc.relnamespace
  LEFT JOIN LATERAL unnest(COALESCE(sc.confkey, ARRAY[]::smallint[])) WITH ORDINALITY AS fu(attnum, ord) ON true
  LEFT JOIN pg_attribute ta ON ta.attrelid = sc.confrelid AND ta.attnum = fu.attnum
  GROUP BY
    sc.source_schema, sc.source_relation, sc.source_oid, sc.constraint_oid, sc.constraint_name,
    sc.constraint_type_char, sc.constraint_type, sc.conkey, sc.confkey, sc.confrelid,
    sc.confupdtype, sc.confdeltype, sc.confmatchtype, sc.condeferrable, sc.condeferred,
    sc.convalidated, sc.constraint_definition, sc.source_columns, tn.nspname, tc.relname
)
SELECT
  constraint_name,
  constraint_type,
  source_schema,
  source_relation,
  source_columns,
  source_columns AS source_column_order,
  target_schema,
  target_relation,
  target_columns,
  target_columns AS target_column_order,
  on_update,
  on_delete,
  match_type,
  condeferrable AS deferrable,
  condeferred AS initially_deferred,
  convalidated AS validated,
  constraint_definition,
  (source_columns IS NOT NULL AND constraint_definition IS NOT NULL) AS constraint_contract_known
FROM tgt
ORDER BY source_schema, source_relation, constraint_type, constraint_name;

-- =============================================================================
-- P5 — Indexes (key / INCLUDE separation, corrected pg_index columns)
-- =============================================================================
WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
),
index_base AS (
  SELECT
    n.nspname::text AS index_schema,
    ic.relname::text AS index_name,
    tc.relname::text AS relation_name,
    tc.oid AS relation_oid,
    i.indexrelid AS index_oid,
    i.indisprimary AS is_primary,
    i.indisunique AS is_unique,
    i.indisexclusion AS is_exclusion,
    i.indimmediate AS is_immediate,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    i.indislive AS is_live,
    i.indisreplident AS is_replica_identity,
    i.indnatts,
    i.indnkeyatts,
    am.amname::text AS access_method,
    pg_get_expr(i.indexprs, i.indrelid) AS index_expressions_raw,
    pg_get_expr(i.indpred, i.indrelid) AS predicate,
    pg_get_indexdef(ic.oid) AS full_index_definition
  FROM required_rel r
  JOIN pg_namespace n ON n.nspname = r.schema_name
  JOIN pg_class tc ON tc.relnamespace = n.oid AND tc.relname = r.relation_name
  JOIN pg_index i ON i.indrelid = tc.oid
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_am am ON am.oid = ic.relam
),
index_parts AS (
  SELECT
    b.index_oid,
    k.attnum,
    k.ord,
    b.indnkeyatts,
    CASE WHEN k.ord <= b.indnkeyatts THEN 'key' ELSE 'include' END AS part_kind,
    CASE WHEN k.attnum > 0 THEN a.attname::text ELSE NULL END AS column_name
  FROM index_base b
  JOIN pg_index pi ON pi.indexrelid = b.index_oid
  LEFT JOIN LATERAL unnest(pi.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
  LEFT JOIN pg_attribute a ON a.attrelid = b.relation_oid AND a.attnum = k.attnum AND k.attnum > 0
)
SELECT
  b.index_schema,
  b.index_name,
  b.relation_name,
  b.is_primary,
  b.is_unique,
  b.is_exclusion,
  b.is_immediate,
  b.is_valid,
  b.is_ready,
  b.is_live,
  b.is_replica_identity,
  b.indnatts,
  b.indnkeyatts,
  b.access_method,
  (
    SELECT array_agg(p.column_name ORDER BY p.ord)
    FROM index_parts p
    WHERE p.index_oid = b.index_oid AND p.part_kind = 'key' AND p.column_name IS NOT NULL
  ) AS index_key_columns,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM index_parts p
      WHERE p.index_oid = b.index_oid AND p.part_kind = 'key' AND p.attnum = 0
    ) THEN b.index_expressions_raw
    ELSE NULL
  END AS index_key_expressions,
  (
    SELECT array_agg(p.column_name ORDER BY p.ord)
    FROM index_parts p
    WHERE p.index_oid = b.index_oid AND p.part_kind = 'include' AND p.column_name IS NOT NULL
  ) AS included_columns,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM index_parts p
      WHERE p.index_oid = b.index_oid AND p.part_kind = 'include' AND p.attnum = 0
    ) THEN b.index_expressions_raw
    ELSE NULL
  END AS included_expressions,
  b.predicate,
  b.full_index_definition,
  (b.full_index_definition IS NOT NULL) AS index_contract_known
FROM index_base b
ORDER BY b.index_schema, b.relation_name, b.index_name;

-- =============================================================================
-- P6 — RLS policies (policy 0 = known state; PUBLIC role OID 0)
-- =============================================================================
WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
),
rel_policy AS (
  SELECT
    r.schema_name,
    r.relation_name,
    c.oid AS relation_oid,
    c.relrowsecurity,
    c.relforcerowsecurity,
    p.oid AS policy_oid,
    (p.oid IS NOT NULL) AS policy_exists,
    CASE WHEN p.oid IS NULL THEN NULL ELSE p.polname::text END AS policy_name,
    CASE
      WHEN p.oid IS NULL THEN NULL
      ELSE CASE p.polcmd
        WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' ELSE p.polcmd::text
      END
    END AS command,
    CASE
      WHEN p.oid IS NULL THEN NULL
      ELSE CASE p.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END
    END AS permissive_restrictive,
    CASE
      WHEN p.oid IS NULL THEN NULL::text[]
      ELSE (
        SELECT array_agg(
          CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END
          ORDER BY role_oid
        )
        FROM unnest(p.polroles) AS role_oid
      )
    END AS roles,
    CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_expr(p.polqual, p.polrelid) END AS using_expression,
    CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_expr(p.polwithcheck, p.polrelid) END AS with_check_expression
  FROM required_rel r
  JOIN pg_namespace n ON n.nspname = r.schema_name
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
),
rel_policy_counts AS (
  SELECT
    schema_name,
    relation_name,
    relation_oid,
    relrowsecurity,
    relforcerowsecurity,
    count(*) FILTER (WHERE policy_exists)::integer AS policy_count,
    count(*)::integer AS policy_catalog_row_count
  FROM rel_policy
  GROUP BY schema_name, relation_name, relation_oid, relrowsecurity, relforcerowsecurity
)
SELECT
  rp.schema_name,
  rp.relation_name,
  rp.relation_oid,
  rp.relrowsecurity,
  rp.relforcerowsecurity,
  rpc.policy_count,
  rpc.policy_catalog_row_count,
  (rpc.relation_oid IS NOT NULL) AS policy_state_known,
  rp.policy_exists,
  rp.policy_oid,
  rp.policy_name,
  rp.command,
  rp.permissive_restrictive,
  rp.roles,
  rp.using_expression,
  rp.with_check_expression
FROM rel_policy rp
JOIN rel_policy_counts rpc
  ON rpc.schema_name = rp.schema_name AND rpc.relation_name = rp.relation_name
ORDER BY rp.schema_name, rp.relation_name, rp.policy_name NULLS FIRST;

-- =============================================================================
-- P7 — Role privileges (420 cells; grantable state; PUBLIC included)
-- =============================================================================
WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
),
required_roles(role_name) AS (
  VALUES ('anon'::text), ('authenticated'), ('service_role'), ('PUBLIC')
),
required_priv(privilege_name) AS (
  VALUES ('SELECT'::text), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
),
rel_oid AS (
  SELECT r.schema_name, r.relation_name, c.oid AS relation_oid
  FROM required_rel r
  LEFT JOIN pg_namespace n ON n.nspname = r.schema_name
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
),
matrix AS (
  SELECT
    ro.schema_name,
    ro.relation_name,
    ro.relation_oid,
    rr.role_name,
    CASE WHEN rr.role_name = 'PUBLIC' THEN 'public' ELSE rr.role_name END AS role_eval_name,
    rp.privilege_name
  FROM rel_oid ro
  CROSS JOIN required_roles rr
  CROSS JOIN required_priv rp
),
grant_agg AS (
  SELECT
    tp.table_schema,
    tp.table_name,
    tp.grantee,
    tp.privilege_type,
    bool_or(tp.is_grantable = 'YES') AS explicit_grant_is_grantable,
    array_agg(DISTINCT tp.grantor::text ORDER BY tp.grantor::text) AS grantors,
    count(*)::integer AS explicit_grant_rows
  FROM information_schema.table_privileges tp
  WHERE tp.table_schema = 'public'
    AND tp.table_name IN (SELECT relation_name FROM required_rel)
    AND tp.grantee IN (SELECT role_name FROM required_roles)
    AND tp.privilege_type IN (SELECT privilege_name FROM required_priv)
  GROUP BY tp.table_schema, tp.table_name, tp.grantee, tp.privilege_type
)
SELECT
  m.schema_name,
  m.relation_name,
  m.role_name,
  m.role_eval_name,
  m.privilege_name,
  (
    m.role_name = 'PUBLIC'
    OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = m.role_name)
  ) AS role_exists,
  (m.relation_oid IS NOT NULL) AS relation_exists,
  CASE
    WHEN m.relation_oid IS NULL OR (
      m.role_name <> 'PUBLIC' AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = m.role_name)
    ) THEN NULL
    ELSE has_table_privilege(m.role_eval_name, m.relation_oid, m.privilege_name)
  END AS effective_privilege,
  COALESCE(ga.explicit_grant_rows > 0, false) AS explicit_grant_present,
  CASE WHEN COALESCE(ga.explicit_grant_rows, 0) > 0 THEN ga.explicit_grant_is_grantable ELSE NULL END AS explicit_grant_is_grantable,
  COALESCE(ga.grantors, ARRAY[]::text[]) AS grantor,
  (
    m.relation_oid IS NOT NULL
    AND (m.role_name = 'PUBLIC' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = m.role_name))
    AND has_table_privilege(m.role_eval_name, m.relation_oid, m.privilege_name) IS NOT NULL
  ) AS grant_source_known,
  (
    m.relation_oid IS NOT NULL
    AND (m.role_name = 'PUBLIC' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = m.role_name))
    AND has_table_privilege(m.role_eval_name, m.relation_oid, m.privilege_name) IS NOT NULL
  ) AS privilege_state_known
FROM matrix m
LEFT JOIN grant_agg ga
  ON ga.table_schema = m.schema_name
 AND ga.table_name = m.relation_name
 AND ga.grantee = m.role_name
 AND ga.privilege_type = m.privilege_name
ORDER BY m.schema_name, m.relation_name, m.role_name, m.privilege_name;

-- =============================================================================
-- P8 — Dependent extensions, exact functions, triggers (0 triggers = known)
-- =============================================================================
SELECT
  e.extname::text AS extension_name,
  e.extversion::text AS extension_version,
  n.nspname::text AS extension_schema,
  (e.extname IN ('pgcrypto', 'uuid-ossp')) AS provides_uuid_generator_candidate
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('pgcrypto', 'uuid-ossp', 'plpgsql')
ORDER BY e.extname;

WITH expected_functions(function_schema, function_name, expected_identity_arguments, evidence_source) AS (
  VALUES
    (
      'public'::text,
      'm55_reply_generate_commit',
      'p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text',
      'ACCEPTED_HUMAN_EVIDENCE_CONTRACT_B'
    ),
    (
      'public',
      'm55_consult_reply_commit',
      'p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone',
      'TRACKED_MIGRATION_REFERENCE_20260523120000'
    )
)
SELECT
  ef.function_schema,
  ef.function_name,
  ef.expected_identity_arguments,
  ef.evidence_source,
  p.oid AS function_oid,
  (p.oid IS NOT NULL) AS function_exists,
  pg_get_function_identity_arguments(p.oid)::text AS identity_arguments,
  (ef.function_schema || '.' || ef.function_name || '(' || ef.expected_identity_arguments || ')')::text AS to_regprocedure_signature,
  pg_get_function_result(p.oid)::text AS result_type,
  pg_get_userbyid(p.proowner)::text AS owner_role,
  p.prosecdef AS security_definer,
  p.proconfig AS proconfig,
  (
    SELECT setting
    FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting
    WHERE setting LIKE 'search_path=%'
    LIMIT 1
  ) AS search_path,
  CASE
    WHEN p.oid IS NULL THEN NULL
    ELSE has_function_privilege('service_role', p.oid, 'EXECUTE')
  END AS service_role_execute_privilege,
  (
    p.oid IS NOT NULL
    AND pg_get_function_identity_arguments(p.oid) = ef.expected_identity_arguments
  ) AS exact_signature_match
FROM expected_functions ef
LEFT JOIN pg_namespace n ON n.nspname = ef.function_schema
LEFT JOIN pg_proc p
  ON p.pronamespace = n.oid
 AND p.proname = ef.function_name
 AND pg_get_function_identity_arguments(p.oid) = ef.expected_identity_arguments
ORDER BY ef.function_name;

WITH required_rel(schema_name, relation_name) AS (
  VALUES
    ('public'::text, 'consult_messages'),
    ('public', 'consult_send_commits'),
    ('public', 'consult_threads'),
    ('public', 'dtr_guest_drafts'),
    ('public', 'dtr_report_snapshots'),
    ('public', 'entitlement_rights'),
    ('public', 'entitlements'),
    ('public', 'failed_fulfillments'),
    ('public', 'one_time_fulfillments'),
    ('public', 'reply_documents'),
    ('public', 'reply_sessions'),
    ('public', 'reply_ticket_wallets'),
    ('public', 'reply_wallet_ledgers'),
    ('public', 'stripe_events'),
    ('public', 'stripe_processed_events')
)
SELECT
  r.schema_name,
  r.relation_name,
  (c.oid IS NOT NULL) AS relation_exists,
  (t.oid IS NOT NULL) AS trigger_exists,
  t.tgname::text AS trigger_name,
  t.tgenabled::text AS enabled_state,
  CASE WHEN t.oid IS NULL THEN NULL ELSE pg_get_triggerdef(t.oid, true) END AS trigger_definition,
  p.proname::text AS function_name,
  CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_function_identity_arguments(p.oid) END AS function_signature
FROM required_rel r
JOIN pg_namespace n ON n.nspname = r.schema_name
JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND NOT t.tgisinternal
LEFT JOIN pg_proc p ON p.oid = t.tgfoid
ORDER BY r.schema_name, r.relation_name, t.tgname NULLS FIRST;

-- =============================================================================
-- P9 — Known absent objects (exact RPC signature; hard contract)
-- =============================================================================
WITH expected_absent_rpc_signature AS (
  SELECT 'public.m55_account_deletion_process_v1(text,text,text,text)'::text AS exact_signature
)
SELECT
  'public.purchases'::text AS known_absent_object,
  'table'::text AS object_type,
  (to_regclass('public.purchases') IS NULL) AS absent,
  (to_regclass('public.purchases') IS NULL) AS absence_verified,
  'catalog_to_regclass'::text AS evidence_source,
  NULL::text AS exact_signature_checked,
  NULL::integer AS same_proname_other_overloads
UNION ALL SELECT 'public.subscriptions', 'table', to_regclass('public.subscriptions') IS NULL, to_regclass('public.subscriptions') IS NULL, 'catalog_to_regclass', NULL, NULL
UNION ALL SELECT 'public.invoice_dtr_grants', 'table', to_regclass('public.invoice_dtr_grants') IS NULL, to_regclass('public.invoice_dtr_grants') IS NULL, 'catalog_to_regclass', NULL, NULL
UNION ALL SELECT 'public.m55_user_identity_mappings', 'table', to_regclass('public.m55_user_identity_mappings') IS NULL, to_regclass('public.m55_user_identity_mappings') IS NULL, 'catalog_to_regclass', NULL, NULL
UNION ALL SELECT 'public.clerk_webhook_events', 'table', to_regclass('public.clerk_webhook_events') IS NULL, to_regclass('public.clerk_webhook_events') IS NULL, 'catalog_to_regclass', NULL, NULL
UNION ALL
SELECT
  'public.m55_account_deletion_process_v1(text,text,text,text)',
  'function',
  (to_regprocedure(e.exact_signature) IS NULL),
  (to_regprocedure(e.exact_signature) IS NULL),
  'catalog_to_regprocedure',
  e.exact_signature,
  (
    SELECT count(*)::integer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE p.proname = 'm55_account_deletion_process_v1'
      AND pg_get_function_identity_arguments(p.oid) <> 'p_svix_id text, p_event_type text, p_clerk_user_id text, p_user_ref_hash text'
  )
FROM expected_absent_rpc_signature e
UNION ALL SELECT 'public.failed_fulfillments.user_ref_hash', 'column', NOT EXISTS (
  SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'failed_fulfillments' AND a.attname = 'user_ref_hash' AND NOT a.attisdropped
), NOT EXISTS (
  SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'failed_fulfillments' AND a.attname = 'user_ref_hash' AND NOT a.attisdropped
), 'pg_attribute_catalog', NULL, NULL
UNION ALL SELECT 'failed_fulfillments_user_ref_hash_format_check', 'check', NOT EXISTS (
  SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'failed_fulfillments' AND con.conname = 'failed_fulfillments_user_ref_hash_format_check'
), NOT EXISTS (
  SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'failed_fulfillments' AND con.conname = 'failed_fulfillments_user_ref_hash_format_check'
), 'pg_constraint_catalog', NULL, NULL
UNION ALL SELECT 'idx_failed_fulfillments_user_ref_hash', 'index', to_regclass('public.idx_failed_fulfillments_user_ref_hash') IS NULL, to_regclass('public.idx_failed_fulfillments_user_ref_hash') IS NULL, 'catalog_to_regclass', NULL, NULL
UNION ALL SELECT 'app.user_profiles', 'table', to_regclass('app.user_profiles') IS NULL, to_regclass('app.user_profiles') IS NULL, 'catalog_to_regclass', NULL, NULL;

SELECT
  EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app') AS app_schema_exists,
  (to_regclass('app.user_profiles') IS NULL) AS app_user_profiles_absent;

-- =============================================================================

-- =============================================================================
-- P10 — Authoritative summary (catalog classifier; S1 sequencing split)
-- =============================================================================
WITH required_rel(relation_name) AS (
  VALUES
    ('consult_messages'::text), ('consult_send_commits'), ('consult_threads'),
    ('dtr_guest_drafts'), ('dtr_report_snapshots'), ('entitlement_rights'),
    ('entitlements'), ('failed_fulfillments'), ('one_time_fulfillments'),
    ('reply_documents'), ('reply_sessions'), ('reply_ticket_wallets'),
    ('reply_wallet_ledgers'), ('stripe_events'), ('stripe_processed_events')
),
required_roles(role_name) AS (
  VALUES ('anon'::text), ('authenticated'), ('service_role'), ('PUBLIC')
),
required_priv(privilege_name) AS (
  VALUES ('SELECT'::text), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
),
stripe_processed_required_cols(column_name, expected_ordinal, expected_type_family, required_nullable, expected_default_frozen, expected_default_expression) AS (
  VALUES
    ('id',1,'uuid','YES',true,'gen_random_uuid()'),
    ('stripe_event_id',2,'text','YES',false,NULL::text),
    ('checkout_session_id',3,'text','YES',false,NULL::text),
    ('payment_intent_id',4,'text','YES',false,NULL::text),
    ('product_key',5,'text','YES',false,NULL::text),
    ('report_instance_id',6,'uuid','YES',false,NULL::text),
    ('user_ref_hash',7,'text','YES',false,NULL::text),
    ('status',8,'text','YES',false,NULL::text),
    ('processed_at',9,'timestamptz','YES',false,NULL::text),
    ('created_at',10,'timestamptz','YES',true,'now()'),
    ('updated_at',11,'timestamptz','YES',true,'now()')
),
stripe_events_core_cols(column_name, expected_type_family, required_not_null) AS (
  VALUES
    ('event_id','text',true), ('event_type','text',true), ('received_at','timestamptz',true)
),
stripe_events_optional_cols(column_name, expected_type_family) AS (
  VALUES ('processed_at','timestamptz'), ('type','text'), ('payload_hash','text')
),
-- owner_freeze_mode=ACTUAL_FREEZE: tracked migrations (20260417000000 / 20260523120000)
-- contain no OWNER TO expectation; actual owner is frozen as state-known.
-- proconfig_freeze_mode=EXPECTED_EXACT: tracked migrations set exactly
-- "SET search_path = public" and nothing else; extra proconfig entries are mismatches.
expected_functions(function_name, expected_identity_arguments, expected_result_type, expected_security_definer, expected_search_path, expected_proconfig, expected_owner, owner_freeze_mode, owner_expected_source, proconfig_freeze_mode) AS (
  VALUES
    ('m55_reply_generate_commit','p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text','jsonb',true,'search_path=public',ARRAY['search_path=public']::text[],NULL::text,'ACTUAL_FREEZE','NONE_TRACKED_MIGRATION_HAS_NO_OWNER_EXPECTATION','EXPECTED_EXACT'),
    ('m55_consult_reply_commit','p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone','jsonb',true,'search_path=public',ARRAY['search_path=public']::text[],NULL::text,'ACTUAL_FREEZE','NONE_TRACKED_MIGRATION_HAS_NO_OWNER_EXPECTATION','EXPECTED_EXACT')
),
expected_dtr_partial_unique(
  index_name, key_columns, included_columns, raw_predicate, access_method, is_unique, is_primary,
  evidence_source, evidence_confidence
) AS (
  VALUES (
    'dtr_report_snapshots_one_visible_per_user_product_uq',
    ARRAY['user_id','product_id']::text[],
    ARRAY[]::text[],
    'user_hidden_at IS NULL',
    'btree', true, false,
    'ACCEPTED_FREEZE_V2_DTR_SOFT_HIDE',
    'HIGH'
  )
),
expected_ledger_indexes(
  index_name, key_columns, included_columns, raw_predicate, is_partial, is_unique, access_method, is_primary,
  evidence_source, evidence_confidence
) AS (
  VALUES
    ('idx_reply_wallet_ledgers_wallet_created', ARRAY['wallet_id','created_at']::text[], ARRAY[]::text[], NULL::text, false, false, 'btree', false, 'TRACKED_MIGRATION_20260416000000', 'HIGH'),
    ('idx_reply_wallet_ledgers_user_created', ARRAY['user_id','created_at']::text[], ARRAY[]::text[], NULL::text, false, false, 'btree', false, 'TRACKED_MIGRATION_20260416000000', 'HIGH'),
    ('idx_reply_wallet_ledgers_session', ARRAY['reply_session_id']::text[], ARRAY[]::text[], 'reply_session_id IS NOT NULL', true, false, 'btree', false, 'TRACKED_MIGRATION_20260416000000', 'HIGH')
),
expected_stripe_processed_indexes(
  relation_name, index_name, access_method, is_primary, is_unique,
  key_columns, included_columns, raw_predicate, predicate_required,
  is_valid_required, is_ready_required, is_live_required, expected_count,
  evidence_source, evidence_confidence
) AS (
  VALUES (
    'stripe_processed_events',
    'idx_stripe_processed_events_stripe_event_id_unique_not_null',
    'btree', false, true,
    ARRAY['stripe_event_id']::text[],
    ARRAY[]::text[],
    'stripe_event_id IS NOT NULL',
    true,
    true, true, true, 1,
    'M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1',
    'HIGH'
  )
),
-- stripe_processed_events PRIMARY KEY contract: accepted Production evidence fixes
-- PK as ABSENT (production candidate DDL has no PK; APPLY_RESULT records
-- "NOT NULL / FK / UNIQUE additions: none"; only later accepted unique object is
-- the partial idempotency index). Expected primary-key index count = 0.
expected_stripe_processed_pk(
  relation_name, expected_primary_key_index_count,
  evidence_source, evidence_confidence
) AS (
  VALUES (
    'stripe_processed_events',
    0,
    'M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_RESULT_v1',
    'HIGH'
  )
),
-- Production actual: stricter partial UNIQUE coexists with required index A.
-- Allowed redundant indexes are inventoried but do not trigger same-purpose competing conflicts.
allowed_stripe_processed_redundant_indexes(
  relation_name, index_name, access_method, is_primary, is_unique,
  key_columns, included_columns, raw_predicate, predicate_required,
  evidence_source, evidence_confidence
) AS (
  VALUES (
    'stripe_processed_events',
    'm55_uidx_stripe_processed_events_stripe_event_id',
    'btree', false, true,
    ARRAY['stripe_event_id']::text[],
    ARRAY[]::text[],
    'stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0',
    true,
    'm55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1',
    'HIGH'
  )
),
self_test_case_registry(case_name, sort_order) AS (
  VALUES
    ('01_all_exact', 1), ('02_relation_missing', 2), ('03_domain_default_unknown', 3),
    ('04_policy_zero_known', 4), ('05_policy_roles_unknown', 5), ('06_privilege_420_complete', 6),
    ('07_grantable_unknown', 7), ('08_stripe_event_type_mismatch', 8), ('09_stripe_processed_nullable_mismatch', 9),
    ('10_partial_unique_predicate_missing', 10), ('11_unexpected_composite_fk', 11), ('12_function_search_path_mismatch', 12),
    ('13_unknown_defaults_nonempty', 13), ('14_migration_reference_conflict', 14), ('15_runtime_unresolved_catalog_pass', 15),
    ('16_reply_sessions_index_only_target_unique', 16), ('17_stripe_processed_allowed_redundant_present', 17)
),
runtime_conflict_matrix(conflict_id, description, resolved) AS (
  VALUES ('stripe_events_runtime_id_dependency','Resolved by runtime commit 35bee204f10637b16494468d2cadf4a283e762de: stripe_events lookups select event_id instead of absent id',true)
),
rel_meta AS (
  SELECT r.relation_name, c.oid AS relation_oid, (c.oid IS NOT NULL) AS relation_exists,
    c.relkind, c.relpersistence, c.relrowsecurity, c.relforcerowsecurity,
    CASE WHEN c.oid IS NULL THEN NULL ELSE pg_get_userbyid(c.relowner)::text END AS owner_role
  FROM required_rel r
  LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.relation_name
),
relation_flags AS (
  SELECT 15 AS expected_relation_count,
    count(*) FILTER (WHERE relation_exists)::integer AS actual_relation_count,
    bool_and(relation_exists) AS all_required_relations_exist,
    bool_and(relkind='r') AS all_required_relations_ordinary,
    bool_and(owner_role IS NOT NULL) AS owner_contract_state_known,
    bool_and(relrowsecurity IS NOT NULL) AS rls_contract_state_known,
    (bool_and(relation_exists) AND bool_and(relkind='r') AND bool_and(owner_role IS NOT NULL)
      AND bool_and(relrowsecurity IS NOT NULL) AND bool_and(relforcerowsecurity IS NOT NULL)) AS relation_contract_state_known
  FROM rel_meta
),
col_catalog AS (
  SELECT r.relation_name, a.attname, a.attnum, format_type(a.atttypid,a.atttypmod) AS formatted_type,
    (NOT a.attnotnull) AS is_nullable, ad.adbin IS NOT NULL AS default_present,
    col_t.typtype, col_t.typdefaultbin, col_t.typdefault, a.attstorage, a.attcompression,
    CASE WHEN col_t.typtype='d' AND col_t.typdefaultbin IS NOT NULL THEN pg_get_expr(col_t.typdefaultbin,0)
         WHEN col_t.typtype='d' AND col_t.typdefault IS NOT NULL THEN col_t.typdefault ELSE NULL END AS domain_default_expression,
    CASE WHEN col_t.typtype<>'d' THEN true
         WHEN col_t.typdefaultbin IS NOT NULL OR col_t.typdefault IS NOT NULL OR (col_t.typdefaultbin IS NULL AND col_t.typdefault IS NULL) THEN true ELSE false END AS domain_default_state_known
  FROM required_rel r
  JOIN pg_namespace n ON n.nspname='public'
  JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.relation_name
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  JOIN pg_type col_t ON col_t.oid=a.atttypid
  LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
),
col_missing_rel AS (SELECT r.relation_name FROM required_rel r LEFT JOIN col_catalog cc ON cc.relation_name=r.relation_name WHERE cc.relation_name IS NULL),
column_flags AS (
  SELECT (SELECT count(*) FROM col_missing_rel)=0 AS all_relations_have_columns,
    NOT EXISTS (SELECT 1 FROM col_catalog GROUP BY relation_name,attnum HAVING count(*)>1) AS no_duplicate_ordinals,
    NOT EXISTS (SELECT 1 FROM col_catalog GROUP BY relation_name,attname HAVING count(*)>1) AS no_duplicate_column_names,
    COALESCE((SELECT bool_and(formatted_type IS NOT NULL) FROM col_catalog),false) AS all_formatted_types_known,
    COALESCE((SELECT bool_and(domain_default_state_known) FROM col_catalog),false) AS all_domain_defaults_known
),
column_contract_state_known AS (
  SELECT (rf.all_required_relations_exist AND cf.all_relations_have_columns AND cf.no_duplicate_ordinals
    AND cf.no_duplicate_column_names AND cf.all_formatted_types_known AND cf.all_domain_defaults_known) AS column_contract_state_known
  FROM relation_flags rf, column_flags cf
),
stripe_col AS (
  SELECT a.attname, format_type(a.atttypid,a.atttypmod) AS formatted_type, a.attnotnull,
    ad.adbin IS NOT NULL AS default_present, pg_get_expr(ad.adbin,ad.adrelid) AS default_expression
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public' AND c.relname='stripe_events'
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
),
stripe_id_absent AS (
  SELECT NOT EXISTS (SELECT 1 FROM stripe_col WHERE attname='id') AS stripe_events_id_absent
),
stripe_core_ok AS (
  SELECT
    NOT EXISTS (
      SELECT 1 FROM stripe_events_core_cols ec
      LEFT JOIN stripe_col sc ON sc.attname = ec.column_name
      WHERE sc.attname IS NULL
        OR NOT (
          (ec.expected_type_family = 'text' AND sc.formatted_type = 'text')
          OR (ec.expected_type_family = 'timestamptz' AND sc.formatted_type IN ('timestamp with time zone', 'timestamptz'))
        )
        OR (ec.required_not_null AND NOT sc.attnotnull)
    ) AS stripe_events_core_contract_ok,
    EXISTS (SELECT 1 FROM stripe_col WHERE attname = 'received_at') AS received_at_column_exists,
    COALESCE((SELECT default_present IS NOT NULL FROM stripe_col WHERE attname = 'received_at'), false) AS received_at_default_state_known,
    (SELECT default_expression FROM stripe_col WHERE attname = 'received_at') AS received_at_default_expression,
    (SELECT default_present FROM stripe_col WHERE attname = 'received_at') AS received_at_default_present
),
stripe_optional_eval AS (
  SELECT
    oc.column_name,
    sc.attname IS NOT NULL AS column_exists,
    sc.formatted_type,
    (NOT sc.attnotnull) AS is_nullable,
    sc.default_present,
    sc.default_expression,
    CASE
      WHEN sc.attname IS NULL THEN true
      WHEN oc.expected_type_family = 'text' AND sc.formatted_type = 'text' THEN true
      WHEN oc.expected_type_family = 'timestamptz' AND sc.formatted_type IN ('timestamp with time zone', 'timestamptz') THEN true
      ELSE false
    END AS optional_type_ok,
    (sc.attname IS NULL OR sc.default_present IS NOT NULL) AS optional_default_state_known
  FROM stripe_events_optional_cols oc
  LEFT JOIN stripe_col sc ON sc.attname = oc.column_name
),
stripe_optional_contract_state_known AS (
  SELECT bool_and(optional_type_ok AND optional_default_state_known) AS stripe_optional_contract_state_known
  FROM stripe_optional_eval
),
stripe_unexpected_cols AS (
  SELECT COALESCE(array_agg(sc.attname ORDER BY sc.attname), ARRAY[]::text[]) AS stripe_unexpected_column_names
  FROM stripe_col sc
  WHERE sc.attname NOT IN (
    SELECT column_name FROM stripe_events_core_cols
    UNION ALL SELECT column_name FROM stripe_events_optional_cols
  )
),
sp_col AS (
  SELECT a.attname, format_type(a.atttypid,a.atttypmod) AS formatted_type, (NOT a.attnotnull) AS is_nullable,
    ad.adbin IS NOT NULL AS default_present, pg_get_expr(ad.adbin,ad.adrelid) AS default_expression, a.attnum
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public' AND c.relname='stripe_processed_events'
  JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
),
sp_unexpected_cols AS (
  SELECT
    COALESCE(array_agg(sc.attname ORDER BY sc.attname), ARRAY[]::text[]) AS stripe_processed_unexpected_column_names,
    count(*)::integer AS stripe_processed_unexpected_column_count
  FROM sp_col sc
  WHERE sc.attname NOT IN (SELECT column_name FROM stripe_processed_required_cols)
),
sp_duplicate_cols AS (
  SELECT count(*)::integer AS stripe_processed_duplicate_column_count
  FROM (SELECT attname FROM sp_col GROUP BY attname HAVING count(*) > 1) d
),
stripe_processed_contract_ok AS (
  SELECT (
    spf.stripe_processed_required_columns_exact
    AND spf.stripe_processed_ordinals_exact
    AND spf.stripe_processed_types_nullability_exact
    AND spf.stripe_processed_no_duplicate_columns
    AND spf.stripe_processed_defaults_state_known
    AND spf.stripe_processed_defaults_frozen_exact
    AND spuc.stripe_processed_unexpected_column_count = 0
  ) AS stripe_processed_contract_ok
  FROM (
    SELECT
      (SELECT count(*) FROM sp_col WHERE attname IN (SELECT column_name FROM stripe_processed_required_cols)) = 11 AS stripe_processed_required_columns_exact,
      NOT EXISTS (
        SELECT 1
        FROM stripe_processed_required_cols req
        LEFT JOIN sp_col sc ON sc.attname = req.column_name
        WHERE sc.attname IS NULL OR sc.attnum <> req.expected_ordinal
      ) AS stripe_processed_ordinals_exact,
      NOT EXISTS (
        SELECT 1
        FROM stripe_processed_required_cols req
        LEFT JOIN sp_col sc ON sc.attname = req.column_name
        WHERE sc.attname IS NULL
          OR (req.expected_type_family = 'uuid' AND sc.formatted_type <> 'uuid')
          OR (req.expected_type_family = 'text' AND sc.formatted_type <> 'text')
          OR (req.expected_type_family = 'timestamptz' AND sc.formatted_type NOT IN ('timestamp with time zone', 'timestamptz'))
          OR (req.required_nullable = 'YES' AND NOT sc.is_nullable)
      ) AS stripe_processed_types_nullability_exact,
      (SELECT stripe_processed_duplicate_column_count FROM sp_duplicate_cols) = 0 AS stripe_processed_no_duplicate_columns,
      COALESCE((
        SELECT bool_and(default_present IS NOT NULL)
        FROM sp_col
        WHERE attname IN (SELECT column_name FROM stripe_processed_required_cols)
      ), false) AS stripe_processed_defaults_state_known,
      NOT EXISTS (
        SELECT 1
        FROM stripe_processed_required_cols req
        JOIN sp_col sc ON sc.attname = req.column_name
        WHERE req.expected_default_frozen
          AND (
            NOT sc.default_present
            OR regexp_replace(lower(btrim(COALESCE(sc.default_expression, ''))), ' +', ' ', 'g')
              IS DISTINCT FROM regexp_replace(lower(btrim(req.expected_default_expression)), ' +', ' ', 'g')
          )
      ) AS stripe_processed_defaults_frozen_exact
  ) spf
  CROSS JOIN sp_unexpected_cols spuc
),
constraint_base AS (
  SELECT
    'public'::text AS source_schema,
    c.relname::text AS source_relation,
    con.oid AS constraint_oid,
    con.contype,
    con.conkey,
    con.confkey,
    con.confrelid,
    con.confupdtype,
    con.confdeltype,
    con.confmatchtype,
    con.condeferrable,
    con.condeferred,
    con.convalidated,
    sr.oid AS source_oid,
    pg_get_constraintdef(con.oid) AS constraint_definition
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  JOIN pg_class sr ON sr.oid = con.conrelid
  WHERE c.relname IN (SELECT relation_name FROM required_rel)
),
source_column_arrays AS (
  SELECT
    cb.constraint_oid,
    array_agg(a.attname::text ORDER BY u.ord) FILTER (WHERE a.attname IS NOT NULL) AS source_columns,
    count(*) FILTER (WHERE a.attname IS NOT NULL)::integer AS source_column_count
  FROM constraint_base cb
  LEFT JOIN LATERAL unnest(COALESCE(cb.conkey, ARRAY[]::smallint[])) WITH ORDINALITY AS u(attnum, ord) ON true
  LEFT JOIN pg_attribute a ON a.attrelid = cb.source_oid AND a.attnum = u.attnum
  GROUP BY cb.constraint_oid
),
target_column_arrays AS (
  SELECT
    cb.constraint_oid,
    tn.nspname::text AS target_schema,
    tc.relname::text AS target_relation,
    array_agg(ta.attname::text ORDER BY fu.ord) FILTER (WHERE ta.attname IS NOT NULL) AS target_columns,
    count(*) FILTER (WHERE ta.attname IS NOT NULL)::integer AS target_column_count
  FROM constraint_base cb
  LEFT JOIN pg_class tc ON tc.oid = cb.confrelid
  LEFT JOIN pg_namespace tn ON tn.oid = tc.relnamespace
  LEFT JOIN LATERAL unnest(COALESCE(cb.confkey, ARRAY[]::smallint[])) WITH ORDINALITY AS fu(attnum, ord) ON true
  LEFT JOIN pg_attribute ta ON ta.attrelid = cb.confrelid AND ta.attnum = fu.attnum
  GROUP BY cb.constraint_oid, tn.nspname, tc.relname
),
con_expanded AS (
  SELECT
    cb.source_schema,
    cb.source_relation,
    cb.constraint_oid,
    cb.contype,
    sca.source_columns,
    sca.source_column_count,
    tca.target_schema,
    tca.target_relation,
    tca.target_columns,
    tca.target_column_count,
    CASE cb.confupdtype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION' WHEN 'd' THEN 'SET DEFAULT' ELSE cb.confupdtype::text END AS on_update,
    CASE cb.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION' WHEN 'd' THEN 'SET DEFAULT' ELSE cb.confdeltype::text END AS on_delete,
    CASE cb.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOREIGN KEY' ELSE cb.contype::text END AS constraint_type,
    CASE cb.confmatchtype WHEN 'f' THEN 'FULL' WHEN 'p' THEN 'PARTIAL' WHEN 's' THEN 'SIMPLE' ELSE cb.confmatchtype::text END AS match_type,
    cb.condeferrable,
    cb.condeferred,
    cb.convalidated,
    cb.constraint_definition
  FROM constraint_base cb
  JOIN source_column_arrays sca ON sca.constraint_oid = cb.constraint_oid
  LEFT JOIN target_column_arrays tca ON tca.constraint_oid = cb.constraint_oid
),
fk_flags AS (
  SELECT
    count(*) FILTER (WHERE source_relation='reply_documents' AND contype='f'
      AND source_columns=ARRAY['reply_session_id']::text[]
      AND target_schema='public' AND target_relation='reply_sessions'
      AND target_columns=ARRAY['id']::text[]
      AND on_update='NO ACTION' AND on_delete='CASCADE'
      AND match_type='SIMPLE' AND NOT condeferrable AND NOT condeferred AND convalidated)::integer AS reply_documents_single_cascade_count,
    count(*) FILTER (WHERE source_relation='reply_documents' AND contype='f'
      AND source_columns=ARRAY['reply_session_id','theme']::text[]
      AND target_schema='public' AND target_relation='reply_sessions'
      AND target_columns=ARRAY['id','theme']::text[]
      AND on_update='RESTRICT' AND on_delete='RESTRICT'
      AND match_type='SIMPLE' AND NOT condeferrable AND NOT condeferred AND convalidated)::integer AS reply_documents_composite_restrict_count,
    count(*) FILTER (WHERE source_relation='reply_documents' AND target_relation='reply_sessions' AND contype='f'
      AND cardinality(source_columns)>1
      AND NOT (
        source_columns=ARRAY['reply_session_id','theme']::text[]
        AND target_schema='public' AND target_columns=ARRAY['id','theme']::text[]
        AND on_update='RESTRICT' AND on_delete='RESTRICT'
        AND match_type='SIMPLE' AND NOT condeferrable AND NOT condeferred AND convalidated
      ))::integer AS reply_documents_unexpected_composite_count,
    count(*) FILTER (WHERE source_relation='reply_sessions' AND contype='u' AND source_columns=ARRAY['id','theme'])::integer AS reply_sessions_id_theme_unique_count,
    count(*) FILTER (WHERE source_relation='reply_sessions' AND contype='u' AND source_columns=ARRAY['id','theme'] AND convalidated)::integer AS reply_sessions_id_theme_validated_unique_constraint_count,
    count(*) FILTER (WHERE source_relation='entitlements' AND contype='u' AND source_columns=ARRAY['user_id','product_id'])::integer AS entitlements_user_product_unique_count
  FROM con_expanded
),
entitlements_unique_ok AS (SELECT (SELECT entitlements_user_product_unique_count FROM fk_flags)=1 AS entitlements_unique_ok),
constraint_contract_state_known AS (
  SELECT COALESCE((SELECT bool_and(source_columns IS NOT NULL) FROM con_expanded),true)
    AND COALESCE((SELECT bool_and(pg_get_constraintdef(constraint_oid) IS NOT NULL) FROM con_expanded),true) AS constraint_contract_state_known
),
index_catalog AS (
  SELECT
    ic.oid AS index_oid,
    tc.relname AS relation_name,
    ic.relname AS index_name,
    i.indisprimary AS is_primary,
    i.indisunique AS is_unique,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    i.indislive AS is_live,
    am.amname AS access_method,
    pg_get_expr(i.indpred, i.indrelid) AS predicate,
    CASE
      WHEN pg_get_expr(i.indpred, i.indrelid) IS NULL THEN NULL
      ELSE regexp_replace(
        lower(btrim(btrim(pg_get_expr(i.indpred, i.indrelid), '('), ')')), ' +', ' ', 'g'
      )
    END AS normalized_predicate,
    CASE
      WHEN pg_get_expr(i.indpred, i.indrelid) IS NULL THEN NULL
      ELSE regexp_replace(
        lower(pg_get_expr(i.indpred, i.indrelid)),
        '[[:space:]()]',
        '',
        'g'
      )
    END AS compact_normalized_predicate,
    pg_get_indexdef(ic.oid) AS full_index_definition,
    i.indnkeyatts::integer AS index_key_count,
    (
      SELECT count(*)::integer
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      WHERE k.ord <= i.indnkeyatts AND k.attnum = 0
    ) AS index_key_expression_count,
    ((
      SELECT count(*)::integer
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      WHERE k.ord <= i.indnkeyatts AND k.attnum = 0
    ) > 0) AS has_index_key_expression,
    (
      SELECT array_agg(p.column_name ORDER BY p.ord)
      FROM (
        SELECT k.ord, CASE WHEN k.attnum > 0 THEN a.attname::text ELSE NULL END AS column_name
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        LEFT JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = k.attnum AND k.attnum > 0
        WHERE k.ord <= i.indnkeyatts
      ) p
      WHERE p.column_name IS NOT NULL
    ) AS index_key_columns,
    (
      SELECT array_agg(p.column_name ORDER BY p.ord)
      FROM (
        SELECT k.ord, CASE WHEN k.attnum > 0 THEN a.attname::text ELSE NULL END AS column_name
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        LEFT JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = k.attnum AND k.attnum > 0
        WHERE k.ord > i.indnkeyatts
      ) p
      WHERE p.column_name IS NOT NULL
    ) AS included_columns
  FROM pg_class tc
  JOIN pg_namespace n ON n.oid = tc.relnamespace AND n.nspname = 'public'
  JOIN pg_index i ON i.indrelid = tc.oid
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_am am ON am.oid = ic.relam
  WHERE tc.relname IN (SELECT relation_name FROM required_rel)
),
reply_sessions_id_theme_constraint_ok AS (
  SELECT (SELECT reply_sessions_id_theme_validated_unique_constraint_count FROM fk_flags) = 1
    AS reply_sessions_id_theme_constraint_ok
),
reply_sessions_id_theme_index_ok AS (
  SELECT (
    SELECT count(*)::integer
    FROM index_catalog ic
    WHERE ic.relation_name = 'reply_sessions'
      AND ic.index_name = 'reply_sessions_id_theme_key'
      AND ic.access_method = 'btree'
      AND ic.is_unique
      AND NOT ic.is_primary
      AND ic.is_valid AND ic.is_ready AND ic.is_live
      AND ic.index_key_count = cardinality(ARRAY['id','theme']::text[])
      AND ic.index_key_expression_count = 0
      AND ic.index_key_columns IS NOT DISTINCT FROM ARRAY['id','theme']::text[]
      AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS NOT DISTINCT FROM ARRAY[]::text[]
      AND ic.normalized_predicate IS NULL
  ) = 1 AS reply_sessions_id_theme_index_ok
),
reply_sessions_id_theme_target_ok AS (
  SELECT
    (SELECT reply_sessions_id_theme_constraint_ok FROM reply_sessions_id_theme_constraint_ok)
    OR (SELECT reply_sessions_id_theme_index_ok FROM reply_sessions_id_theme_index_ok)
    AS reply_sessions_id_theme_target_ok
),
reply_sessions_id_theme_acceptance_path AS (
  SELECT CASE
    WHEN (SELECT reply_sessions_id_theme_constraint_ok FROM reply_sessions_id_theme_constraint_ok)
      AND (SELECT reply_sessions_id_theme_index_ok FROM reply_sessions_id_theme_index_ok) THEN 'BOTH'
    WHEN (SELECT reply_sessions_id_theme_constraint_ok FROM reply_sessions_id_theme_constraint_ok) THEN 'CONSTRAINT'
    WHEN (SELECT reply_sessions_id_theme_index_ok FROM reply_sessions_id_theme_index_ok) THEN 'INDEX'
    ELSE NULL
  END AS reply_sessions_id_theme_acceptance_path
),
reply_fk_contract_a_ok AS (
  SELECT ((SELECT reply_documents_single_cascade_count FROM fk_flags)=1
    AND (SELECT reply_documents_composite_restrict_count FROM fk_flags)=1
    AND (SELECT reply_documents_unexpected_composite_count FROM fk_flags)=0
    AND (SELECT reply_sessions_id_theme_target_ok FROM reply_sessions_id_theme_target_ok)) AS reply_fk_contract_a_ok
),
expected_dtr_expanded AS (
  SELECT
    ed.*,
    regexp_replace(lower(btrim(btrim(ed.raw_predicate, '('), ')')), ' +', ' ', 'g') AS expected_normalized_predicate
  FROM expected_dtr_partial_unique ed
),
expected_ledger_expanded AS (
  SELECT
    el.*,
    CASE
      WHEN el.raw_predicate IS NULL THEN NULL
      ELSE regexp_replace(lower(btrim(btrim(el.raw_predicate, '('), ')')), ' +', ' ', 'g')
    END AS expected_normalized_predicate
  FROM expected_ledger_indexes el
),
expected_stripe_processed_expanded AS (
  SELECT
    es.*,
    regexp_replace(lower(btrim(btrim(es.raw_predicate, '('), ')')), ' +', ' ', 'g') AS expected_normalized_predicate
  FROM expected_stripe_processed_indexes es
),
allowed_stripe_processed_redundant_expanded AS (
  SELECT
    ar.*,
    regexp_replace(lower(btrim(btrim(ar.raw_predicate, '('), ')')), ' +', ' ', 'g') AS expected_normalized_predicate,
    CASE
      WHEN ar.raw_predicate IS NULL THEN NULL
      ELSE regexp_replace(
        lower(ar.raw_predicate),
        '[[:space:]()]',
        '',
        'g'
      )
    END AS expected_compact_normalized_predicate
  FROM allowed_stripe_processed_redundant_indexes ar
),
allowed_stripe_processed_redundant_match_base AS (
  SELECT
    ar.index_name,
    ar.relation_name,
    ar.access_method,
    ar.is_primary,
    ar.is_unique,
    ar.key_columns,
    ar.included_columns,
    ar.expected_compact_normalized_predicate,
    ic.index_name AS ic_present,
    (
      ic.index_name IS NOT NULL
      AND ic.relation_name = ar.relation_name
      AND ic.index_name = ar.index_name
      AND ic.access_method = ar.access_method
      AND ic.is_primary = ar.is_primary
      AND ic.is_unique = ar.is_unique
      AND ic.is_valid AND ic.is_ready AND ic.is_live
      AND ic.index_key_count = cardinality(ar.key_columns)
      AND ic.index_key_expression_count = 0
      AND ic.index_key_columns IS NOT DISTINCT FROM ar.key_columns
      AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS NOT DISTINCT FROM COALESCE(ar.included_columns, ARRAY[]::text[])
      AND ic.compact_normalized_predicate IS NOT DISTINCT FROM ar.expected_compact_normalized_predicate
    ) AS allowed_b_exact_ok
  FROM allowed_stripe_processed_redundant_expanded ar
  LEFT JOIN index_catalog ic ON ic.relation_name = ar.relation_name AND ic.index_name = ar.index_name
),
allowed_stripe_processed_redundant_match AS (
  SELECT
    index_name,
    1 AS expected_count,
    count(*) FILTER (WHERE allowed_b_exact_ok)::integer AS matched_count,
    count(*) FILTER (WHERE ic_present IS NOT NULL)::integer AS same_name_present_count,
    count(*) FILTER (WHERE ic_present IS NOT NULL AND allowed_b_exact_ok IS NOT TRUE)::integer AS same_name_mismatch_count
  FROM allowed_stripe_processed_redundant_match_base
  GROUP BY index_name, relation_name, access_method, is_primary, is_unique,
           key_columns, included_columns, expected_compact_normalized_predicate
),
allowed_stripe_processed_redundant_audit AS (
  SELECT
    (
      SELECT COALESCE(array_agg(index_name ORDER BY index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_indexes
    ) AS allowed_redundant_expected_names,
    (SELECT count(*) FROM allowed_stripe_processed_redundant_indexes)::integer AS allowed_redundant_expected_count,
    (
      SELECT COALESCE(array_agg(m.index_name ORDER BY m.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_match m
      WHERE m.matched_count = 1
    ) AS allowed_redundant_exact_present_names,
    (SELECT count(*) FILTER (WHERE matched_count = 1) FROM allowed_stripe_processed_redundant_match)::integer AS allowed_redundant_exact_match_count,
    (
      SELECT COALESCE(array_agg(ar.index_name ORDER BY ar.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_indexes ar
      LEFT JOIN allowed_stripe_processed_redundant_match m ON m.index_name = ar.index_name
      WHERE COALESCE(m.matched_count, 0) = 0 AND COALESCE(m.same_name_present_count, 0) = 0
    ) AS allowed_redundant_absent_names,
    (
      SELECT COALESCE(array_agg(index_name ORDER BY index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_match WHERE matched_count > 1
    ) AS allowed_redundant_duplicate_names,
    (
      SELECT COALESCE(array_agg(m.index_name ORDER BY m.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_match m
      WHERE m.same_name_mismatch_count > 0
    ) AS allowed_redundant_mismatched_names,
    (
      SELECT COALESCE(array_agg(ar.index_name || '=' || ar.expected_compact_normalized_predicate ORDER BY ar.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_expanded ar
    ) AS allowed_redundant_expected_compact_predicates,
    (
      SELECT COALESCE(array_agg(ic.index_name || '=' || ic.compact_normalized_predicate ORDER BY ic.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_indexes ar
      JOIN index_catalog ic ON ic.relation_name = ar.relation_name AND ic.index_name = ar.index_name
    ) AS allowed_redundant_actual_compact_predicates,
    (
      SELECT COALESCE(array_agg(ic.index_name || '=' || ic.index_key_count::text ORDER BY ic.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_indexes ar
      JOIN index_catalog ic ON ic.relation_name = ar.relation_name AND ic.index_name = ar.index_name
    ) AS allowed_redundant_actual_key_count,
    (
      SELECT COALESCE(array_agg(ic.index_name || '=' || ic.index_key_expression_count::text ORDER BY ic.index_name), ARRAY[]::text[])
      FROM allowed_stripe_processed_redundant_indexes ar
      JOIN index_catalog ic ON ic.relation_name = ar.relation_name AND ic.index_name = ar.index_name
    ) AS allowed_redundant_actual_key_expression_count,
    COALESCE((
      SELECT bool_and(
        m.matched_count IN (0, 1)
        AND m.same_name_mismatch_count = 0
        AND m.same_name_present_count <= 1
      )
      FROM allowed_stripe_processed_redundant_match m
    ), true) AS allowed_redundant_contract_ok
),
exact_index_key_shape_self_test_fixtures(
  case_name, actual_index_key_count, actual_index_key_expression_count,
  actual_index_key_columns, expected_key_columns, expected_result
) AS (
  VALUES
    ('01_one_named_key_pass', 1, 0, ARRAY['stripe_event_id']::text[], ARRAY['stripe_event_id']::text[], true),
    ('02_two_named_keys_pass', 2, 0, ARRAY['id','theme']::text[], ARRAY['id','theme']::text[], true),
    ('03_null_key_array_fail', 1, 0, NULL::text[], ARRAY['stripe_event_id']::text[], false),
    ('04_expression_only_key_fail', 1, 1, NULL::text[], ARRAY['stripe_event_id']::text[], false),
    ('05_one_named_plus_expression_fail', 2, 1, ARRAY['stripe_event_id']::text[], ARRAY['stripe_event_id']::text[], false),
    ('06_two_named_plus_expression_fail', 3, 1, ARRAY['id','theme']::text[], ARRAY['id','theme']::text[], false),
    ('07_wrong_one_named_key_fail', 1, 0, ARRAY['checkout_session_id']::text[], ARRAY['stripe_event_id']::text[], false),
    ('08_wrong_two_key_order_fail', 2, 0, ARRAY['theme','id']::text[], ARRAY['id','theme']::text[], false),
    ('09_duplicate_named_key_fail', 2, 0, ARRAY['stripe_event_id']::text[], ARRAY['stripe_event_id']::text[], false)
),
exact_index_key_shape_self_test_eval AS (
  SELECT
    f.*,
    (
      f.actual_index_key_count = cardinality(f.expected_key_columns)
      AND f.actual_index_key_expression_count = 0
      AND f.actual_index_key_columns IS NOT DISTINCT FROM f.expected_key_columns
    ) AS actual_ok,
    (
      (
        f.actual_index_key_count = cardinality(f.expected_key_columns)
        AND f.actual_index_key_expression_count = 0
        AND f.actual_index_key_columns IS NOT DISTINCT FROM f.expected_key_columns
      ) IS NOT DISTINCT FROM f.expected_result
    ) AS matches_expected
  FROM exact_index_key_shape_self_test_fixtures f
),
exact_index_key_shape_self_test AS (
  SELECT
    9 AS expected_case_count,
    (SELECT count(*) FROM exact_index_key_shape_self_test_eval)::integer AS actual_case_count,
    (SELECT count(*) FROM exact_index_key_shape_self_test_eval WHERE matches_expected)::integer AS matched_case_count,
    (SELECT count(*) FROM exact_index_key_shape_self_test_eval WHERE NOT matches_expected)::integer AS mismatched_case_count,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM exact_index_key_shape_self_test_eval WHERE NOT matches_expected
    ) AS mismatched_case_names,
    (
      (SELECT count(*) FROM exact_index_key_shape_self_test_eval) = 9
      AND (SELECT count(*) FROM exact_index_key_shape_self_test_eval WHERE matches_expected) = 9
      AND (SELECT count(*) FROM exact_index_key_shape_self_test_eval WHERE NOT matches_expected) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(case_name), ARRAY[]::text[])
        FROM exact_index_key_shape_self_test_eval WHERE NOT matches_expected
      )) = 0
    ) AS exact_index_key_shape_self_test_ok
),
-- predicate normalization self-test: positive fixtures must normalize to equal,
-- negative fixtures (semantically different predicates) must remain unequal.
predicate_norm_self_test AS (
  SELECT
    regexp_replace(lower(btrim(btrim('(user_hidden_at IS NULL)', '('), ')')), ' +', ' ', 'g')
      = regexp_replace(lower(btrim(btrim('user_hidden_at IS NULL', '('), ')')), ' +', ' ', 'g')
    AS predicate_paren_fixture_ok,
    regexp_replace(lower(btrim(btrim('(stripe_event_id IS NOT NULL)', '('), ')')), ' +', ' ', 'g')
      = regexp_replace(lower(btrim(btrim('stripe_event_id IS NOT NULL', '('), ')')), ' +', ' ', 'g')
    AS predicate_stripe_fixture_ok,
    regexp_replace(lower(btrim(btrim('user_hidden_at IS NULL', '('), ')')), ' +', ' ', 'g')
      <> regexp_replace(lower(btrim(btrim('user_hidden_at IS NOT NULL', '('), ')')), ' +', ' ', 'g')
    AS predicate_negative_fixture_1_ok,
    regexp_replace(lower(btrim(btrim('stripe_event_id IS NOT NULL', '('), ')')), ' +', ' ', 'g')
      <> regexp_replace(lower(btrim(btrim('checkout_session_id IS NOT NULL', '('), ')')), ' +', ' ', 'g')
    AS predicate_negative_fixture_2_ok,
    regexp_replace(
      lower('((stripe_event_id IS NOT NULL) AND (length(btrim(stripe_event_id)) > 0))'),
      '[[:space:]()]', '', 'g'
    ) = regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) AS compound_positive_fixture_ok,
    regexp_replace(
      lower('stripe_event_id IS NOT NULL OR length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) <> regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) AS compound_negative_or_ok,
    regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) >= 0'),
      '[[:space:]()]', '', 'g'
    ) <> regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) AS compound_negative_operator_ok,
    regexp_replace(
      lower('checkout_session_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) <> regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) AS compound_negative_column_ok,
    regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(stripe_event_id) > 0'),
      '[[:space:]()]', '', 'g'
    ) <> regexp_replace(
      lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
      '[[:space:]()]', '', 'g'
    ) AS compound_negative_function_ok,
    (
      regexp_replace(lower(btrim(btrim('(user_hidden_at IS NULL)', '('), ')')), ' +', ' ', 'g')
        = regexp_replace(lower(btrim(btrim('user_hidden_at IS NULL', '('), ')')), ' +', ' ', 'g')
      AND regexp_replace(lower(btrim(btrim('(stripe_event_id IS NOT NULL)', '('), ')')), ' +', ' ', 'g')
        = regexp_replace(lower(btrim(btrim('stripe_event_id IS NOT NULL', '('), ')')), ' +', ' ', 'g')
      AND regexp_replace(lower(btrim(btrim('user_hidden_at IS NULL', '('), ')')), ' +', ' ', 'g')
        <> regexp_replace(lower(btrim(btrim('user_hidden_at IS NOT NULL', '('), ')')), ' +', ' ', 'g')
      AND regexp_replace(lower(btrim(btrim('stripe_event_id IS NOT NULL', '('), ')')), ' +', ' ', 'g')
        <> regexp_replace(lower(btrim(btrim('checkout_session_id IS NOT NULL', '('), ')')), ' +', ' ', 'g')
      AND regexp_replace(
        lower('((stripe_event_id IS NOT NULL) AND (length(btrim(stripe_event_id)) > 0))'),
        '[[:space:]()]', '', 'g'
      ) = regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      )
      AND regexp_replace(
        lower('stripe_event_id IS NOT NULL OR length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      ) <> regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      )
      AND regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) >= 0'),
        '[[:space:]()]', '', 'g'
      ) <> regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      )
      AND regexp_replace(
        lower('checkout_session_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      ) <> regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      )
      AND regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(stripe_event_id) > 0'),
        '[[:space:]()]', '', 'g'
      ) <> regexp_replace(
        lower('stripe_event_id IS NOT NULL AND length(btrim(stripe_event_id)) > 0'),
        '[[:space:]()]', '', 'g'
      )
    ) AS predicate_normalization_self_test_ok
),
index_contract_self_test_registry(case_name, sort_order) AS (
  VALUES
    ('01_constraint_only_pass', 1), ('02_index_only_pass', 2), ('03_constraint_and_index_pass', 3),
    ('04_partial_index_fail', 4), ('05_wrong_key_order_fail', 5), ('06_index_not_valid_fail', 6),
    ('07_index_not_ready_fail', 7), ('08_index_not_live_fail', 8), ('09_include_column_present_fail', 9),
    ('10_required_a_only_pass', 10), ('11_required_a_plus_exact_b_pass', 11), ('12_required_a_missing_b_only_fail', 12),
    ('13_required_a_plus_malformed_same_name_b_fail', 13), ('14_required_a_plus_unknown_same_key_c_fail', 14),
    ('15_required_a_duplicate_fail', 15), ('16_allowed_b_duplicate_fail', 16), ('17_allowed_b_wrong_predicate_fail', 17)
),
index_contract_self_test_fixtures(
  case_name, reply_constraint_count, reply_constraint_validated, reply_index_name,
  reply_index_access_method, reply_index_is_primary, reply_index_is_unique, reply_index_key_columns,
  reply_index_included_columns, reply_index_predicate, reply_index_is_valid, reply_index_is_ready, reply_index_is_live,
  stripe_required_a_match_count, stripe_allowed_b_match_count, stripe_allowed_b_same_name_mismatch_count,
  stripe_unknown_same_key_competing_count, expected_reply_target_ok, expected_stripe_contract_ok, expected_case_ok
) AS (
  VALUES
    ('01_constraint_only_pass', 1, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, 0, true, true, true),
    ('02_index_only_pass', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 0, 0, true, true, true),
    ('03_constraint_and_index_pass', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 0, 0, true, true, true),
    ('04_partial_index_fail', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], 'id is not null', true, true, true, 1, 0, 0, 0, false, true, true),
    ('05_wrong_key_order_fail', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['theme','id']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 0, 0, false, true, true),
    ('06_index_not_valid_fail', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, false, true, true, 1, 0, 0, 0, false, true, true),
    ('07_index_not_ready_fail', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, false, true, 1, 0, 0, 0, false, true, true),
    ('08_index_not_live_fail', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, false, 1, 0, 0, 0, false, true, true),
    ('09_include_column_present_fail', 0, false, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY['theme']::text[], NULL, true, true, true, 1, 0, 0, 0, false, true, true),
    ('10_required_a_only_pass', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 0, 0, true, true, true),
    ('11_required_a_plus_exact_b_pass', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 1, 0, 0, true, true, true),
    ('12_required_a_missing_b_only_fail', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 0, 1, 0, 0, true, false, true),
    ('13_required_a_plus_malformed_same_name_b_fail', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 1, 0, true, false, true),
    ('14_required_a_plus_unknown_same_key_c_fail', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 0, 1, true, false, true),
    ('15_required_a_duplicate_fail', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 2, 0, 0, 0, true, false, true),
    ('16_allowed_b_duplicate_fail', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 2, 0, 0, true, false, true),
    ('17_allowed_b_wrong_predicate_fail', 1, true, 'reply_sessions_id_theme_key', 'btree', false, true, ARRAY['id','theme']::text[], ARRAY[]::text[], NULL, true, true, true, 1, 0, 1, 0, true, false, true)
),
index_contract_self_test_eval AS (
  SELECT
    f.*,
    (f.reply_constraint_count = 1 AND f.reply_constraint_validated) AS computed_reply_constraint_ok,
    (
      f.reply_index_name = 'reply_sessions_id_theme_key'
      AND f.reply_index_access_method = 'btree'
      AND f.reply_index_is_primary IS FALSE
      AND f.reply_index_is_unique IS TRUE
      AND f.reply_index_key_columns = ARRAY['id','theme']::text[]
      AND COALESCE(f.reply_index_included_columns, ARRAY[]::text[]) = ARRAY[]::text[]
      AND f.reply_index_predicate IS NULL
      AND f.reply_index_is_valid IS TRUE
      AND f.reply_index_is_ready IS TRUE
      AND f.reply_index_is_live IS TRUE
    ) AS computed_reply_index_ok,
    (
      (f.reply_constraint_count = 1 AND f.reply_constraint_validated)
      OR (
        f.reply_index_name = 'reply_sessions_id_theme_key'
        AND f.reply_index_access_method = 'btree'
        AND f.reply_index_is_primary IS FALSE
        AND f.reply_index_is_unique IS TRUE
        AND f.reply_index_key_columns = ARRAY['id','theme']::text[]
        AND COALESCE(f.reply_index_included_columns, ARRAY[]::text[]) = ARRAY[]::text[]
        AND f.reply_index_predicate IS NULL
        AND f.reply_index_is_valid IS TRUE
        AND f.reply_index_is_ready IS TRUE
        AND f.reply_index_is_live IS TRUE
      )
    ) AS computed_reply_target_ok,
    (
      f.stripe_required_a_match_count = 1
      AND f.stripe_allowed_b_same_name_mismatch_count = 0
      AND f.stripe_unknown_same_key_competing_count = 0
      AND f.stripe_allowed_b_match_count IN (0, 1)
    ) AS computed_stripe_contract_ok
  FROM index_contract_self_test_fixtures f
),
index_contract_self_test_scored AS (
  SELECT
    ev.*,
    (
      ev.computed_reply_target_ok IS NOT DISTINCT FROM ev.expected_reply_target_ok
      AND ev.computed_stripe_contract_ok IS NOT DISTINCT FROM ev.expected_stripe_contract_ok
    ) AS actual_case_ok,
    (
      (
        ev.computed_reply_target_ok IS NOT DISTINCT FROM ev.expected_reply_target_ok
        AND ev.computed_stripe_contract_ok IS NOT DISTINCT FROM ev.expected_stripe_contract_ok
      ) IS NOT DISTINCT FROM ev.expected_case_ok
    ) AS matches_expected
  FROM index_contract_self_test_eval ev
),
index_contract_self_test_summary AS (
  SELECT
    (SELECT count(*) FROM index_contract_self_test_registry)::integer AS expected_case_count,
    (SELECT count(*) FROM index_contract_self_test_scored)::integer AS actual_case_count,
    (SELECT count(*) FROM index_contract_self_test_scored WHERE matches_expected)::integer AS matched_case_count,
    (SELECT count(*) FROM index_contract_self_test_scored WHERE NOT matches_expected)::integer AS mismatched_case_count,
    (
      SELECT COALESCE(array_agg(reg.case_name ORDER BY reg.sort_order), ARRAY[]::text[])
      FROM index_contract_self_test_registry reg
      LEFT JOIN index_contract_self_test_scored ev ON ev.case_name = reg.case_name
      WHERE ev.case_name IS NULL
    ) AS missing_case_names,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM (SELECT case_name FROM index_contract_self_test_scored GROUP BY case_name HAVING count(*) > 1) d
    ) AS duplicate_case_names,
    (
      SELECT COALESCE(array_agg(ev.case_name ORDER BY ev.case_name), ARRAY[]::text[])
      FROM index_contract_self_test_scored ev
      LEFT JOIN index_contract_self_test_registry reg ON reg.case_name = ev.case_name
      WHERE reg.case_name IS NULL
    ) AS unexpected_case_names,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM index_contract_self_test_scored WHERE NOT matches_expected
    ) AS mismatched_case_names,
    (
      (SELECT count(*) FROM index_contract_self_test_registry) = 17
      AND (SELECT count(*) FROM index_contract_self_test_scored) = 17
      AND (SELECT count(*) FROM index_contract_self_test_scored WHERE matches_expected) = 17
      AND (SELECT count(*) FROM index_contract_self_test_scored WHERE NOT matches_expected) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(reg.case_name), ARRAY[]::text[])
        FROM index_contract_self_test_registry reg
        LEFT JOIN index_contract_self_test_scored ev ON ev.case_name = reg.case_name
        WHERE ev.case_name IS NULL
      )) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(case_name), ARRAY[]::text[])
        FROM (SELECT case_name FROM index_contract_self_test_scored GROUP BY case_name HAVING count(*) > 1) d
      )) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(ev.case_name), ARRAY[]::text[])
        FROM index_contract_self_test_scored ev
        LEFT JOIN index_contract_self_test_registry reg ON reg.case_name = ev.case_name
        WHERE reg.case_name IS NULL
      )) = 0
    ) AS index_contract_self_test_ok
),
expected_dtr_match AS (
  SELECT
    ed.index_name,
    count(ic.index_name) FILTER (
      WHERE ic.relation_name = 'dtr_report_snapshots'
        AND ic.index_name = ed.index_name
        AND ic.access_method = ed.access_method
        AND ic.is_unique = ed.is_unique
        AND ic.is_primary = ed.is_primary
        AND ic.is_valid AND ic.is_ready AND ic.is_live
        AND ic.index_key_count = cardinality(ed.key_columns)
        AND ic.index_key_expression_count = 0
        AND ic.index_key_columns IS NOT DISTINCT FROM ed.key_columns
        AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS NOT DISTINCT FROM COALESCE(ed.included_columns, ARRAY[]::text[])
        AND ic.normalized_predicate = ed.expected_normalized_predicate
    )::integer AS matched_count
  FROM expected_dtr_expanded ed
  LEFT JOIN index_catalog ic ON ic.index_name = ed.index_name
  GROUP BY ed.index_name, ed.access_method, ed.is_unique, ed.is_primary,
           ed.key_columns, ed.included_columns, ed.expected_normalized_predicate
),
dtr_partial_ok AS (
  SELECT
    (SELECT matched_count FROM expected_dtr_match)::integer AS dtr_visible_partial_unique_count,
    -- same-purpose competing only: exact key-shape match, unique=true, different index name.
    (
      SELECT count(*)::integer
      FROM index_catalog ic
      CROSS JOIN expected_dtr_expanded ed
      WHERE ic.relation_name = 'dtr_report_snapshots'
        AND ic.is_unique
        AND ic.index_key_count = cardinality(ed.key_columns)
        AND ic.index_key_expression_count = 0
        AND ic.index_key_columns IS NOT DISTINCT FROM ed.key_columns
        AND ic.index_name <> ed.index_name
    ) AS dtr_same_purpose_competing_count,
    -- freeze inventory only (not a hard conflict)
    (
      SELECT COALESCE(array_agg(ic.index_name ORDER BY ic.index_name), ARRAY[]::text[])
      FROM index_catalog ic
      CROSS JOIN expected_dtr_expanded ed
      WHERE ic.relation_name = 'dtr_report_snapshots'
        AND ic.index_name <> ed.index_name
        AND NOT (
          ic.is_unique
          AND ic.index_key_count = cardinality(ed.key_columns)
          AND ic.index_key_expression_count = 0
          AND ic.index_key_columns IS NOT DISTINCT FROM ed.key_columns
        )
    ) AS dtr_unrelated_additional_indexes
),
dtr_visible_partial_unique_ok AS (
  SELECT
    (SELECT dtr_visible_partial_unique_count FROM dtr_partial_ok) = 1
    AND (SELECT dtr_same_purpose_competing_count FROM dtr_partial_ok) = 0
    AS dtr_visible_partial_unique_ok
),
ledger_idx_match AS (
  SELECT
    el.index_name,
    count(ic.index_name) FILTER (
      WHERE ic.relation_name = 'reply_wallet_ledgers'
        AND ic.index_name = el.index_name
        AND ic.access_method = el.access_method
        AND ic.is_unique = el.is_unique
        AND ic.is_primary = el.is_primary
        AND ic.is_valid AND ic.is_ready AND ic.is_live
        AND ic.index_key_count = cardinality(el.key_columns)
        AND ic.index_key_expression_count = 0
        AND ic.index_key_columns IS NOT DISTINCT FROM el.key_columns
        AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS NOT DISTINCT FROM COALESCE(el.included_columns, ARRAY[]::text[])
        AND (
          (NOT el.is_partial AND ic.normalized_predicate IS NULL)
          OR (el.is_partial AND ic.normalized_predicate = el.expected_normalized_predicate)
        )
    )::integer AS matched_count,
    -- same-name index present but failing exact contract (hard conflict signal)
    count(ic.index_name) FILTER (
      WHERE ic.relation_name = 'reply_wallet_ledgers'
        AND ic.index_name = el.index_name
    )::integer AS same_name_present_count,
    -- INCLUDE-specific mismatch detail (same-name index whose include set differs)
    count(ic.index_name) FILTER (
      WHERE ic.relation_name = 'reply_wallet_ledgers'
        AND ic.index_name = el.index_name
        AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS DISTINCT FROM COALESCE(el.included_columns, ARRAY[]::text[])
    )::integer AS included_columns_mismatch_count
  FROM expected_ledger_expanded el
  LEFT JOIN index_catalog ic ON ic.index_name = el.index_name
  GROUP BY el.index_name, el.access_method, el.is_unique, el.is_primary,
           el.key_columns, el.included_columns, el.expected_normalized_predicate, el.is_partial
),
ledger_idx_ok AS (
  SELECT
    count(*) FILTER (WHERE matched_count = 1)::integer AS ledger_expected_matched_count,
    (SELECT count(*) FROM expected_ledger_indexes)::integer AS ledger_expected_count,
    COALESCE(sum(included_columns_mismatch_count), 0)::integer AS ledger_included_columns_mismatch_count,
    bool_and(matched_count = 1) AS ledger_critical_indexes_ok
  FROM ledger_idx_match
),
-- unrelated additional indexes on reply_wallet_ledgers: freeze inventory only
ledger_unrelated_inventory AS (
  SELECT
    COALESCE(array_agg(ic.index_name ORDER BY ic.index_name), ARRAY[]::text[]) AS ledger_unrelated_additional_indexes
  FROM index_catalog ic
  WHERE ic.relation_name = 'reply_wallet_ledgers'
    AND ic.index_name NOT IN (SELECT index_name FROM expected_ledger_indexes)
),
stripe_processed_idx_match AS (
  SELECT
    es.index_name,
    es.expected_count,
    count(ic.index_name) FILTER (
      WHERE ic.relation_name = es.relation_name
        AND ic.index_name = es.index_name
        AND ic.access_method = es.access_method
        AND ic.is_primary = es.is_primary
        AND ic.is_unique = es.is_unique
        AND (NOT es.is_valid_required OR ic.is_valid)
        AND (NOT es.is_ready_required OR ic.is_ready)
        AND (NOT es.is_live_required OR ic.is_live)
        AND ic.index_key_count = cardinality(es.key_columns)
        AND ic.index_key_expression_count = 0
        AND ic.index_key_columns IS NOT DISTINCT FROM es.key_columns
        AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS NOT DISTINCT FROM COALESCE(es.included_columns, ARRAY[]::text[])
        AND (
          (NOT es.predicate_required AND ic.normalized_predicate IS NULL)
          OR (es.predicate_required AND ic.normalized_predicate = es.expected_normalized_predicate)
        )
    )::integer AS matched_count
  FROM expected_stripe_processed_expanded es
  LEFT JOIN index_catalog ic ON ic.index_name = es.index_name
  GROUP BY es.index_name, es.relation_name, es.access_method, es.is_primary, es.is_unique,
           es.key_columns, es.included_columns, es.expected_normalized_predicate,
           es.predicate_required, es.expected_count,
           es.is_valid_required, es.is_ready_required, es.is_live_required
),
stripe_exact_accepted_index_names AS (
  SELECT index_name FROM stripe_processed_idx_match WHERE matched_count = expected_count
  UNION
  SELECT index_name FROM allowed_stripe_processed_redundant_match WHERE matched_count = 1
),
stripe_processed_expected_audit AS (
  SELECT
    (
      SELECT COALESCE(array_agg(index_name ORDER BY index_name), ARRAY[]::text[])
      FROM stripe_processed_idx_match WHERE matched_count = 0
    ) AS missing_expected_indexes,
    (
      SELECT COALESCE(array_agg(index_name ORDER BY index_name), ARRAY[]::text[])
      FROM stripe_processed_idx_match WHERE matched_count > expected_count
    ) AS duplicate_expected_indexes,
    (
      SELECT COALESCE(array_agg(m.index_name ORDER BY m.index_name), ARRAY[]::text[])
      FROM stripe_processed_idx_match m
      WHERE m.matched_count <> m.expected_count
        AND EXISTS (
          SELECT 1 FROM index_catalog ic
          WHERE ic.relation_name = 'stripe_processed_events' AND ic.index_name = m.index_name
        )
    ) AS mismatched_expected_indexes
),
stripe_proc_idx AS (
  SELECT
    (SELECT sum(matched_count)::integer FROM stripe_processed_idx_match) AS stripe_processed_partial_unique_count,
    -- PRIMARY KEY contract (expected ABSENT per accepted Production evidence):
    -- count actual primary-key indexes on stripe_processed_events.
    count(*) FILTER (
      WHERE ic.relation_name = 'stripe_processed_events'
        AND ic.is_primary
    )::integer AS stripe_processed_primary_key_index_count,
    -- same-purpose competing only: same relation, same idempotency key columns,
    -- unique=true, not the expected index. PRIMARY KEY indexes and unique indexes
    -- on other key columns are NOT counted here.
    count(*) FILTER (
      WHERE ic.relation_name = 'stripe_processed_events'
        AND ic.is_unique
        AND NOT ic.is_primary
        AND ic.index_key_count = cardinality(ARRAY['stripe_event_id']::text[])
        AND ic.index_key_expression_count = 0
        AND ic.index_key_columns IS NOT DISTINCT FROM ARRAY['stripe_event_id']::text[]
        AND ic.index_name NOT IN (SELECT index_name FROM stripe_exact_accepted_index_names)
    )::integer AS stripe_processed_same_purpose_competing_count,
    (
      SELECT allowed_redundant_exact_present_names FROM allowed_stripe_processed_redundant_audit
    ) AS stripe_processed_allowed_redundant_exact_present_names,
    -- freeze inventory only (not a hard conflict)
    (
      SELECT COALESCE(array_agg(ic2.index_name ORDER BY ic2.index_name), ARRAY[]::text[])
      FROM index_catalog ic2
      WHERE ic2.relation_name = 'stripe_processed_events'
        AND ic2.index_name NOT IN (SELECT index_name FROM stripe_exact_accepted_index_names)
        AND NOT ic2.is_primary
        AND NOT (
          ic2.is_unique
          AND ic2.index_key_count = cardinality(ARRAY['stripe_event_id']::text[])
          AND ic2.index_key_expression_count = 0
          AND ic2.index_key_columns IS NOT DISTINCT FROM ARRAY['stripe_event_id']::text[]
        )
    ) AS stripe_processed_unrelated_additional_indexes
  FROM index_catalog ic
),
stripe_processed_pk_contract_ok AS (
  SELECT
    (SELECT stripe_processed_primary_key_index_count FROM stripe_proc_idx)
      = (SELECT expected_primary_key_index_count FROM expected_stripe_processed_pk)
    AS stripe_processed_pk_contract_ok
),
stripe_processed_index_contract_ok AS (
  SELECT
    (SELECT count(*) FROM expected_stripe_processed_indexes) > 0
    AND (SELECT bool_and(matched_count = expected_count) FROM stripe_processed_idx_match)
    AND cardinality((SELECT missing_expected_indexes FROM stripe_processed_expected_audit)) = 0
    AND cardinality((SELECT duplicate_expected_indexes FROM stripe_processed_expected_audit)) = 0
    AND (SELECT stripe_processed_same_purpose_competing_count FROM stripe_proc_idx) = 0
    AND (SELECT stripe_processed_pk_contract_ok FROM stripe_processed_pk_contract_ok)
    AND (SELECT allowed_redundant_contract_ok FROM allowed_stripe_processed_redundant_audit)
    AS stripe_processed_index_contract_ok
),
matrix_usage_audit AS (
  SELECT
    (SELECT count(*) FROM expected_dtr_partial_unique)::integer AS dtr_expected_row_count,
    (SELECT count(*) FILTER (WHERE matched_count = 1) FROM expected_dtr_match)::integer AS dtr_matched_row_count,
    (SELECT count(*) FROM expected_ledger_indexes)::integer AS ledger_expected_row_count,
    (SELECT ledger_expected_matched_count FROM ledger_idx_ok)::integer AS ledger_matched_row_count,
    (SELECT count(*) FROM expected_stripe_processed_indexes)::integer AS stripe_processed_expected_row_count,
    (SELECT count(*) FILTER (WHERE matched_count = expected_count) FROM stripe_processed_idx_match)::integer AS stripe_processed_matched_row_count,
    (SELECT allowed_redundant_expected_count FROM allowed_stripe_processed_redundant_audit)::integer AS stripe_processed_allowed_redundant_row_count,
    (SELECT allowed_redundant_exact_match_count FROM allowed_stripe_processed_redundant_audit)::integer AS stripe_processed_allowed_redundant_exact_match_count,
    (SELECT count(*) FROM stripe_events_optional_cols)::integer AS stripe_optional_expected_row_count,
    (SELECT count(*) FROM stripe_optional_eval)::integer AS stripe_optional_actual_row_count
),
index_rel AS (
  SELECT r.relation_name, c.oid AS relation_oid,
    COALESCE(count(i.indexrelid),0)::integer AS index_count,
    COALESCE(bool_and(pg_get_indexdef(ic.oid) IS NOT NULL),true) AS index_definition_state_known
  FROM required_rel r LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.relation_name
  LEFT JOIN pg_index i ON i.indrelid=c.oid LEFT JOIN pg_class ic ON ic.oid=i.indexrelid
  GROUP BY r.relation_name,c.oid
),
index_contract_state_known AS (
  SELECT bool_and(relation_oid IS NOT NULL) AND bool_and(index_definition_state_known) AS index_contract_state_known FROM index_rel
),
policy_rows AS (
  SELECT
    r.relation_name,
    c.oid AS relation_oid,
    p.oid AS policy_oid,
    (p.oid IS NOT NULL) AS policy_exists,
    CASE WHEN p.oid IS NULL THEN NULL ELSE p.polname::text END AS policy_name,
    CASE WHEN p.oid IS NULL THEN NULL ELSE CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' ELSE p.polcmd::text END END AS command,
    CASE WHEN p.oid IS NULL THEN NULL ELSE CASE p.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END END AS permissive_restrictive,
    CASE WHEN p.oid IS NULL THEN NULL ELSE (SELECT array_agg(CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END ORDER BY role_oid) FROM unnest(p.polroles) AS role_oid) END AS roles,
    CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_expr(p.polqual, p.polrelid) END AS using_expression,
    CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_expr(p.polwithcheck, p.polrelid) END AS with_check_expression,
    CASE WHEN p.oid IS NULL THEN NULL ELSE (pg_get_expr(p.polqual, p.polrelid) IS NOT NULL) END AS using_present,
    CASE WHEN p.oid IS NULL THEN NULL ELSE (pg_get_expr(p.polwithcheck, p.polrelid) IS NOT NULL) END AS with_check_present,
    CASE WHEN p.oid IS NULL THEN true WHEN p.oid IS NOT NULL THEN true ELSE false END AS using_state_known,
    CASE WHEN p.oid IS NULL THEN true WHEN p.oid IS NOT NULL THEN true ELSE false END AS with_check_state_known
  FROM required_rel r
  JOIN pg_namespace n ON n.nspname = 'public'
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
),
policy_rel AS (
  SELECT
    pr.relation_name,
    pr.relation_oid,
    count(*) FILTER (WHERE pr.policy_exists)::integer AS policy_count,
    count(*)::integer AS policy_catalog_row_count,
    NOT EXISTS (
      SELECT 1
      FROM policy_rows pr2
      WHERE pr2.relation_name = pr.relation_name AND pr2.policy_exists
      GROUP BY pr2.policy_name
      HAVING count(*) > 1
    ) AS no_duplicate_policy_names,
    bool_and(
      CASE
        WHEN NOT pr.policy_exists THEN true
        WHEN pr.policy_exists AND pr.command IS NOT NULL AND pr.permissive_restrictive IS NOT NULL
          AND pr.roles IS NOT NULL AND pr.using_state_known AND pr.with_check_state_known THEN true
        ELSE false
      END
    ) AS policy_expression_state_known
  FROM policy_rows pr
  GROUP BY pr.relation_name, pr.relation_oid
),
policy_contract_state_known AS (
  SELECT bool_and(relation_oid IS NOT NULL) AND bool_and(no_duplicate_policy_names) AND bool_and(policy_expression_state_known) AS policy_contract_state_known FROM policy_rel
),
priv_matrix AS (
  SELECT
    r.relation_name,
    rr.role_name,
    CASE WHEN rr.role_name = 'PUBLIC' THEN 'public' ELSE rr.role_name END AS role_eval_name,
    rp.privilege_name,
    c.oid AS relation_oid
  FROM required_rel r
  CROSS JOIN required_roles rr
  CROSS JOIN required_priv rp
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
),
grant_agg AS (
  SELECT tp.table_name, tp.grantee, tp.privilege_type, count(*)::integer AS explicit_grant_rows,
    bool_or(tp.is_grantable='YES') AS explicit_grant_is_grantable, array_agg(DISTINCT tp.grantor::text ORDER BY tp.grantor::text) AS grantors
  FROM information_schema.table_privileges tp
  WHERE tp.table_schema='public' AND tp.table_name IN (SELECT relation_name FROM required_rel)
    AND tp.grantee IN (SELECT role_name FROM required_roles) AND tp.privilege_type IN (SELECT privilege_name FROM required_priv)
  GROUP BY tp.table_name, tp.grantee, tp.privilege_type
),
priv_eval AS (
  SELECT
    pm.relation_name,
    pm.role_name,
    pm.role_eval_name,
    pm.privilege_name,
    pm.relation_oid,
    (pm.role_name = 'PUBLIC' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = pm.role_name)) AS role_exists,
    CASE
      WHEN pm.relation_oid IS NULL OR (pm.role_name <> 'PUBLIC' AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = pm.role_name)) THEN NULL
      ELSE has_table_privilege(pm.role_eval_name, pm.relation_oid, pm.privilege_name)
    END AS effective_privilege,
    COALESCE(ga.explicit_grant_rows > 0, false) AS explicit_grant_present,
    CASE WHEN COALESCE(ga.explicit_grant_rows, 0) > 0 THEN ga.explicit_grant_is_grantable ELSE NULL END AS explicit_grant_is_grantable,
    COALESCE(ga.grantors, ARRAY[]::text[]) AS grantor,
    (
      pm.relation_oid IS NOT NULL
      AND (pm.role_name = 'PUBLIC' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = pm.role_name))
      AND has_table_privilege(pm.role_eval_name, pm.relation_oid, pm.privilege_name) IS NOT NULL
    ) AS grant_source_known,
    (
      pm.relation_oid IS NOT NULL
      AND (pm.role_name = 'PUBLIC' OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = pm.role_name))
      AND has_table_privilege(pm.role_eval_name, pm.relation_oid, pm.privilege_name) IS NOT NULL
    ) AS privilege_state_known
  FROM priv_matrix pm
  LEFT JOIN grant_agg ga
    ON ga.table_name = pm.relation_name AND ga.grantee = pm.role_name AND ga.privilege_type = pm.privilege_name
),
priv_flags AS (
  SELECT 420 AS expected_privilege_cells, count(*)::integer AS actual_privilege_cells,
    count(*) FILTER (WHERE NOT privilege_state_known)::integer AS unknown_privilege_cell_count,
    count(*) - count(DISTINCT (relation_name,role_name,privilege_name))::integer AS duplicate_privilege_cell_count,
    bool_and(privilege_state_known) AS privilege_contract_state_known,
    bool_and(CASE WHEN relation_name='failed_fulfillments' AND role_name='anon' AND privilege_name IN ('SELECT','INSERT','UPDATE','DELETE') THEN effective_privilege=true
                  WHEN relation_name='failed_fulfillments' AND role_name='authenticated' AND privilege_name IN ('SELECT','INSERT','UPDATE','DELETE') THEN effective_privilege=true ELSE true END) AS failed_fulfillments_pre_apply_privileges_ok
  FROM priv_eval
),
entitlements_public_select_policy_review AS (
  SELECT
    count(*) FILTER (
      WHERE pr.relation_name = 'entitlements'
        AND pr.policy_exists
        AND pr.command IN ('SELECT', 'ALL')
        AND pr.permissive_restrictive = 'PERMISSIVE'
        AND 'PUBLIC' = ANY(pr.roles)
        AND lower(btrim(btrim(COALESCE(pr.using_expression, ''), '('), ')')) = 'true'
    )::integer AS entitlements_public_select_true_policy_count,
    (
      SELECT COALESCE(array_agg(pr.policy_name ORDER BY pr.policy_name), ARRAY[]::text[])
      FROM policy_rows pr
      WHERE pr.relation_name = 'entitlements'
        AND pr.policy_exists
        AND pr.command IN ('SELECT', 'ALL')
        AND pr.permissive_restrictive = 'PERMISSIVE'
        AND 'PUBLIC' = ANY(pr.roles)
        AND lower(btrim(btrim(COALESCE(pr.using_expression, ''), '('), ')')) = 'true'
    ) AS entitlements_public_select_true_policy_names,
    bool_and(
      CASE
        WHEN NOT pr.policy_exists THEN true
        WHEN pr.command IS NOT NULL AND pr.permissive_restrictive IS NOT NULL
          AND pr.roles IS NOT NULL AND pr.using_state_known THEN true
        ELSE false
      END
    ) AS entitlements_public_select_true_policy_state_known
  FROM policy_rows pr
  WHERE pr.relation_name = 'entitlements'
),
entitlements_exact_same_key_unique AS (
  SELECT ic.index_oid, ic.index_name
  FROM index_catalog ic
  WHERE ic.relation_name = 'entitlements'
    AND ic.access_method = 'btree'
    AND NOT ic.is_primary
    AND ic.is_unique
    AND ic.index_key_count = cardinality(ARRAY['user_id','product_id']::text[])
    AND ic.index_key_expression_count = 0
    AND ic.index_key_columns IS NOT DISTINCT FROM ARRAY['user_id','product_id']::text[]
    AND COALESCE(ic.included_columns, ARRAY[]::text[]) IS NOT DISTINCT FROM ARRAY[]::text[]
    AND ic.normalized_predicate IS NULL
    AND ic.is_valid AND ic.is_ready AND ic.is_live
),
constraint_backed_index_oids AS (
  SELECT con.conindid AS index_oid
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE c.relname IN (SELECT relation_name FROM required_rel)
    AND con.conindid <> 0
),
entitlements_security_review AS (
  SELECT
    (
      SELECT entitlements_public_select_true_policy_count > 0
        AND COALESCE((
          SELECT effective_privilege FROM priv_eval
          WHERE relation_name = 'entitlements' AND role_name = 'anon' AND privilege_name = 'SELECT'
        ), false)
      FROM entitlements_public_select_policy_review
    ) AS entitlements_anon_full_select_exposure,
    (
      SELECT entitlements_public_select_true_policy_count > 0
        AND COALESCE((
          SELECT effective_privilege FROM priv_eval
          WHERE relation_name = 'entitlements' AND role_name = 'authenticated' AND privilege_name = 'SELECT'
        ), false)
      FROM entitlements_public_select_policy_review
    ) AS entitlements_authenticated_full_select_exposure,
    COALESCE((
      SELECT effective_privilege FROM priv_eval
      WHERE relation_name = 'entitlements' AND role_name = 'anon' AND privilege_name = 'SELECT'
    ), false) AS entitlements_anon_effective_select,
    COALESCE((
      SELECT effective_privilege FROM priv_eval
      WHERE relation_name = 'entitlements' AND role_name = 'authenticated' AND privilege_name = 'SELECT'
    ), false) AS entitlements_authenticated_effective_select,
    (SELECT entitlements_public_select_true_policy_count FROM entitlements_public_select_policy_review) AS entitlements_public_select_true_policy_count,
    (SELECT entitlements_public_select_true_policy_names FROM entitlements_public_select_policy_review) AS entitlements_public_select_true_policy_names,
    (SELECT entitlements_public_select_true_policy_state_known FROM entitlements_public_select_policy_review) AS entitlements_public_select_true_policy_state_known,
    (SELECT count(*)::integer FROM entitlements_exact_same_key_unique) AS entitlements_exact_same_key_unique_count,
    (SELECT COALESCE(array_agg(index_name ORDER BY index_name), ARRAY[]::text[]) FROM entitlements_exact_same_key_unique) AS entitlements_exact_same_key_unique_names,
    (SELECT count(*)::integer FROM entitlements_exact_same_key_unique e JOIN constraint_backed_index_oids cb ON cb.index_oid = e.index_oid) AS entitlements_constraint_backed_unique_count,
    (SELECT COALESCE(array_agg(e.index_name ORDER BY e.index_name), ARRAY[]::text[])
     FROM entitlements_exact_same_key_unique e JOIN constraint_backed_index_oids cb ON cb.index_oid = e.index_oid) AS entitlements_constraint_backed_unique_names,
    (SELECT count(*)::integer FROM entitlements_exact_same_key_unique e LEFT JOIN constraint_backed_index_oids cb ON cb.index_oid = e.index_oid WHERE cb.index_oid IS NULL) AS entitlements_nonconstraint_duplicate_unique_count,
    (SELECT COALESCE(array_agg(e.index_name ORDER BY e.index_name), ARRAY[]::text[])
     FROM entitlements_exact_same_key_unique e LEFT JOIN constraint_backed_index_oids cb ON cb.index_oid = e.index_oid WHERE cb.index_oid IS NULL) AS entitlements_nonconstraint_duplicate_unique_names,
    (SELECT count(*)::integer FROM entitlements_exact_same_key_unique) > 1 AS entitlements_redundant_same_key_unique_indexes
),
failed_fulfillments_pre_apply_contract_ok AS (
  SELECT (
    (SELECT relrowsecurity FROM rel_meta WHERE relation_name = 'failed_fulfillments') = true
    AND (SELECT relforcerowsecurity FROM rel_meta WHERE relation_name = 'failed_fulfillments') = false
    AND (SELECT policy_count FROM policy_rel WHERE relation_name = 'failed_fulfillments') = 0
    AND (SELECT failed_fulfillments_pre_apply_privileges_ok FROM priv_flags)
  ) AS failed_fulfillments_pre_apply_contract_ok
),
func_eval AS (
  SELECT
    ef.*,
    p.oid AS function_oid,
    (p.oid IS NOT NULL) AS function_exists,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_result(p.oid) AS result_type,
    pg_get_userbyid(p.proowner) AS owner_role,
    (p.oid IS NOT NULL AND pg_get_userbyid(p.proowner) IS NOT NULL) AS owner_state_known,
    CASE
      WHEN ef.owner_freeze_mode = 'EXPECTED_EXACT' THEN (pg_get_userbyid(p.proowner)::text = ef.expected_owner)
      ELSE NULL
    END AS owner_exact_match,
    p.prosecdef AS security_definer,
    p.proconfig,
    COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) s), ARRAY[]::text[]) AS proconfig_actual_normalized,
    (SELECT array_agg(s ORDER BY s) FROM unnest(ef.expected_proconfig) s) AS proconfig_expected_normalized,
    (p.oid IS NOT NULL) AS proconfig_state_known,
    (
      p.oid IS NOT NULL
      AND COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) s), ARRAY[]::text[])
        = (SELECT array_agg(s ORDER BY s) FROM unnest(ef.expected_proconfig) s)
    ) AS proconfig_exact_match,
    (
      SELECT COALESCE(array_agg(s ORDER BY s), ARRAY[]::text[])
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) s
      WHERE s <> ALL (ef.expected_proconfig)
    ) AS unexpected_proconfig_entries,
    (
      SELECT COALESCE(array_agg(s ORDER BY s), ARRAY[]::text[])
      FROM unnest(ef.expected_proconfig) s
      WHERE s <> ALL (COALESCE(p.proconfig, ARRAY[]::text[]))
    ) AS missing_proconfig_entries,
    (SELECT setting FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) s(setting) WHERE s.setting LIKE 'search_path=%' LIMIT 1) AS search_path,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
    (
      SELECT count(*)::integer
      FROM pg_proc px
      JOIN pg_namespace nx ON nx.oid = px.pronamespace AND nx.nspname = 'public'
      WHERE px.proname = ef.function_name
    ) AS overload_count,
    (
      SELECT count(*)::integer
      FROM pg_proc px
      JOIN pg_namespace nx ON nx.oid = px.pronamespace AND nx.nspname = 'public'
      WHERE px.proname = ef.function_name AND pg_get_function_identity_arguments(px.oid) = ef.expected_identity_arguments
    ) AS duplicate_exact_signature_count
  FROM expected_functions ef
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_proc p
    ON p.pronamespace = n.oid
   AND p.proname = ef.function_name
   AND pg_get_function_identity_arguments(p.oid) = ef.expected_identity_arguments
),
func_flags AS (
  SELECT
    count(*) FILTER (
      WHERE function_exists
        AND identity_arguments = expected_identity_arguments
        AND result_type = expected_result_type
        AND security_definer = expected_security_definer
        AND search_path = expected_search_path
        AND service_role_execute
        AND overload_count = 1
        AND duplicate_exact_signature_count = 1
    )::integer AS exact_function_match_count,
    bool_and(overload_count <= 1) AS no_duplicate_overload_ambiguity,
    bool_and(owner_state_known) AS function_owner_state_known,
    -- owner contract per freeze mode:
    --   EXPECTED_EXACT -> owner_exact_match must be true
    --   ACTUAL_FREEZE  -> owner_state_known suffices (actual owner frozen as evidence)
    bool_and(
      CASE
        WHEN owner_freeze_mode = 'EXPECTED_EXACT' THEN COALESCE(owner_exact_match, false)
        ELSE owner_state_known
      END
    ) AS function_owner_contract_ok,
    bool_and(proconfig_state_known) AS function_proconfig_state_known,
    -- proconfig contract per freeze mode:
    --   EXPECTED_EXACT -> full normalized proconfig array must match exactly
    bool_and(
      CASE
        WHEN proconfig_freeze_mode = 'EXPECTED_EXACT' THEN proconfig_exact_match
        ELSE proconfig_state_known
      END
    ) AS function_proconfig_contract_ok
  FROM func_eval
),
required_function_contract_ok AS (
  SELECT
    (SELECT exact_function_match_count FROM func_flags) = 2
    AND (SELECT function_owner_state_known FROM func_flags)
    AND (SELECT function_owner_contract_ok FROM func_flags)
    AND (SELECT function_proconfig_state_known FROM func_flags)
    AND (SELECT function_proconfig_contract_ok FROM func_flags)
    AS required_function_contract_ok
),
uuid_func_candidates AS (
  SELECT
    p.oid AS function_oid,
    n.nspname::text AS function_schema,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'gen_random_uuid' AND p.pronargs = 0
),
uuid_ext_deps AS (
  SELECT
    ufc.function_oid,
    e.extname::text AS provider_extension_name,
    ne.nspname::text AS provider_extension_schema,
    true AS extension_dependency_exists
  FROM uuid_func_candidates ufc
  JOIN pg_depend d
    ON d.classid = 'pg_proc'::regclass
   AND d.objid = ufc.function_oid
   AND d.refclassid = 'pg_extension'::regclass
   AND d.deptype = 'e'
  JOIN pg_extension e ON e.oid = d.refobjid
  JOIN pg_namespace ne ON ne.oid = e.extnamespace
),
uuid_candidate_classified AS (
  SELECT
    ufc.function_oid,
    ufc.function_schema,
    ufc.identity_arguments,
    COALESCE(ued.extension_dependency_exists, false) AS extension_dependency_exists,
    ued.provider_extension_name,
    ued.provider_extension_schema,
    (ued.function_oid IS NULL AND ufc.function_schema = 'pg_catalog') AS core_builtin,
    (
      ufc.function_oid IS NOT NULL
      AND (
        (ued.extension_dependency_exists AND (SELECT count(*) FROM uuid_ext_deps u2 WHERE u2.function_oid = ufc.function_oid) = 1)
        OR (ued.function_oid IS NULL AND ufc.function_schema = 'pg_catalog')
      )
    ) AS candidate_provider_state_known,
    (SELECT count(*)::integer FROM uuid_ext_deps u2 WHERE u2.function_oid = ufc.function_oid) AS extension_dep_count,
    (ufc.function_schema = 'public') AS is_public_shadow
  FROM uuid_func_candidates ufc
  LEFT JOIN uuid_ext_deps ued ON ued.function_oid = ufc.function_oid
),
uuid_provider_counts AS (
  SELECT
    count(*)::integer AS zero_arg_candidate_count,
    count(*) FILTER (WHERE extension_dependency_exists)::integer AS extension_owned_candidate_count,
    count(*) FILTER (WHERE core_builtin)::integer AS core_builtin_candidate_count,
    count(*) FILTER (WHERE is_public_shadow)::integer AS shadowing_candidate_count,
    count(*) FILTER (WHERE NOT candidate_provider_state_known AND NOT is_public_shadow)::integer AS ambiguous_provider_count
  FROM uuid_candidate_classified
),
uuid_provider_selected AS (
  SELECT
    ucc.*
  FROM uuid_candidate_classified ucc
  ORDER BY
    CASE WHEN ucc.extension_dependency_exists THEN 0 WHEN ucc.core_builtin THEN 1 ELSE 2 END,
    ucc.function_oid
  LIMIT 1
),
uuid_provider AS (
  SELECT
    ups.function_oid AS selected_function_oid,
    ups.function_schema AS selected_function_schema,
    ups.identity_arguments AS selected_identity_arguments,
    ups.extension_dependency_exists,
    ups.provider_extension_name,
    ups.provider_extension_schema,
    ups.core_builtin,
    ups.candidate_provider_state_known AS provider_state_known,
    ups.extension_dep_count,
    upc.zero_arg_candidate_count,
    upc.extension_owned_candidate_count,
    upc.core_builtin_candidate_count,
    upc.shadowing_candidate_count,
    upc.ambiguous_provider_count
  FROM uuid_provider_selected ups
  CROSS JOIN uuid_provider_counts upc
),
required_provider_contract_ok AS (
  SELECT
    (SELECT zero_arg_candidate_count FROM uuid_provider) = 1
    AND (SELECT shadowing_candidate_count FROM uuid_provider) = 0
    AND (SELECT ambiguous_provider_count FROM uuid_provider) = 0
    AND COALESCE((SELECT provider_state_known FROM uuid_provider), false)
    AS required_provider_contract_ok
),
public_uuid_shadow AS (
  SELECT (SELECT shadowing_candidate_count FROM uuid_provider) AS public_gen_random_uuid_shadow_count
),
trigger_rows AS (
  SELECT
    r.relation_name,
    c.oid AS relation_oid,
    t.oid AS trigger_oid,
    (t.oid IS NOT NULL) AS trigger_exists,
    t.tgname::text AS trigger_name,
    t.tgenabled::text AS enabled_state,
    CASE WHEN t.oid IS NULL THEN NULL ELSE pg_get_triggerdef(t.oid, true) END AS trigger_definition,
    fn_ns.nspname::text AS trigger_function_schema,
    fn.proname::text AS trigger_function_name,
    CASE WHEN fn.oid IS NULL THEN NULL ELSE pg_get_function_identity_arguments(fn.oid) END AS trigger_function_identity_arguments,
    (
      c.oid IS NOT NULL
      AND (
        t.oid IS NULL
        OR (
          t.tgname IS NOT NULL
          AND t.tgenabled IS NOT NULL
          AND pg_get_triggerdef(t.oid, true) IS NOT NULL
          AND fn.oid IS NOT NULL
          AND fn_ns.nspname IS NOT NULL
          AND pg_get_function_identity_arguments(fn.oid) IS NOT NULL
        )
      )
    ) AS trigger_field_state_known
  FROM required_rel r
  JOIN pg_namespace n ON n.nspname = 'public'
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = r.relation_name
  LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND NOT t.tgisinternal
  LEFT JOIN pg_proc fn ON fn.oid = t.tgfoid
  LEFT JOIN pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace
),
trigger_rel AS (
  SELECT
    relation_name,
    count(*) FILTER (WHERE trigger_exists)::integer AS trigger_count,
    bool_and(trigger_field_state_known) AS trigger_inventory_state_known
  FROM trigger_rows
  GROUP BY relation_name
),
dependent_object_state_known AS (
  SELECT
    (SELECT required_function_contract_ok FROM required_function_contract_ok)
    AND (SELECT required_provider_contract_ok FROM required_provider_contract_ok)
    AND (SELECT bool_and(trigger_inventory_state_known) FROM trigger_rel)
  AS dependent_object_state_known
),
absent_flags AS (
  SELECT bool_and(x.absent) AS known_absent_objects_ok FROM (
    SELECT to_regclass('public.purchases') IS NULL AS absent UNION ALL SELECT to_regclass('public.subscriptions') IS NULL
    UNION ALL SELECT to_regclass('public.invoice_dtr_grants') IS NULL UNION ALL SELECT to_regclass('public.m55_user_identity_mappings') IS NULL
    UNION ALL SELECT to_regclass('public.clerk_webhook_events') IS NULL
    UNION ALL SELECT to_regprocedure('public.m55_account_deletion_process_v1(text,text,text,text)') IS NULL
    UNION ALL SELECT NOT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='failed_fulfillments' AND a.attname='user_ref_hash' AND NOT a.attisdropped)
    UNION ALL SELECT NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='failed_fulfillments' AND con.conname='failed_fulfillments_user_ref_hash_format_check')
    UNION ALL SELECT to_regclass('public.idx_failed_fulfillments_user_ref_hash') IS NULL
    UNION ALL SELECT to_regclass('app.user_profiles') IS NULL
  ) x
),
unknown_owners_arr AS (SELECT COALESCE(array_agg(relation_name||':owner_missing' ORDER BY relation_name),ARRAY[]::text[]) AS unknown_owners FROM rel_meta WHERE owner_role IS NULL OR NOT relation_exists),
unknown_rls_arr AS (SELECT COALESCE(array_agg(relation_name||':rls_state_missing' ORDER BY relation_name),ARRAY[]::text[]) AS unknown_rls_states FROM rel_meta WHERE relrowsecurity IS NULL OR NOT relation_exists),
unknown_policy_arr AS (SELECT COALESCE(array_agg(relation_name||':policy_state_missing' ORDER BY relation_name),ARRAY[]::text[]) AS unknown_policy_states FROM policy_rel WHERE relation_oid IS NULL OR NOT no_duplicate_policy_names OR NOT policy_expression_state_known),
unknown_priv_arr AS (SELECT COALESCE(array_agg(relation_name||'.'||role_name||'.'||privilege_name||':privilege_state_unknown' ORDER BY relation_name,role_name,privilege_name),ARRAY[]::text[]) AS unknown_privilege_states FROM priv_eval WHERE NOT privilege_state_known),
unknown_column_arr AS (SELECT COALESCE(array_agg(relation_name||':relation_column_catalog_missing' ORDER BY relation_name),ARRAY[]::text[]) AS unknown_column_fields FROM col_missing_rel),
col_attrdef_dup AS (
  SELECT cc.relation_name, cc.attname
  FROM col_catalog cc
  JOIN pg_namespace n ON n.nspname = 'public'
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = cc.relation_name
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = cc.attname AND a.attnum = cc.attnum
  LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  GROUP BY cc.relation_name, cc.attname, a.attrelid, a.attnum
  HAVING count(ad.oid) > 1
),
sp_ordinal_reference_ok AS (
  SELECT NOT EXISTS (
    SELECT 1
    FROM stripe_processed_required_cols req
    LEFT JOIN sp_col sc ON sc.attname = req.column_name
    WHERE sc.attname IS NULL OR sc.attnum <> req.expected_ordinal
  ) AS ok
),
unknown_defaults_arr AS (
  SELECT COALESCE(array_agg(x.reason ORDER BY x.reason), ARRAY[]::text[]) AS unknown_defaults
  FROM (
    SELECT relation_name || '.' || attname || ':domain_default_state_unknown' AS reason
    FROM col_catalog
    WHERE typtype = 'd' AND NOT domain_default_state_known
    UNION ALL
    SELECT relation_name || '.' || attname || ':multiple_attrdef_rows'
    FROM col_attrdef_dup
    UNION ALL
    SELECT 'stripe_events.received_at:default_state_unknown'
    WHERE NOT COALESCE((SELECT received_at_default_state_known FROM stripe_core_ok), false)
  ) x
),
unknown_constraints_arr AS (
  SELECT COALESCE(array_agg(constraint_oid::text || ':source_columns_unknown'), ARRAY[]::text[]) AS unknown_constraints
  FROM con_expanded
  WHERE source_columns IS NULL
),
unknown_indexes_arr AS (
  SELECT COALESCE(array_agg(relation_name || ':index_definition_unknown' ORDER BY relation_name), ARRAY[]::text[]) AS unknown_indexes
  FROM index_rel
  WHERE NOT index_definition_state_known OR relation_oid IS NULL
),
unknown_dependent_objects_arr AS (
  SELECT COALESCE(array_agg(x.reason ORDER BY x.reason), ARRAY[]::text[]) AS unknown_dependent_objects
  FROM (
    SELECT function_name || ':function_missing' AS reason
    FROM func_eval
    WHERE NOT function_exists
    UNION ALL
    SELECT function_name || ':owner_state_unknown'
    FROM func_eval
    WHERE function_exists AND owner_role IS NULL
    UNION ALL
    SELECT relation_name || ':trigger_inventory_unknown'
    FROM trigger_rel
    WHERE NOT trigger_inventory_state_known
    UNION ALL
    SELECT function_name || ':proconfig_state_unknown'
    FROM func_eval
    WHERE function_exists AND NOT proconfig_state_known
    UNION ALL
    SELECT 'gen_random_uuid:provider_state_unknown'
    WHERE NOT COALESCE((SELECT provider_state_known FROM uuid_provider), false)
  ) x
),
migration_reference_conflicts_arr AS (
  SELECT COALESCE(array_agg(x.conflict_id ORDER BY x.conflict_id), ARRAY[]::text[]) AS migration_reference_conflicts
  FROM (
    SELECT function_name || ':identity_arguments_mismatch' AS conflict_id
    FROM func_eval
    WHERE function_exists AND identity_arguments IS DISTINCT FROM expected_identity_arguments
    UNION ALL
    SELECT function_name || ':result_type_mismatch'
    FROM func_eval
    WHERE function_exists AND result_type IS DISTINCT FROM expected_result_type
    UNION ALL
    SELECT function_name || ':search_path_mismatch'
    FROM func_eval
    WHERE function_exists AND search_path IS DISTINCT FROM expected_search_path
    UNION ALL
    SELECT function_name || ':security_definer_mismatch'
    FROM func_eval
    WHERE function_exists AND security_definer IS DISTINCT FROM expected_security_definer
    UNION ALL
    SELECT function_name || ':proconfig_mismatch'
    FROM func_eval
    WHERE function_exists AND NOT proconfig_exact_match
    UNION ALL
    SELECT function_name || ':service_role_execute_missing'
    FROM func_eval
    WHERE function_exists AND NOT COALESCE(service_role_execute, false)
    UNION ALL
    -- owner expectation exists only in EXPECTED_EXACT mode; tracked migrations
    -- carry no OWNER TO, so ACTUAL_FREEZE rows never emit owner conflicts here.
    SELECT function_name || ':owner_mismatch'
    FROM func_eval
    WHERE function_exists AND owner_freeze_mode = 'EXPECTED_EXACT' AND NOT COALESCE(owner_exact_match, false)
    UNION ALL
    SELECT 'stripe_processed_events:column_ordinal_matrix_reference'
    WHERE NOT (SELECT ok FROM sp_ordinal_reference_ok)
  ) x
),
contract_conflicts_arr AS (
  SELECT array_remove(ARRAY[
    CASE WHEN NOT (SELECT stripe_events_id_absent FROM stripe_id_absent) THEN 'stripe_events_id_exists' END,
    CASE WHEN NOT (SELECT stripe_events_core_contract_ok FROM stripe_core_ok) THEN 'stripe_events_core_contract_mismatch' END,
    CASE WHEN NOT (SELECT stripe_optional_contract_state_known FROM stripe_optional_contract_state_known) THEN 'stripe_events_optional_contract_mismatch' END,
    CASE WHEN cardinality((SELECT stripe_unexpected_column_names FROM stripe_unexpected_cols)) > 0 THEN 'stripe_events_unexpected_columns_present' END,
    CASE WHEN NOT (SELECT stripe_processed_contract_ok FROM stripe_processed_contract_ok) THEN 'stripe_processed_contract_mismatch' END,
    CASE WHEN NOT (SELECT entitlements_unique_ok FROM entitlements_unique_ok) THEN 'entitlements_unique_mismatch' END,
    CASE WHEN NOT (SELECT reply_fk_contract_a_ok FROM reply_fk_contract_a_ok) THEN 'reply_fk_contract_a_mismatch' END,
    CASE WHEN NOT (SELECT dtr_visible_partial_unique_ok FROM dtr_visible_partial_unique_ok) THEN 'dtr_visible_partial_unique_mismatch' END,
    CASE WHEN NOT (SELECT known_absent_objects_ok FROM absent_flags) THEN 'known_absent_object_present' END,
    CASE WHEN NOT (SELECT failed_fulfillments_pre_apply_contract_ok FROM failed_fulfillments_pre_apply_contract_ok) THEN 'failed_fulfillments_pre_apply_mismatch' END,
    CASE WHEN NOT (SELECT required_function_contract_ok FROM required_function_contract_ok) THEN 'required_function_contract_mismatch' END,
    CASE WHEN NOT (SELECT ledger_critical_indexes_ok FROM ledger_idx_ok) THEN 'reply_wallet_ledgers_critical_index_mismatch' END,
    CASE WHEN (SELECT ledger_included_columns_mismatch_count FROM ledger_idx_ok) > 0 THEN 'ledger_included_columns_mismatch' END,
    CASE WHEN NOT (SELECT stripe_processed_index_contract_ok FROM stripe_processed_index_contract_ok) THEN 'stripe_processed_index_contract_mismatch' END,
    CASE WHEN NOT (SELECT stripe_processed_pk_contract_ok FROM stripe_processed_pk_contract_ok) THEN 'stripe_processed_primary_key_contract_mismatch' END,
    CASE WHEN (SELECT stripe_processed_same_purpose_competing_count FROM stripe_proc_idx) > 0 THEN 'stripe_processed_same_purpose_competing_index' END,
    CASE WHEN NOT (SELECT allowed_redundant_contract_ok FROM allowed_stripe_processed_redundant_audit) THEN 'stripe_processed_allowed_redundant_index_mismatch' END,
    CASE WHEN (SELECT dtr_same_purpose_competing_count FROM dtr_partial_ok) > 0 THEN 'dtr_same_purpose_competing_index' END,
    CASE WHEN NOT (SELECT predicate_normalization_self_test_ok FROM predicate_norm_self_test) THEN 'predicate_negative_fixture_failed' END,
    CASE WHEN NOT (SELECT function_proconfig_contract_ok FROM func_flags) THEN 'function_proconfig_mismatch' END,
    CASE WHEN NOT (SELECT function_owner_contract_ok FROM func_flags) THEN 'function_owner_contract_mismatch' END,
    CASE WHEN (SELECT public_gen_random_uuid_shadow_count FROM public_uuid_shadow) > 0 THEN 'public_gen_random_uuid_shadow_present' END
  ], NULL) AS contract_conflicts
),
freeze_v2_conflicts_arr AS (
  SELECT array_remove(ARRAY[
    CASE WHEN NOT (SELECT stripe_events_id_absent FROM stripe_id_absent) THEN 'freeze_v2_stripe_events_id_must_be_absent' END,
    CASE WHEN NOT (SELECT stripe_events_core_contract_ok FROM stripe_core_ok) THEN 'freeze_v2_stripe_events_core_missing' END
  ], NULL) AS freeze_v2_conflicts
),
runtime_compatibility AS (
  SELECT NOT EXISTS (SELECT 1 FROM runtime_conflict_matrix WHERE NOT resolved) AS runtime_compatibility_ready,
    COALESCE((SELECT array_agg(conflict_id ORDER BY conflict_id) FROM runtime_conflict_matrix WHERE NOT resolved),ARRAY[]::text[]) AS runtime_review_flags,
    ARRAY[]::text[] AS runtime_failed_flags
),
catalog_failed_flags_arr AS (
  SELECT array_remove(ARRAY[
    CASE WHEN NOT (SELECT all_required_relations_exist FROM relation_flags) THEN 'all_required_relations_exist' END,
    CASE WHEN NOT (SELECT relation_contract_state_known FROM relation_flags) THEN 'relation_contract_state_known' END,
    CASE WHEN NOT (SELECT column_contract_state_known FROM column_contract_state_known) THEN 'column_contract_state_known' END,
    CASE WHEN NOT (SELECT constraint_contract_state_known FROM constraint_contract_state_known) THEN 'constraint_contract_state_known' END,
    CASE WHEN NOT (SELECT index_contract_state_known FROM index_contract_state_known) THEN 'index_contract_state_known' END,
    CASE WHEN NOT (SELECT policy_contract_state_known FROM policy_contract_state_known) THEN 'policy_contract_state_known' END,
    CASE WHEN NOT (SELECT privilege_contract_state_known FROM priv_flags) THEN 'privilege_contract_state_known' END,
    CASE WHEN (SELECT actual_privilege_cells FROM priv_flags)<>420 THEN 'privilege_cell_count_not_420' END,
    CASE WHEN NOT (SELECT dependent_object_state_known FROM dependent_object_state_known) THEN 'dependent_object_state_known' END,
    CASE WHEN NOT (SELECT known_absent_objects_ok FROM absent_flags) THEN 'known_absent_objects_ok' END,
    CASE WHEN cardinality((SELECT contract_conflicts FROM contract_conflicts_arr))>0 THEN 'contract_conflicts_non_empty' END,
    CASE WHEN cardinality((SELECT freeze_v2_conflicts FROM freeze_v2_conflicts_arr))>0 THEN 'freeze_v2_conflicts_non_empty' END,
    CASE WHEN cardinality((SELECT migration_reference_conflicts FROM migration_reference_conflicts_arr))>0 THEN 'migration_reference_conflicts_non_empty' END
  ], NULL) AS catalog_failed_flags
),
catalog_review_flags_arr AS (
  SELECT array_remove(ARRAY[
    CASE WHEN (SELECT count(*)::integer FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public' WHERE p.proname = 'm55_account_deletion_process_v1') > 0 THEN 'm55_account_deletion_process_v1_overload_present' END,
    CASE WHEN (SELECT count(*) FROM expected_stripe_processed_indexes) = 0 THEN 'stripe_processed_index_expected_contract_unresolved' END,
    CASE WHEN (SELECT ambiguous_provider_count FROM uuid_provider) > 0 THEN 'gen_random_uuid_provider_ambiguous' END,
    CASE WHEN (SELECT shadowing_candidate_count FROM uuid_provider) > 0 THEN 'gen_random_uuid_public_shadow_present' END,
    CASE WHEN (SELECT entitlements_anon_full_select_exposure FROM entitlements_security_review) THEN 'entitlements_anon_full_select_exposure' END,
    CASE WHEN (SELECT entitlements_authenticated_full_select_exposure FROM entitlements_security_review) THEN 'entitlements_authenticated_full_select_exposure' END,
    CASE WHEN (SELECT entitlements_redundant_same_key_unique_indexes FROM entitlements_security_review) THEN 'entitlements_redundant_same_key_unique_indexes' END
  ], NULL) AS catalog_review_flags
),
p10_self_test_fixtures(case_name, all_required_relations_exist, all_required_relations_ordinary, relation_contract_state_known, column_contract_state_known, constraint_contract_state_known, index_contract_state_known, owner_contract_state_known, rls_contract_state_known, policy_contract_state_known, privilege_contract_state_known, dependent_object_state_known, known_absent_objects_ok, actual_privilege_cells, stripe_events_core_contract_ok, stripe_events_id_absent, stripe_optional_contract_state_known, stripe_processed_contract_ok, stripe_processed_index_contract_ok, entitlements_unique_ok, failed_fulfillments_pre_apply_contract_ok, reply_fk_contract_a_ok, dtr_visible_partial_unique_ok, ledger_critical_indexes_ok, required_function_contract_ok, required_provider_contract_ok, unknown_owners, unknown_rls_states, unknown_policy_states, unknown_privilege_states, unknown_column_fields, unknown_defaults, unknown_constraints, unknown_indexes, unknown_dependent_objects, contract_conflicts, freeze_v2_conflicts, migration_reference_conflicts, catalog_failed_flags, catalog_review_flags, runtime_compatibility_ready, expected_catalog_pass, expected_runtime_ready) AS (
  VALUES


('01_all_exact',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('02_relation_missing',false,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['all_required_relations_exist']::text[],ARRAY[]::text[],true,false,true),
    ('03_domain_default_unknown',true,true,true,false,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['entitlements.x:domain_default_state_unknown']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['column_contract_state_known']::text[],ARRAY[]::text[],true,false,true),
    ('04_policy_zero_known',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('05_policy_roles_unknown',true,true,true,true,true,true,true,true,false,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY['failed_fulfillments:policy_state_missing']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['policy_contract_state_known']::text[],ARRAY[]::text[],true,false,true),
    ('06_privilege_420_complete',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('07_grantable_unknown',true,true,true,true,true,true,true,true,true,false,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['entitlements.anon.SELECT:privilege_state_unknown']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['privilege_contract_state_known']::text[],ARRAY[]::text[],true,false,true),
    ('08_stripe_event_type_mismatch',true,true,true,true,true,true,true,true,true,true,true,true,420,false,true,false,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_events_core_contract_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_events_core_contract_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('09_stripe_processed_nullable_mismatch',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,false,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_processed_contract_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_processed_contract_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('10_partial_unique_predicate_missing',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,false,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['dtr_visible_partial_unique_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['dtr_visible_partial_unique_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('11_unexpected_composite_fk',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,false,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['reply_fk_contract_a_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['reply_fk_contract_a_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('12_function_search_path_mismatch',true,true,true,true,true,true,true,true,true,true,false,true,420,true,true,true,true,true,true,true,true,true,true,false,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['m55_consult_reply_commit:owner_state_unknown']::text[],ARRAY['required_function_contract_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['required_function_contract_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('13_unknown_defaults_nonempty',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_events.received_at:default_state_unknown']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,false,true),
    ('14_migration_reference_conflict',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['m55_consult_reply_commit:identity_arguments_mismatch']::text[],ARRAY['migration_reference_conflicts_non_empty']::text[],ARRAY[]::text[],true,false,true),
    ('15_runtime_unresolved_catalog_pass',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],false,true,false),
    ('16_reply_sessions_index_only_target_unique',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('17_stripe_processed_allowed_redundant_present',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true)
),
p10_fixture_eval AS (
  SELECT
    f.*,
    (
      f.all_required_relations_exist AND f.all_required_relations_ordinary AND f.relation_contract_state_known
      AND f.column_contract_state_known AND f.constraint_contract_state_known AND f.index_contract_state_known
      AND f.owner_contract_state_known AND f.rls_contract_state_known AND f.policy_contract_state_known
      AND f.privilege_contract_state_known AND f.dependent_object_state_known AND f.known_absent_objects_ok
      AND f.actual_privilege_cells = 420
      AND f.stripe_events_core_contract_ok AND f.stripe_events_id_absent AND f.stripe_optional_contract_state_known
      AND f.stripe_processed_contract_ok AND f.stripe_processed_index_contract_ok
      AND f.entitlements_unique_ok AND f.failed_fulfillments_pre_apply_contract_ok
      AND f.reply_fk_contract_a_ok AND f.dtr_visible_partial_unique_ok AND f.ledger_critical_indexes_ok
      AND f.required_function_contract_ok AND f.required_provider_contract_ok
      AND cardinality(f.unknown_owners) = 0 AND cardinality(f.unknown_rls_states) = 0 AND cardinality(f.unknown_policy_states) = 0
      AND cardinality(f.unknown_privilege_states) = 0 AND cardinality(f.unknown_column_fields) = 0 AND cardinality(f.unknown_defaults) = 0
      AND cardinality(f.unknown_constraints) = 0 AND cardinality(f.unknown_indexes) = 0 AND cardinality(f.unknown_dependent_objects) = 0
      AND cardinality(f.contract_conflicts) = 0 AND cardinality(f.freeze_v2_conflicts) = 0 AND cardinality(f.migration_reference_conflicts) = 0
      AND cardinality(f.catalog_failed_flags) = 0 AND cardinality(f.catalog_review_flags) = 0
    ) AS actual_catalog_pass,
    f.runtime_compatibility_ready AS actual_runtime_ready,
    ((
      f.all_required_relations_exist AND f.all_required_relations_ordinary AND f.relation_contract_state_known
      AND f.column_contract_state_known AND f.constraint_contract_state_known AND f.index_contract_state_known
      AND f.owner_contract_state_known AND f.rls_contract_state_known AND f.policy_contract_state_known
      AND f.privilege_contract_state_known AND f.dependent_object_state_known AND f.known_absent_objects_ok
      AND f.actual_privilege_cells = 420
      AND f.stripe_events_core_contract_ok AND f.stripe_events_id_absent AND f.stripe_optional_contract_state_known
      AND f.stripe_processed_contract_ok AND f.stripe_processed_index_contract_ok
      AND f.entitlements_unique_ok AND f.failed_fulfillments_pre_apply_contract_ok
      AND f.reply_fk_contract_a_ok AND f.dtr_visible_partial_unique_ok AND f.ledger_critical_indexes_ok
      AND f.required_function_contract_ok AND f.required_provider_contract_ok
      AND cardinality(f.unknown_owners) = 0 AND cardinality(f.unknown_rls_states) = 0 AND cardinality(f.unknown_policy_states) = 0
      AND cardinality(f.unknown_privilege_states) = 0 AND cardinality(f.unknown_column_fields) = 0 AND cardinality(f.unknown_defaults) = 0
      AND cardinality(f.unknown_constraints) = 0 AND cardinality(f.unknown_indexes) = 0 AND cardinality(f.unknown_dependent_objects) = 0
      AND cardinality(f.contract_conflicts) = 0 AND cardinality(f.freeze_v2_conflicts) = 0 AND cardinality(f.migration_reference_conflicts) = 0
      AND cardinality(f.catalog_failed_flags) = 0 AND cardinality(f.catalog_review_flags) = 0
    ) AND f.runtime_compatibility_ready) AS actual_baseline_runtime_ready,
    (f.expected_catalog_pass AND f.expected_runtime_ready) AS expected_baseline_runtime_ready
  FROM p10_self_test_fixtures f
),
p10_fixture_eval_scored AS (
  SELECT
    fe.*,
    (fe.expected_catalog_pass IS NOT DISTINCT FROM fe.actual_catalog_pass) AS catalog_matches_expected,
    (fe.expected_runtime_ready IS NOT DISTINCT FROM fe.actual_runtime_ready) AS runtime_matches_expected,
    (fe.expected_baseline_runtime_ready IS NOT DISTINCT FROM fe.actual_baseline_runtime_ready) AS baseline_runtime_matches_expected,
    (
      fe.expected_catalog_pass IS NOT DISTINCT FROM fe.actual_catalog_pass
      AND fe.expected_runtime_ready IS NOT DISTINCT FROM fe.actual_runtime_ready
      AND fe.expected_baseline_runtime_ready IS NOT DISTINCT FROM fe.actual_baseline_runtime_ready
    ) AS matches_expected
  FROM p10_fixture_eval fe
),
p10_fixture_summary AS (
  SELECT
    (SELECT count(*) FROM self_test_case_registry)::integer AS expected_case_count,
    (SELECT count(*) FROM p10_fixture_eval_scored)::integer AS actual_case_count,
    (SELECT count(*) FROM p10_fixture_eval_scored WHERE matches_expected)::integer AS matched_case_count,
    (SELECT count(*) FROM p10_fixture_eval_scored WHERE NOT matches_expected)::integer AS mismatched_case_count,
    (
      SELECT COALESCE(array_agg(reg.case_name ORDER BY reg.sort_order), ARRAY[]::text[])
      FROM self_test_case_registry reg
      LEFT JOIN p10_fixture_eval_scored fe ON fe.case_name = reg.case_name
      WHERE fe.case_name IS NULL
    ) AS missing_case_names,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM (SELECT case_name, count(*) AS c FROM p10_fixture_eval_scored GROUP BY case_name HAVING count(*) > 1) d
    ) AS duplicate_case_names,
    (
      SELECT COALESCE(array_agg(fe.case_name ORDER BY fe.case_name), ARRAY[]::text[])
      FROM p10_fixture_eval_scored fe
      LEFT JOIN self_test_case_registry reg ON reg.case_name = fe.case_name
      WHERE reg.case_name IS NULL
    ) AS unexpected_case_names,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM p10_fixture_eval_scored
      WHERE NOT matches_expected
    ) AS mismatched_case_names,
    -- Cross-statement registry parity CANNOT be computed inside a single SQL
    -- statement (P10 cannot see P11 CTEs). NULL marks "not computed here";
    -- parity is proven by the LOCAL static analyzer, never as a fake empty array.
    NULL::text[] AS p10_registry_minus_p11_registry_not_computable_in_statement,
    NULL::text[] AS p11_registry_minus_p10_registry_not_computable_in_statement,
    (
      SELECT COALESCE(array_agg(reg.case_name ORDER BY reg.sort_order), ARRAY[]::text[])
      FROM self_test_case_registry reg
      WHERE NOT EXISTS (SELECT 1 FROM p10_self_test_fixtures f WHERE f.case_name = reg.case_name)
    ) AS p10_fixture_minus_registry,
    (
      (SELECT count(*) FROM self_test_case_registry) = (SELECT count(*) FROM p10_fixture_eval_scored)
      AND (SELECT count(*) FROM p10_fixture_eval_scored) = 17
      AND (SELECT count(*) FROM p10_fixture_eval_scored WHERE matches_expected) = 17
      AND (SELECT count(*) FROM p10_fixture_eval_scored WHERE NOT matches_expected) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(reg.case_name), ARRAY[]::text[])
        FROM self_test_case_registry reg
        LEFT JOIN p10_fixture_eval_scored fe ON fe.case_name = reg.case_name
        WHERE fe.case_name IS NULL
      )) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(case_name), ARRAY[]::text[])
        FROM (SELECT case_name FROM p10_fixture_eval_scored GROUP BY case_name HAVING count(*) > 1) d
      )) = 0
      AND cardinality((
        SELECT COALESCE(array_agg(fe.case_name), ARRAY[]::text[])
        FROM p10_fixture_eval_scored fe
        LEFT JOIN self_test_case_registry reg ON reg.case_name = fe.case_name
        WHERE reg.case_name IS NULL
      )) = 0
      AND (SELECT predicate_paren_fixture_ok FROM predicate_norm_self_test)
      AND (SELECT predicate_stripe_fixture_ok FROM predicate_norm_self_test)
      AND (SELECT predicate_negative_fixture_1_ok FROM predicate_norm_self_test)
      AND (SELECT predicate_negative_fixture_2_ok FROM predicate_norm_self_test)
      AND (SELECT predicate_normalization_self_test_ok FROM predicate_norm_self_test)
      AND (SELECT index_contract_self_test_ok FROM index_contract_self_test_summary)
      AND (SELECT exact_index_key_shape_self_test_ok FROM exact_index_key_shape_self_test)
    ) AS classifier_self_test_ok
),
classifier_inputs AS (
  SELECT rf.all_required_relations_exist, rf.all_required_relations_ordinary, rf.relation_contract_state_known,
    ccs.column_contract_state_known, ccs2.constraint_contract_state_known, ics.index_contract_state_known,
    rf.owner_contract_state_known, rf.rls_contract_state_known, pcs.policy_contract_state_known,
    pvf.privilege_contract_state_known, dos.dependent_object_state_known, af.known_absent_objects_ok,
    pvf.actual_privilege_cells, sco.stripe_events_core_contract_ok, sia.stripe_events_id_absent,
    soc.stripe_optional_contract_state_known, spco.stripe_processed_contract_ok, eu.entitlements_unique_ok,
    ffpa.failed_fulfillments_pre_apply_contract_ok, rfka.reply_fk_contract_a_ok, dpu.dtr_visible_partial_unique_ok,
    lio.ledger_critical_indexes_ok, spio.stripe_processed_index_contract_ok, rfc.required_function_contract_ok,
    rpco.required_provider_contract_ok, pfs.classifier_self_test_ok,
    uco.unknown_owners, url.unknown_rls_states, upo.unknown_policy_states, upv.unknown_privilege_states,
    ucf.unknown_column_fields, uda.unknown_defaults, ucn.unknown_constraints, uix.unknown_indexes,
    udo.unknown_dependent_objects,
    cca.contract_conflicts, f2c.freeze_v2_conflicts, mrc.migration_reference_conflicts,
    cffa.catalog_failed_flags, crfa.catalog_review_flags
  FROM relation_flags rf
  CROSS JOIN column_contract_state_known ccs
  CROSS JOIN constraint_contract_state_known ccs2
  CROSS JOIN index_contract_state_known ics
  CROSS JOIN policy_contract_state_known pcs
  CROSS JOIN priv_flags pvf
  CROSS JOIN dependent_object_state_known dos
  CROSS JOIN absent_flags af
  CROSS JOIN stripe_core_ok sco
  CROSS JOIN stripe_id_absent sia
  CROSS JOIN stripe_optional_contract_state_known soc
  CROSS JOIN stripe_processed_contract_ok spco
  CROSS JOIN entitlements_unique_ok eu
  CROSS JOIN failed_fulfillments_pre_apply_contract_ok ffpa
  CROSS JOIN reply_fk_contract_a_ok rfka
  CROSS JOIN dtr_visible_partial_unique_ok dpu
  CROSS JOIN ledger_idx_ok lio
  CROSS JOIN stripe_processed_index_contract_ok spio
  CROSS JOIN required_function_contract_ok rfc
  CROSS JOIN required_provider_contract_ok rpco
  CROSS JOIN p10_fixture_summary pfs
  CROSS JOIN unknown_owners_arr uco
  CROSS JOIN unknown_rls_arr url
  CROSS JOIN unknown_policy_arr upo
  CROSS JOIN unknown_priv_arr upv
  CROSS JOIN unknown_column_arr ucf
  CROSS JOIN unknown_defaults_arr uda
  CROSS JOIN unknown_constraints_arr ucn
  CROSS JOIN unknown_indexes_arr uix
  CROSS JOIN unknown_dependent_objects_arr udo
  CROSS JOIN contract_conflicts_arr cca
  CROSS JOIN freeze_v2_conflicts_arr f2c
  CROSS JOIN migration_reference_conflicts_arr mrc
  CROSS JOIN catalog_failed_flags_arr cffa
  CROSS JOIN catalog_review_flags_arr crfa
),
catalog_pass_expr AS (
  SELECT (
    ci.all_required_relations_exist AND ci.all_required_relations_ordinary AND ci.relation_contract_state_known
    AND ci.column_contract_state_known AND ci.constraint_contract_state_known AND ci.index_contract_state_known
    AND ci.owner_contract_state_known AND ci.rls_contract_state_known AND ci.policy_contract_state_known
    AND ci.privilege_contract_state_known AND ci.dependent_object_state_known AND ci.known_absent_objects_ok
    AND ci.actual_privilege_cells = 420 AND ci.stripe_events_core_contract_ok AND ci.stripe_events_id_absent
    AND ci.stripe_optional_contract_state_known AND ci.stripe_processed_contract_ok AND ci.entitlements_unique_ok
    AND ci.failed_fulfillments_pre_apply_contract_ok AND ci.reply_fk_contract_a_ok AND ci.dtr_visible_partial_unique_ok
    AND ci.ledger_critical_indexes_ok AND ci.stripe_processed_index_contract_ok
    AND ci.required_function_contract_ok AND ci.classifier_self_test_ok
    AND cardinality(ci.unknown_owners) = 0 AND cardinality(ci.unknown_rls_states) = 0 AND cardinality(ci.unknown_policy_states) = 0
    AND cardinality(ci.unknown_privilege_states) = 0 AND cardinality(ci.unknown_column_fields) = 0 AND cardinality(ci.unknown_defaults) = 0
    AND cardinality(ci.unknown_constraints) = 0 AND cardinality(ci.unknown_indexes) = 0 AND cardinality(ci.unknown_dependent_objects) = 0
    AND cardinality(ci.contract_conflicts) = 0 AND cardinality(ci.freeze_v2_conflicts) = 0 AND cardinality(ci.migration_reference_conflicts) = 0
    AND cardinality(ci.catalog_failed_flags) = 0 AND cardinality(ci.catalog_review_flags) = 0
  ) AS production_catalog_contract_freeze_pass
  FROM classifier_inputs ci
)
SELECT
  ci.all_required_relations_exist, ci.all_required_relations_ordinary, ci.relation_contract_state_known,
  ci.column_contract_state_known, ci.constraint_contract_state_known, ci.index_contract_state_known,
  ci.owner_contract_state_known, ci.rls_contract_state_known, ci.policy_contract_state_known,
  ci.privilege_contract_state_known, ci.dependent_object_state_known, ci.known_absent_objects_ok,
  ci.actual_privilege_cells, ci.stripe_events_core_contract_ok, ci.stripe_events_id_absent,
  ci.stripe_optional_contract_state_known, ci.stripe_processed_contract_ok, ci.entitlements_unique_ok,
  ci.failed_fulfillments_pre_apply_contract_ok, ci.reply_fk_contract_a_ok, ci.dtr_visible_partial_unique_ok,
  ci.ledger_critical_indexes_ok,
  (SELECT stripe_processed_index_contract_ok FROM stripe_processed_index_contract_ok) AS stripe_processed_index_contract_ok,
  ci.required_function_contract_ok,
  (SELECT required_provider_contract_ok FROM required_provider_contract_ok) AS required_provider_contract_ok,
  ci.classifier_self_test_ok,
  (SELECT received_at_default_present FROM stripe_core_ok) AS received_at_default_present,
  (SELECT received_at_default_expression FROM stripe_core_ok) AS received_at_default_expression,
  (SELECT stripe_unexpected_column_names FROM stripe_unexpected_cols) AS stripe_events_unexpected_column_names,
  (SELECT stripe_processed_unexpected_column_names FROM sp_unexpected_cols) AS stripe_processed_unexpected_column_names,
  (SELECT stripe_processed_unexpected_column_count FROM sp_unexpected_cols) AS stripe_processed_unexpected_column_count,
  (SELECT reply_documents_single_cascade_count FROM fk_flags) AS reply_documents_single_cascade_count,
  (SELECT reply_documents_composite_restrict_count FROM fk_flags) AS reply_documents_composite_restrict_count,
  (SELECT reply_documents_unexpected_composite_count FROM fk_flags) AS reply_documents_unexpected_composite_count,
  (SELECT reply_sessions_id_theme_validated_unique_constraint_count FROM fk_flags) AS reply_sessions_id_theme_validated_unique_constraint_count,
  (SELECT reply_sessions_id_theme_constraint_ok FROM reply_sessions_id_theme_constraint_ok) AS reply_sessions_id_theme_constraint_ok,
  (SELECT reply_sessions_id_theme_index_ok FROM reply_sessions_id_theme_index_ok) AS reply_sessions_id_theme_index_ok,
  (SELECT reply_sessions_id_theme_target_ok FROM reply_sessions_id_theme_target_ok) AS reply_sessions_id_theme_target_ok,
  (SELECT reply_sessions_id_theme_acceptance_path FROM reply_sessions_id_theme_acceptance_path) AS reply_sessions_id_theme_acceptance_path,
  (SELECT dtr_visible_partial_unique_count FROM dtr_partial_ok) AS dtr_visible_partial_unique_count,
  (SELECT stripe_processed_partial_unique_count FROM stripe_proc_idx) AS stripe_processed_partial_unique_count,
  (SELECT stripe_processed_primary_key_index_count FROM stripe_proc_idx) AS stripe_processed_primary_key_index_count,
  (SELECT expected_primary_key_index_count FROM expected_stripe_processed_pk) AS stripe_processed_expected_primary_key_index_count,
  (SELECT stripe_processed_pk_contract_ok FROM stripe_processed_pk_contract_ok) AS stripe_processed_pk_contract_ok,
  (SELECT stripe_processed_same_purpose_competing_count FROM stripe_proc_idx) AS stripe_processed_same_purpose_competing_count,
  (SELECT allowed_redundant_expected_names FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_expected_names,
  (SELECT allowed_redundant_exact_present_names FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_exact_present_names,
  (SELECT allowed_redundant_absent_names FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_absent_names,
  (SELECT allowed_redundant_mismatched_names FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_mismatched_names,
  (SELECT allowed_redundant_contract_ok FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_contract_ok,
  (SELECT allowed_redundant_expected_count FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_expected_count,
  (SELECT allowed_redundant_exact_match_count FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_exact_match_count,
  (SELECT allowed_redundant_expected_compact_predicates FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_expected_compact_predicates,
  (SELECT allowed_redundant_actual_compact_predicates FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_actual_compact_predicates,
  (SELECT allowed_redundant_actual_key_count FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_actual_key_count,
  (SELECT allowed_redundant_actual_key_expression_count FROM allowed_stripe_processed_redundant_audit) AS stripe_processed_allowed_redundant_actual_key_expression_count,
  (SELECT stripe_processed_unrelated_additional_indexes FROM stripe_proc_idx) AS stripe_processed_unrelated_additional_indexes,
  (SELECT missing_expected_indexes FROM stripe_processed_expected_audit) AS stripe_processed_missing_expected_indexes,
  (SELECT duplicate_expected_indexes FROM stripe_processed_expected_audit) AS stripe_processed_duplicate_expected_indexes,
  (SELECT mismatched_expected_indexes FROM stripe_processed_expected_audit) AS stripe_processed_mismatched_expected_indexes,
  (SELECT dtr_same_purpose_competing_count FROM dtr_partial_ok) AS dtr_same_purpose_competing_count,
  (SELECT dtr_unrelated_additional_indexes FROM dtr_partial_ok) AS dtr_unrelated_additional_indexes,
  (SELECT ledger_included_columns_mismatch_count FROM ledger_idx_ok) AS ledger_included_columns_mismatch_count,
  (SELECT ledger_unrelated_additional_indexes FROM ledger_unrelated_inventory) AS ledger_unrelated_additional_indexes,
  (SELECT predicate_paren_fixture_ok FROM predicate_norm_self_test) AS predicate_paren_fixture_ok,
  (SELECT predicate_stripe_fixture_ok FROM predicate_norm_self_test) AS predicate_stripe_fixture_ok,
  (SELECT predicate_negative_fixture_1_ok FROM predicate_norm_self_test) AS predicate_negative_fixture_1_ok,
  (SELECT predicate_negative_fixture_2_ok FROM predicate_norm_self_test) AS predicate_negative_fixture_2_ok,
  (SELECT compound_positive_fixture_ok FROM predicate_norm_self_test) AS compound_positive_fixture_ok,
  (SELECT compound_negative_or_ok FROM predicate_norm_self_test) AS compound_negative_or_ok,
  (SELECT compound_negative_operator_ok FROM predicate_norm_self_test) AS compound_negative_operator_ok,
  (SELECT compound_negative_column_ok FROM predicate_norm_self_test) AS compound_negative_column_ok,
  (SELECT compound_negative_function_ok FROM predicate_norm_self_test) AS compound_negative_function_ok,
  (SELECT predicate_normalization_self_test_ok FROM predicate_norm_self_test) AS predicate_normalization_self_test_ok,
  (SELECT expected_case_count FROM index_contract_self_test_summary) AS index_contract_self_test_expected_case_count,
  (SELECT actual_case_count FROM index_contract_self_test_summary) AS index_contract_self_test_actual_case_count,
  (SELECT matched_case_count FROM index_contract_self_test_summary) AS index_contract_self_test_matched_case_count,
  (SELECT mismatched_case_count FROM index_contract_self_test_summary) AS index_contract_self_test_mismatched_case_count,
  (SELECT missing_case_names FROM index_contract_self_test_summary) AS index_contract_self_test_missing_case_names,
  (SELECT duplicate_case_names FROM index_contract_self_test_summary) AS index_contract_self_test_duplicate_case_names,
  (SELECT unexpected_case_names FROM index_contract_self_test_summary) AS index_contract_self_test_unexpected_case_names,
  (SELECT mismatched_case_names FROM index_contract_self_test_summary) AS index_contract_self_test_mismatched_case_names,
  (SELECT index_contract_self_test_ok FROM index_contract_self_test_summary) AS index_contract_self_test_ok,
  (SELECT expected_case_count FROM exact_index_key_shape_self_test) AS exact_index_key_shape_self_test_expected_case_count,
  (SELECT actual_case_count FROM exact_index_key_shape_self_test) AS exact_index_key_shape_self_test_actual_case_count,
  (SELECT matched_case_count FROM exact_index_key_shape_self_test) AS exact_index_key_shape_self_test_matched_case_count,
  (SELECT mismatched_case_count FROM exact_index_key_shape_self_test) AS exact_index_key_shape_self_test_mismatched_case_count,
  (SELECT mismatched_case_names FROM exact_index_key_shape_self_test) AS exact_index_key_shape_self_test_mismatched_case_names,
  (SELECT exact_index_key_shape_self_test_ok FROM exact_index_key_shape_self_test) AS exact_index_key_shape_self_test_ok,
  (SELECT entitlements_public_select_true_policy_count FROM entitlements_security_review) AS entitlements_public_select_true_policy_count,
  (SELECT entitlements_public_select_true_policy_names FROM entitlements_security_review) AS entitlements_public_select_true_policy_names,
  (SELECT entitlements_public_select_true_policy_state_known FROM entitlements_security_review) AS entitlements_public_select_true_policy_state_known,
  (SELECT entitlements_anon_effective_select FROM entitlements_security_review) AS entitlements_anon_effective_select,
  (SELECT entitlements_authenticated_effective_select FROM entitlements_security_review) AS entitlements_authenticated_effective_select,
  (SELECT entitlements_exact_same_key_unique_count FROM entitlements_security_review) AS entitlements_exact_same_key_unique_count,
  (SELECT entitlements_exact_same_key_unique_names FROM entitlements_security_review) AS entitlements_exact_same_key_unique_names,
  (SELECT entitlements_constraint_backed_unique_count FROM entitlements_security_review) AS entitlements_constraint_backed_unique_count,
  (SELECT entitlements_constraint_backed_unique_names FROM entitlements_security_review) AS entitlements_constraint_backed_unique_names,
  (SELECT entitlements_nonconstraint_duplicate_unique_count FROM entitlements_security_review) AS entitlements_nonconstraint_duplicate_unique_count,
  (SELECT entitlements_nonconstraint_duplicate_unique_names FROM entitlements_security_review) AS entitlements_nonconstraint_duplicate_unique_names,
  (SELECT function_owner_state_known FROM func_flags) AS function_owner_state_known,
  (SELECT function_owner_contract_ok FROM func_flags) AS function_owner_contract_ok,
  (SELECT function_proconfig_state_known FROM func_flags) AS function_proconfig_state_known,
  (SELECT function_proconfig_contract_ok FROM func_flags) AS function_proconfig_contract_ok,
  (SELECT array_agg(function_name || '=' || COALESCE(owner_role::text, 'NULL') ORDER BY function_name) FROM func_eval) AS function_owner_actual_values,
  (SELECT array_agg(DISTINCT owner_freeze_mode) FROM expected_functions) AS function_owner_freeze_modes,
  (SELECT array_agg(DISTINCT owner_expected_source) FROM expected_functions) AS function_owner_expected_sources,
  (SELECT array_agg(DISTINCT proconfig_freeze_mode) FROM expected_functions) AS function_proconfig_freeze_modes,
  (SELECT array_agg(function_name || '=' || array_to_string(proconfig_actual_normalized, ';') ORDER BY function_name) FROM func_eval) AS function_proconfig_actual_normalized,
  (SELECT array_agg(function_name || '=' || array_to_string(proconfig_expected_normalized, ';') ORDER BY function_name) FROM func_eval) AS function_proconfig_expected_normalized,
  (SELECT dtr_expected_row_count FROM matrix_usage_audit) AS dtr_partial_unique_expected_row_count,
  (SELECT dtr_matched_row_count FROM matrix_usage_audit) AS dtr_partial_unique_matched_row_count,
  (SELECT ledger_expected_row_count FROM matrix_usage_audit) AS ledger_index_expected_row_count,
  (SELECT ledger_matched_row_count FROM matrix_usage_audit) AS ledger_index_matched_row_count,
  (SELECT stripe_processed_expected_row_count FROM matrix_usage_audit) AS stripe_processed_index_expected_row_count,
  (SELECT stripe_processed_matched_row_count FROM matrix_usage_audit) AS stripe_processed_index_matched_row_count,
  (SELECT selected_function_oid FROM uuid_provider) AS gen_random_uuid_selected_function_oid,
  (SELECT selected_function_schema FROM uuid_provider) AS gen_random_uuid_selected_function_schema,
  (SELECT provider_extension_name FROM uuid_provider) AS gen_random_uuid_provider_extension,
  (SELECT provider_state_known FROM uuid_provider) AS gen_random_uuid_provider_state_known,
  (SELECT zero_arg_candidate_count FROM uuid_provider) AS gen_random_uuid_zero_arg_candidate_count,
  (SELECT shadowing_candidate_count FROM uuid_provider) AS gen_random_uuid_shadowing_candidate_count,
  (SELECT ambiguous_provider_count FROM uuid_provider) AS gen_random_uuid_ambiguous_provider_count,
  ci.unknown_owners, ci.unknown_rls_states, ci.unknown_policy_states, ci.unknown_privilege_states,
  ci.unknown_column_fields, ci.unknown_defaults, ci.unknown_constraints, ci.unknown_indexes,
  ci.unknown_dependent_objects,
  ci.contract_conflicts, ci.freeze_v2_conflicts, ci.migration_reference_conflicts,
  ci.catalog_failed_flags AS failed_flags, ci.catalog_review_flags AS review_flags,
  (SELECT expected_case_count FROM p10_fixture_summary) AS self_test_expected_case_count,
  (SELECT actual_case_count FROM p10_fixture_summary) AS self_test_actual_case_count,
  (SELECT matched_case_count FROM p10_fixture_summary) AS self_test_matched_case_count,
  (SELECT mismatched_case_count FROM p10_fixture_summary) AS self_test_mismatched_case_count,
  (SELECT missing_case_names FROM p10_fixture_summary) AS self_test_missing_case_names,
  (SELECT duplicate_case_names FROM p10_fixture_summary) AS self_test_duplicate_case_names,
  (SELECT unexpected_case_names FROM p10_fixture_summary) AS self_test_unexpected_case_names,
  (SELECT mismatched_case_names FROM p10_fixture_summary) AS self_test_mismatched_case_names,
  rc.runtime_failed_flags, rc.runtime_review_flags, rc.runtime_compatibility_ready,
  cpe.production_catalog_contract_freeze_pass,
  cpe.production_catalog_contract_freeze_pass AS production_contract_complete,
  cpe.production_catalog_contract_freeze_pass AS contract_freeze_pass,
  (cpe.production_catalog_contract_freeze_pass AND rc.runtime_compatibility_ready) AS baseline_runtime_ready,
  CASE WHEN ci.classifier_self_test_ok THEN 'CATEGORY-1-M55-ACCOUNT-DELETION-PRODUCTION-BASELINE-CONTRACT-PREFLIGHT-HUMAN'
       ELSE 'CATEGORY-1-M55-ACCOUNT-DELETION-PREVIEW-DB-BASELINE-CONTRACT-FREEZE-SQL-REVISION-1-PATCH-6-PATCH-6-REVIEW' END AS next_gate_recommendation
FROM classifier_inputs ci
CROSS JOIN catalog_pass_expr cpe
CROSS JOIN runtime_compatibility rc;

-- =============================================================================
-- =============================================================================
-- P11 — Classifier self-test (authoritative registry; identical expression as P10)
-- =============================================================================
WITH self_test_case_registry(case_name, sort_order) AS (
  VALUES
    ('01_all_exact', 1), ('02_relation_missing', 2), ('03_domain_default_unknown', 3),
    ('04_policy_zero_known', 4), ('05_policy_roles_unknown', 5), ('06_privilege_420_complete', 6),
    ('07_grantable_unknown', 7), ('08_stripe_event_type_mismatch', 8), ('09_stripe_processed_nullable_mismatch', 9),
    ('10_partial_unique_predicate_missing', 10), ('11_unexpected_composite_fk', 11), ('12_function_search_path_mismatch', 12),
    ('13_unknown_defaults_nonempty', 13), ('14_migration_reference_conflict', 14), ('15_runtime_unresolved_catalog_pass', 15),
    ('16_reply_sessions_index_only_target_unique', 16), ('17_stripe_processed_allowed_redundant_present', 17)
),
fixtures(case_name, all_required_relations_exist, all_required_relations_ordinary, relation_contract_state_known, column_contract_state_known, constraint_contract_state_known, index_contract_state_known, owner_contract_state_known, rls_contract_state_known, policy_contract_state_known, privilege_contract_state_known, dependent_object_state_known, known_absent_objects_ok, actual_privilege_cells, stripe_events_core_contract_ok, stripe_events_id_absent, stripe_optional_contract_state_known, stripe_processed_contract_ok, stripe_processed_index_contract_ok, entitlements_unique_ok, failed_fulfillments_pre_apply_contract_ok, reply_fk_contract_a_ok, dtr_visible_partial_unique_ok, ledger_critical_indexes_ok, required_function_contract_ok, required_provider_contract_ok, unknown_owners, unknown_rls_states, unknown_policy_states, unknown_privilege_states, unknown_column_fields, unknown_defaults, unknown_constraints, unknown_indexes, unknown_dependent_objects, contract_conflicts, freeze_v2_conflicts, migration_reference_conflicts, catalog_failed_flags, catalog_review_flags, runtime_compatibility_ready, expected_catalog_pass, expected_runtime_ready) AS (
  VALUES
    ('01_all_exact',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('02_relation_missing',false,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['all_required_relations_exist']::text[],ARRAY[]::text[],true,false,true),
    ('03_domain_default_unknown',true,true,true,false,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['entitlements.x:domain_default_state_unknown']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['column_contract_state_known']::text[],ARRAY[]::text[],true,false,true),
    ('04_policy_zero_known',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('05_policy_roles_unknown',true,true,true,true,true,true,true,true,false,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY['failed_fulfillments:policy_state_missing']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['policy_contract_state_known']::text[],ARRAY[]::text[],true,false,true),
    ('06_privilege_420_complete',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('07_grantable_unknown',true,true,true,true,true,true,true,true,true,false,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['entitlements.anon.SELECT:privilege_state_unknown']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['privilege_contract_state_known']::text[],ARRAY[]::text[],true,false,true),
    ('08_stripe_event_type_mismatch',true,true,true,true,true,true,true,true,true,true,true,true,420,false,true,false,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_events_core_contract_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_events_core_contract_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('09_stripe_processed_nullable_mismatch',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,false,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_processed_contract_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_processed_contract_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('10_partial_unique_predicate_missing',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,false,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['dtr_visible_partial_unique_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['dtr_visible_partial_unique_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('11_unexpected_composite_fk',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,false,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['reply_fk_contract_a_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['reply_fk_contract_a_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('12_function_search_path_mismatch',true,true,true,true,true,true,true,true,true,true,false,true,420,true,true,true,true,true,true,true,true,true,true,false,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['m55_consult_reply_commit:owner_state_unknown']::text[],ARRAY['required_function_contract_mismatch']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['required_function_contract_mismatch']::text[],ARRAY[]::text[],true,false,true),
    ('13_unknown_defaults_nonempty',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['stripe_events.received_at:default_state_unknown']::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,false,true),
    ('14_migration_reference_conflict',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY['m55_consult_reply_commit:identity_arguments_mismatch']::text[],ARRAY['migration_reference_conflicts_non_empty']::text[],ARRAY[]::text[],true,false,true),
    ('15_runtime_unresolved_catalog_pass',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],false,true,false),
    ('16_reply_sessions_index_only_target_unique',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true),
    ('17_stripe_processed_allowed_redundant_present',true,true,true,true,true,true,true,true,true,true,true,true,420,true,true,true,true,true,true,true,true,true,true,true,true,ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],ARRAY[]::text[],true,true,true)
),
fixture_eval AS (
  SELECT
    f.*,
    (
      f.all_required_relations_exist AND f.all_required_relations_ordinary AND f.relation_contract_state_known
      AND f.column_contract_state_known AND f.constraint_contract_state_known AND f.index_contract_state_known
      AND f.owner_contract_state_known AND f.rls_contract_state_known AND f.policy_contract_state_known
      AND f.privilege_contract_state_known AND f.dependent_object_state_known AND f.known_absent_objects_ok
      AND f.actual_privilege_cells = 420
      AND f.stripe_events_core_contract_ok AND f.stripe_events_id_absent AND f.stripe_optional_contract_state_known
      AND f.stripe_processed_contract_ok AND f.stripe_processed_index_contract_ok
      AND f.entitlements_unique_ok AND f.failed_fulfillments_pre_apply_contract_ok
      AND f.reply_fk_contract_a_ok AND f.dtr_visible_partial_unique_ok AND f.ledger_critical_indexes_ok
      AND f.required_function_contract_ok AND f.required_provider_contract_ok
      AND cardinality(f.unknown_owners) = 0 AND cardinality(f.unknown_rls_states) = 0 AND cardinality(f.unknown_policy_states) = 0
      AND cardinality(f.unknown_privilege_states) = 0 AND cardinality(f.unknown_column_fields) = 0 AND cardinality(f.unknown_defaults) = 0
      AND cardinality(f.unknown_constraints) = 0 AND cardinality(f.unknown_indexes) = 0 AND cardinality(f.unknown_dependent_objects) = 0
      AND cardinality(f.contract_conflicts) = 0 AND cardinality(f.freeze_v2_conflicts) = 0 AND cardinality(f.migration_reference_conflicts) = 0
      AND cardinality(f.catalog_failed_flags) = 0 AND cardinality(f.catalog_review_flags) = 0
    ) AS actual_catalog_pass,
    f.runtime_compatibility_ready AS actual_runtime_ready,
    ((
      f.all_required_relations_exist AND f.all_required_relations_ordinary AND f.relation_contract_state_known
      AND f.column_contract_state_known AND f.constraint_contract_state_known AND f.index_contract_state_known
      AND f.owner_contract_state_known AND f.rls_contract_state_known AND f.policy_contract_state_known
      AND f.privilege_contract_state_known AND f.dependent_object_state_known AND f.known_absent_objects_ok
      AND f.actual_privilege_cells = 420
      AND f.stripe_events_core_contract_ok AND f.stripe_events_id_absent AND f.stripe_optional_contract_state_known
      AND f.stripe_processed_contract_ok AND f.stripe_processed_index_contract_ok
      AND f.entitlements_unique_ok AND f.failed_fulfillments_pre_apply_contract_ok
      AND f.reply_fk_contract_a_ok AND f.dtr_visible_partial_unique_ok AND f.ledger_critical_indexes_ok
      AND f.required_function_contract_ok AND f.required_provider_contract_ok
      AND cardinality(f.unknown_owners) = 0 AND cardinality(f.unknown_rls_states) = 0 AND cardinality(f.unknown_policy_states) = 0
      AND cardinality(f.unknown_privilege_states) = 0 AND cardinality(f.unknown_column_fields) = 0 AND cardinality(f.unknown_defaults) = 0
      AND cardinality(f.unknown_constraints) = 0 AND cardinality(f.unknown_indexes) = 0 AND cardinality(f.unknown_dependent_objects) = 0
      AND cardinality(f.contract_conflicts) = 0 AND cardinality(f.freeze_v2_conflicts) = 0 AND cardinality(f.migration_reference_conflicts) = 0
      AND cardinality(f.catalog_failed_flags) = 0 AND cardinality(f.catalog_review_flags) = 0
    ) AND f.runtime_compatibility_ready) AS actual_baseline_runtime_ready,
    (f.expected_catalog_pass AND f.expected_runtime_ready) AS expected_baseline_runtime_ready
  FROM fixtures f
),
fixture_eval_scored AS (
  SELECT
    fe.*,
    (fe.expected_catalog_pass IS NOT DISTINCT FROM fe.actual_catalog_pass) AS catalog_matches_expected,
    (fe.expected_runtime_ready IS NOT DISTINCT FROM fe.actual_runtime_ready) AS runtime_matches_expected,
    (fe.expected_baseline_runtime_ready IS NOT DISTINCT FROM fe.actual_baseline_runtime_ready) AS baseline_runtime_matches_expected,
    (
      fe.expected_catalog_pass IS NOT DISTINCT FROM fe.actual_catalog_pass
      AND fe.expected_runtime_ready IS NOT DISTINCT FROM fe.actual_runtime_ready
      AND fe.expected_baseline_runtime_ready IS NOT DISTINCT FROM fe.actual_baseline_runtime_ready
    ) AS matches_expected
  FROM fixture_eval fe
),
fixture_summary AS (
  SELECT
    (SELECT count(*) FROM self_test_case_registry)::integer AS expected_case_count,
    (SELECT count(*) FROM fixture_eval_scored)::integer AS actual_case_count,
    (SELECT count(*) FROM fixture_eval_scored WHERE matches_expected)::integer AS matched_case_count,
    (SELECT count(*) FROM fixture_eval_scored WHERE NOT matches_expected)::integer AS mismatched_case_count,
    (
      SELECT COALESCE(array_agg(reg.case_name ORDER BY reg.sort_order), ARRAY[]::text[])
      FROM self_test_case_registry reg
      LEFT JOIN fixture_eval_scored fe ON fe.case_name = reg.case_name
      WHERE fe.case_name IS NULL
    ) AS missing_case_names,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM (SELECT case_name, count(*) AS c FROM fixture_eval_scored GROUP BY case_name HAVING count(*) > 1) d
    ) AS duplicate_case_names,
    (
      SELECT COALESCE(array_agg(fe.case_name ORDER BY fe.case_name), ARRAY[]::text[])
      FROM fixture_eval_scored fe
      LEFT JOIN self_test_case_registry reg ON reg.case_name = fe.case_name
      WHERE reg.case_name IS NULL
    ) AS unexpected_case_names,
    (
      SELECT COALESCE(array_agg(case_name ORDER BY case_name), ARRAY[]::text[])
      FROM fixture_eval_scored
      WHERE NOT matches_expected
    ) AS mismatched_case_names,
    -- Cross-statement registry parity CANNOT be computed inside a single SQL
    -- statement (P10 cannot see P11 CTEs). NULL marks "not computed here";
    -- parity is proven by the LOCAL static analyzer, never as a fake empty array.
    NULL::text[] AS p10_registry_minus_p11_registry_not_computable_in_statement,
    NULL::text[] AS p11_registry_minus_p10_registry_not_computable_in_statement,
    (
      SELECT COALESCE(array_agg(reg.case_name ORDER BY reg.sort_order), ARRAY[]::text[])
      FROM self_test_case_registry reg
      WHERE NOT EXISTS (SELECT 1 FROM fixtures f WHERE f.case_name = reg.case_name)
    ) AS p11_fixture_minus_registry
)
SELECT
  fes.case_name,
  fes.expected_catalog_pass,
  fes.actual_catalog_pass,
  fes.expected_runtime_ready,
  fes.actual_runtime_ready,
  fes.expected_baseline_runtime_ready,
  fes.actual_baseline_runtime_ready,
  fes.catalog_matches_expected,
  fes.runtime_matches_expected,
  fes.baseline_runtime_matches_expected,
  fes.matches_expected,
  fs.expected_case_count,
  fs.actual_case_count,
  fs.matched_case_count,
  fs.mismatched_case_count,
  fs.missing_case_names,
  fs.duplicate_case_names,
  fs.unexpected_case_names,
  fs.mismatched_case_names,
  fs.p10_registry_minus_p11_registry_not_computable_in_statement,
  fs.p11_registry_minus_p10_registry_not_computable_in_statement,
  fs.p11_fixture_minus_registry,
  (
    fs.expected_case_count = 17
    AND fs.actual_case_count = 17
    AND fs.matched_case_count = 17
    AND fs.mismatched_case_count = 0
    AND cardinality(fs.missing_case_names) = 0
    AND cardinality(fs.duplicate_case_names) = 0
    AND cardinality(fs.unexpected_case_names) = 0
    AND cardinality(fs.mismatched_case_names) = 0
  ) AS classifier_self_test_ok
FROM fixture_eval_scored fes
CROSS JOIN fixture_summary fs
ORDER BY fes.case_name;

-- ARTIFACT INTEGRITY FOOTER
-- =============================================================================
-- artifact_gate: CATEGORY-1-M55-ACCOUNT-DELETION-PREVIEW-DB-BASELINE-CONTRACT-FREEZE-SQL-REVISION-1-PATCH-6-PATCH-6
-- revision: SQL-REVISION-1-PATCH-6-PATCH-6
-- target: m55-soul-core (org m55-soul) Production catalog only
-- human_green_requires: production_catalog_contract_freeze_pass=true AND catalog_failed_flags={}
-- baseline_apply_requires: baseline_runtime_ready=true (S1 after catalog closure)
-- forbidden_execution_scope: Preview, migration apply, application row SELECT
-- runtime_remediation_commit: 35bee204f10637b16494468d2cadf4a283e762de
-- runtime_remediation_scope: stripe_events_select_event_id
-- runtime_remediation_tests: dedicated_11/11,checkout_12/12,failed_16/16,reply_2/2,typecheck_PASS
-- =============================================================================
