WITH tracked(relation_name) AS (
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
  ('stripe_processed_events'::text),
  ('clerk_webhook_events'::text)
),
existing AS (
  SELECT t.relation_name
  FROM tracked t
  INNER JOIN pg_class c ON c.relname = t.relation_name
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE c.relkind = 'r'
),
count_rows AS (
  SELECT
    e.relation_name,
    xpath(
      '/row/row_count/text()',
      query_to_xml(
        format('SELECT count(*)::bigint AS row_count FROM %I.%I', 'public', e.relation_name),
        false,
        true,
        ''
      )
    ) AS row_count_nodes
  FROM existing e
),
parsed AS (
  SELECT
    cr.relation_name,
    CASE
      WHEN cardinality(cr.row_count_nodes) = 1
        AND (cr.row_count_nodes[1])::text ~ '^[0-9]+$'
      THEN (cr.row_count_nodes[1])::text::bigint
      ELSE (('m55_invalid_' || cr.relation_name))::bigint
    END AS row_count_bigint
  FROM count_rows cr
),
bounded AS (
  SELECT
    p.relation_name,
    p.row_count_bigint::int AS row_count_int
  FROM parsed p
)
SELECT json_build_object(
  'application_relation_counts', (SELECT COALESCE(jsonb_object_agg(b.relation_name, b.row_count_int ORDER BY b.relation_name), '{}'::jsonb) FROM bounded b),
  'relations', COALESCE((SELECT json_agg(c.relname ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'), '[]'::json),
  'columns', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.ordinal_position) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, a.attnum AS ordinal_position, a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
      NOT a.attnotnull AS is_nullable,
      a.atthasdef AS default_present,
      pg_get_expr(ad.adbin, ad.adrelid) AS default_expression
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  ) t), '[]'::json),
  'app_relations', COALESCE((SELECT json_agg(c.relname ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'app' AND c.relkind = 'r'), '[]'::json),
  'constraints', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.constraint_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, con.conname AS constraint_name,
      CASE con.contype WHEN 'p' THEN 'p' WHEN 'u' THEN 'u' WHEN 'f' THEN 'f' WHEN 'c' THEN 'c' ELSE con.contype::text END AS constraint_type,
      pg_get_constraintdef(con.oid, true) AS definition,
      con.convalidated AS validated, con.condeferrable AS deferrable, con.condeferred AS initially_deferred,
      CASE WHEN con.contype = 'f' THEN CASE con.confmatchtype WHEN 's' THEN 'SIMPLE' WHEN 'f' THEN 'FULL' ELSE ' ' END ELSE ' ' END AS match_type,
      CASE WHEN con.contype = 'f' THEN CASE con.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE ' ' END ELSE ' ' END AS delete_action,
      CASE WHEN con.contype = 'f' THEN CASE con.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE ' ' END ELSE ' ' END AS update_action,
      CASE WHEN con.contype = 'f' THEN tgt_ns.nspname ELSE '' END AS target_schema,
      CASE WHEN con.contype = 'f' THEN tgt.relname ELSE '' END AS target_relation,
      COALESCE((SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum), ARRAY[]::text[]) AS source_columns,
      COALESCE((SELECT array_agg(att.attname ORDER BY u.ord) FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord) JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = u.attnum), ARRAY[]::text[]) AS target_columns
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_class tgt ON tgt.oid = con.confrelid
    LEFT JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt.relnamespace
    WHERE n.nspname = 'public'
  ) t), '[]'::json),
  'indexes', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.index_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, i.relname AS index_name,
      pg_get_indexdef(ix.indexrelid) AS definition,
      EXISTS (SELECT 1 FROM pg_constraint pc WHERE pc.contype IN ('p', 'u', 'x') AND pc.conindid = ix.indexrelid) AS constraint_backed
    FROM pg_index ix
    JOIN pg_class c ON c.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  ) t), '[]'::json),
  'policies', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.policy_name) FROM (
    SELECT schemaname AS schema_name, tablename AS relation_name, policyname AS policy_name, cmd AS command,
      ARRAY(
        SELECT CASE WHEN r.role_name::text = 'public' THEN 'PUBLIC' ELSE r.role_name::text END
        FROM unnest(COALESCE(roles, ARRAY[]::name[])) AS r(role_name)
        ORDER BY 1
      )::text[] AS roles, permissive::text AS permissive,
      COALESCE(qual, '') AS using_expression, COALESCE(with_check, '') AS with_check_expression
    FROM pg_policies WHERE schemaname = 'public'
  ) t), '[]'::json),
  'privileges', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.cell_id) FROM (
    SELECT format('priv.%s.%s.%s', c.relname, grantee.rolname, priv_type) AS cell_id,
      CASE
        WHEN grantee.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) AS acl
          WHERE acl.grantee = 0 AND upper(acl.privilege_type) = priv_type
        )
        ELSE has_table_privilege(grantee.rolname, c.oid, priv_type)
      END AS effective_privilege
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN (VALUES ('PUBLIC'), ('anon'), ('authenticated'), ('service_role')) AS grantee(rolname)
    CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) AS priv(priv_type)
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t), '[]'::json),
  'relation_security', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, pg_get_userbyid(c.relowner) AS owner_role,
      c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) t), '[]'::json),
  'functions', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.function_name) FROM (
    SELECT n.nspname AS schema_name, p.proname AS function_name, p.prosecdef AS security_definer,
      p.provolatile::text AS volatility,
      p.proparallel::text AS parallel_safety,
      COALESCE(p.proconfig, ARRAY[]::text[]) AS proconfig,
      COALESCE((SELECT cfg FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg WHERE cfg LIKE 'search_path=%' LIMIT 1), '') AS search_path,
      EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
        WHERE acl.grantee = 0 AND upper(acl.privilege_type) = 'EXECUTE'
      ) AS public_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  ) t), '[]'::json),
  'user_defined_triggers', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.schema_name, t.relation_name, t.trigger_name) FROM (
    SELECT n.nspname AS schema_name, c.relname AS relation_name, t.tgname AS trigger_name,
      t.tgisinternal AS is_internal, false AS evidence_only, false AS portable_identity,
      '' AS semantic_group_id, fn_ns.nspname AS function_schema, fn.proname AS function_name,
      t.tgenabled::text AS enabled_state,
      CASE WHEN t.tgisinternal THEN 'SYSTEM_INTERNAL' ELSE 'USER_DEFINED' END AS trigger_classification
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc fn ON fn.oid = t.tgfoid
    JOIN pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
  ) t), '[]'::json),
  'internal_trigger_catalog_rows', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.relation_schema, t.relation_name, t.function_name, t.event, t.timing, t.side, t.constraint_contract_id) FROM (
    SELECT
      tg_ns.nspname AS relation_schema,
      tg_cls.relname AS relation_name,
      tgt.relname AS referenced_relation,
      fn_ns.nspname AS function_schema,
      fn.proname AS function_name,
      CASE t.tgtype & 28 WHEN 16 THEN 'UPDATE' WHEN 8 THEN 'DELETE' WHEN 4 THEN 'INSERT' ELSE 'UNKNOWN' END AS event,
      CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
      t.tgenabled::text AS enabled_state,
      'SYSTEM_INTERNAL' AS trigger_classification,
      CASE WHEN t.tgrelid = con.conrelid THEN 'referencing' ELSE 'referenced' END AS side,
      format('internal_fk:%s.%s:%s', conrel_ns.nspname, conrel.relname, con.conname) AS constraint_contract_id
    FROM pg_trigger t
    INNER JOIN pg_constraint con ON con.oid = t.tgconstraint AND con.contype = 'f'
    INNER JOIN pg_class tg_cls ON tg_cls.oid = t.tgrelid
    INNER JOIN pg_namespace tg_ns ON tg_ns.oid = tg_cls.relnamespace
    INNER JOIN pg_class conrel ON conrel.oid = con.conrelid
    INNER JOIN pg_namespace conrel_ns ON conrel_ns.oid = conrel.relnamespace
    INNER JOIN pg_class tgt ON tgt.oid = CASE WHEN t.tgrelid = con.conrelid THEN con.confrelid ELSE con.conrelid END
    INNER JOIN pg_proc fn ON fn.oid = t.tgfoid
    INNER JOIN pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace
    WHERE t.tgisinternal AND tg_ns.nspname = 'public'
  ) t), '[]'::json),
  'history_prefix', COALESCE((SELECT json_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations), '[]'::json)
)::text;