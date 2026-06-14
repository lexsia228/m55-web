-- M55 Preview P1 PRIOR Bootstrap Precondition v1 (CORRECTION-1)
-- Provenance roles:
--   historyBootstrapSpec.ts (SHA f8adec57ab5b65e78a2896a40e254874c25ccf010739fab41cbc2eca7b1c5e55): exact frozen relation shape
--   M55_PREVIEW_DB_PREAPPLY_READONLY_PREFLIGHT_PATCH_2.sql: absence-safe dynamic version-read pattern only
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
    'SELECT version::text AS version FROM supabase_migrations.schema_migrations'::text AS history_query_text
),
catalog_base AS (
  SELECT
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_namespace n
      WHERE n.nspname = 'supabase_migrations'
    ) AS history_schema_exists,
    (
      SELECT r.rolname::text
      FROM pg_catalog.pg_namespace n
      JOIN pg_catalog.pg_roles r ON r.oid = n.nspowner
      WHERE n.nspname = 'supabase_migrations'
    ) AS history_schema_owner,
    to_regclass('supabase_migrations.schema_migrations') AS history_relation_oid,
    to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS history_relation_exists,
    (
      SELECT c.relkind::text
      FROM pg_catalog.pg_class c
      WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
    ) AS history_relation_relkind,
    (
      SELECT r.rolname::text
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
      WHERE c.oid = to_regclass('supabase_migrations.schema_migrations')
    ) AS history_relation_owner
),
column_shape AS (
  SELECT
    cb.*,
    COALESCE(
      (
        SELECT count(*)::integer
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      0
    ) AS history_live_column_count,
    COALESCE(
      (
        SELECT array_agg(a.attname::text ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      ARRAY[]::text[]
    ) AS history_live_column_names,
    COALESCE(
      (
        SELECT format_type(a.atttypid, a.atttypmod) = 'text'
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attname = 'version'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      false
    ) AS history_version_type_text,
    COALESCE(
      (
        SELECT a.attnotnull
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attname = 'version'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      false
    ) AS history_version_not_null,
    COALESCE(
      (
        SELECT format_type(a.atttypid, a.atttypmod) = 'text[]'
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attname = 'statements'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      false
    ) AS history_statements_type_text_array,
    COALESCE(
      (
        SELECT NOT a.attnotnull
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attname = 'statements'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      false
    ) AS history_statements_nullable,
    COALESCE(
      (
        SELECT format_type(a.atttypid, a.atttypmod) = 'text'
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attname = 'name'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      false
    ) AS history_name_type_text,
    COALESCE(
      (
        SELECT NOT a.attnotnull
        FROM pg_catalog.pg_attribute a
        WHERE a.attrelid = cb.history_relation_oid
          AND a.attname = 'name'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      false
    ) AS history_name_nullable
  FROM catalog_base cb
),
pk_shape AS (
  SELECT
    cs.*,
    COALESCE(
      (
        SELECT array_agg(a.attname::text ORDER BY u.ord)
        FROM pg_catalog.pg_constraint con
        JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum = u.attnum
        WHERE n.nspname = 'supabase_migrations'
          AND c.relname = 'schema_migrations'
          AND con.contype = 'p'
      ),
      ARRAY[]::text[]
    ) AS history_primary_key_columns
  FROM column_shape cs
),
exact_shape AS (
  SELECT
    pk.*,
    (
      pk.history_schema_exists
      AND pk.history_relation_exists
      AND pk.history_relation_relkind = 'r'
      AND pk.history_schema_owner = 'postgres'
      AND pk.history_relation_owner = 'postgres'
      AND pk.history_live_column_count = 3
      AND pk.history_live_column_names = ARRAY['version', 'statements', 'name']::text[]
      AND pk.history_version_type_text
      AND pk.history_version_not_null
      AND pk.history_statements_type_text_array
      AND pk.history_statements_nullable
      AND pk.history_name_type_text
      AND pk.history_name_nullable
      AND pk.history_primary_key_columns = ARRAY['version']::text[]
    ) AS history_relation_exact_shape,
    (pk.history_primary_key_columns = ARRAY['version']::text[]) AS history_primary_key_on_version_exact
  FROM pk_shape pk
),
history_rows AS (
  SELECT x.version
  FROM exact_shape es
  CROSS JOIN params p
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN es.history_relation_exact_shape THEN query_to_xml(p.history_query_text, false, false, '')
      ELSE NULL::xml
    END AS doc
  ) q
  CROSS JOIN LATERAL XMLTABLE(
    '/table/row'
    PASSING q.doc
    COLUMNS version text PATH 'version'
  ) AS x
  WHERE es.history_relation_exact_shape
    AND q.doc IS NOT NULL
    AND x.version IS NOT NULL
),
history_read AS (
  SELECT
    es.*,
    CASE
      WHEN NOT es.history_relation_exact_shape THEN false
      ELSE true
    END AS history_read_attempted,
    CASE
      WHEN NOT es.history_relation_exact_shape THEN true
      WHEN es.history_relation_exact_shape AND (
        SELECT count(*) FROM (
          SELECT CASE
            WHEN es.history_relation_exact_shape THEN query_to_xml(p.history_query_text, false, false, '')
            ELSE NULL::xml
          END AS doc
          FROM params p
        ) probe
        WHERE probe.doc IS NULL
      ) > 0 THEN false
      ELSE true
    END AS history_read_succeeded,
    CASE
      WHEN NOT es.history_relation_exact_shape THEN 0::bigint
      ELSE (SELECT count(*)::bigint FROM history_rows)
    END AS history_row_count,
    CASE
      WHEN NOT es.history_relation_exact_shape THEN ARRAY[]::text[]
      ELSE COALESCE((SELECT array_agg(hr.version ORDER BY hr.version) FROM history_rows hr), ARRAY[]::text[])
    END AS applied_versions,
    CASE
      WHEN NOT es.history_relation_exact_shape THEN ARRAY[]::text[]
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
  FROM exact_shape es
),
version_sets AS (
  SELECT
    hr.*,
    p.expected_versions,
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
precondition_signals AS (
  SELECT
    vs.*,
    cardinality(COALESCE(vs.duplicate_versions, ARRAY[]::text[])) > 0 AS has_duplicate_versions,
    cardinality(COALESCE(vs.unexpected_history_versions, ARRAY[]::text[])) > 0 AS has_unexpected_versions,
    (
      vs.history_schema_exists
      AND NOT vs.history_relation_exists
    ) AS schema_without_relation,
    (
      vs.history_schema_exists
      AND vs.history_schema_owner IS DISTINCT FROM 'postgres'
    ) AS schema_owner_wrong,
    (
      vs.history_relation_exists
      AND (
        vs.history_relation_relkind IS DISTINCT FROM 'r'
        OR vs.history_relation_owner IS DISTINCT FROM 'postgres'
        OR NOT vs.history_relation_exact_shape
      )
    ) AS relation_shape_malformed
  FROM version_sets vs
),
classification AS (
  SELECT
    ps.*,
    CASE
      WHEN ps.schema_without_relation
        OR ps.schema_owner_wrong
        OR ps.relation_shape_malformed THEN 'MALFORMED_RELATION'
      WHEN NOT ps.history_read_succeeded
        OR ps.has_duplicate_versions
        OR ps.has_unexpected_versions THEN 'UNKNOWN_OR_AMBIGUOUS'
      WHEN NOT ps.history_schema_exists AND NOT ps.history_relation_exists THEN 'CLEANLY_ABSENT'
      WHEN ps.history_relation_exact_shape AND ps.history_row_count = 0 THEN 'EXACT_COMPATIBLE_EMPTY'
      WHEN ps.history_relation_exact_shape AND ps.history_row_count > 0 THEN 'EXACT_COMPATIBLE_WITH_VERSIONS'
      ELSE 'UNKNOWN_OR_AMBIGUOUS'
    END AS bootstrap_precondition_classification,
    CASE
      WHEN (
        CASE
          WHEN ps.schema_without_relation
            OR ps.schema_owner_wrong
            OR ps.relation_shape_malformed THEN 'MALFORMED_RELATION'
          WHEN NOT ps.history_read_succeeded
            OR ps.has_duplicate_versions
            OR ps.has_unexpected_versions THEN 'UNKNOWN_OR_AMBIGUOUS'
          WHEN NOT ps.history_schema_exists AND NOT ps.history_relation_exists THEN 'CLEANLY_ABSENT'
          WHEN ps.history_relation_exact_shape AND ps.history_row_count = 0 THEN 'EXACT_COMPATIBLE_EMPTY'
          WHEN ps.history_relation_exact_shape AND ps.history_row_count > 0 THEN 'EXACT_COMPATIBLE_WITH_VERSIONS'
          ELSE 'UNKNOWN_OR_AMBIGUOUS'
        END
      ) = 'CLEANLY_ABSENT' THEN true
      ELSE false
    END AS bootstrap_precondition_proceed,
    CASE
      WHEN (
        CASE
          WHEN ps.schema_without_relation
            OR ps.schema_owner_wrong
            OR ps.relation_shape_malformed THEN 'MALFORMED_RELATION'
          WHEN NOT ps.history_read_succeeded
            OR ps.has_duplicate_versions
            OR ps.has_unexpected_versions THEN 'UNKNOWN_OR_AMBIGUOUS'
          WHEN NOT ps.history_schema_exists AND NOT ps.history_relation_exists THEN 'CLEANLY_ABSENT'
          WHEN ps.history_relation_exact_shape AND ps.history_row_count = 0 THEN 'EXACT_COMPATIBLE_EMPTY'
          WHEN ps.history_relation_exact_shape AND ps.history_row_count > 0 THEN 'EXACT_COMPATIBLE_WITH_VERSIONS'
          ELSE 'UNKNOWN_OR_AMBIGUOUS'
        END
      ) = 'CLEANLY_ABSENT' THEN false
      ELSE true
    END AS bootstrap_precondition_hold
  FROM precondition_signals ps
)
SELECT
  c.bootstrap_precondition_classification,
  c.bootstrap_precondition_proceed,
  c.bootstrap_precondition_hold,
  c.history_schema_exists,
  c.history_schema_owner,
  c.history_relation_exists,
  c.history_relation_relkind,
  c.history_relation_owner,
  c.history_live_column_count,
  c.history_relation_exact_shape,
  c.history_primary_key_on_version_exact,
  c.history_row_count,
  c.applied_versions,
  c.duplicate_versions,
  c.unexpected_history_versions
FROM classification c;
