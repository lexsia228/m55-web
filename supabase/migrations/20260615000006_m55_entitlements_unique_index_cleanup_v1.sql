-- M55 Entitlements unique index cleanup v1 (2026-06-15)
-- Purpose: remove duplicate nonconstraint UNIQUE indexes on public.entitlements
--   while preserving canonical constraint-backed UNIQUE
--   entitlements_user_id_product_id_key.
--
-- Production evidence:
--   - canonical constraint: entitlements_user_id_product_id_key
--   - duplicate indexes: entitlements_user_product_uq, uq_entitlements_user_product
--   - runtime onConflict: user_id,product_id (canonical constraint sufficient)
--
-- Forbidden in this migration:
--   application-row DML
--   constraint drop
--   PostgREST schema reload
--   generic catalog-driven DROP

BEGIN;

DO $m55$
DECLARE
  v_relation_oid oid;
  v_owner_oid oid;
  v_column_count integer;
  v_constraint_count integer;
  v_index_count integer;

  v_canonical_con_oid oid;
  v_canonical_con_ind_oid oid;
  v_canonical_con_validated boolean;

  v_dup1_index_oid oid;
  v_dup2_index_oid oid;

  v_pre_same_key_index_names text[];
  v_post_same_key_index_names text[];
  v_fk_target_count integer;

  v_constraint_names text[];
  v_unrelated_index_names text[];

  v_post_relation_oid oid;
  v_post_owner_oid oid;
  v_post_column_count integer;
  v_post_constraint_count integer;
  v_post_index_count integer;
  v_post_constraint_names text[];
  v_post_unrelated_index_names text[];
BEGIN
  -- -------------------------------------------------------------------------
  -- A. Relation shape
  -- -------------------------------------------------------------------------
  SELECT c.oid, c.relowner
  INTO v_relation_oid, v_owner_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'entitlements'
    AND c.relkind = 'r';

  IF v_relation_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: public.entitlements missing or not ordinary table';
  END IF;

  IF pg_get_userbyid(v_owner_oid) <> 'postgres' THEN
    RAISE EXCEPTION 'precondition failed: public.entitlements owner is not postgres';
  END IF;

  SELECT count(*)::integer
  INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'entitlements';

  SELECT count(*)::integer
  INTO v_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  SELECT count(*)::integer
  INTO v_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  -- -------------------------------------------------------------------------
  -- B. Canonical UNIQUE constraint + backing index (full shape)
  -- -------------------------------------------------------------------------
  SELECT con.oid, con.conindid, con.convalidated
  INTO v_canonical_con_oid, v_canonical_con_ind_oid, v_canonical_con_validated
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid
    AND con.conname = 'entitlements_user_id_product_id_key'
    AND con.contype = 'u';

  IF v_canonical_con_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: canonical constraint entitlements_user_id_product_id_key missing';
  END IF;

  IF (
    SELECT array_agg(a.attname ORDER BY u.ord)
    FROM pg_constraint con
    JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = u.attnum
    WHERE con.oid = v_canonical_con_oid
  ) IS DISTINCT FROM ARRAY['user_id', 'product_id']::text[] THEN
    RAISE EXCEPTION 'precondition failed: canonical constraint key columns are not (user_id, product_id)';
  END IF;

  IF v_canonical_con_validated IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'precondition failed: canonical constraint is not validated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_index i ON i.indexrelid = ic.oid
    JOIN pg_am am ON am.oid = ic.relam
    WHERE ic.oid = v_canonical_con_ind_oid
      AND i.indrelid = v_relation_oid
      AND ic.relkind = 'i'
      AND am.amname = 'btree'
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnatts = 2
      AND i.indnkeyatts = 2
      AND i.indpred IS NULL
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
      AND (
        SELECT array_agg(a.attname ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['user_id', 'product_id']::text[]
  ) THEN
    RAISE EXCEPTION 'precondition failed: canonical constraint backing index shape mismatch';
  END IF;

  -- -------------------------------------------------------------------------
  -- C. Duplicate index 1 (full shape)
  -- -------------------------------------------------------------------------
  SELECT ic.oid
  INTO v_dup1_index_oid
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_namespace n ON n.oid = ic.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  WHERE n.nspname = 'public'
    AND ic.relname = 'entitlements_user_product_uq'
    AND i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND am.amname = 'btree'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indpred IS NULL
    AND i.indisvalid
    AND i.indisready
    AND i.indislive
    AND i.indnatts = 2
    AND i.indnkeyatts = 2
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint c2
      WHERE c2.conindid = ic.oid
        AND c2.contype IN ('u', 'p')
    )
    AND (
      SELECT array_agg(a.attname ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_dup1_index_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: duplicate index entitlements_user_product_uq missing or shape mismatch';
  END IF;

  -- -------------------------------------------------------------------------
  -- D. Duplicate index 2 (full shape)
  -- -------------------------------------------------------------------------
  SELECT ic.oid
  INTO v_dup2_index_oid
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_namespace n ON n.oid = ic.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  WHERE n.nspname = 'public'
    AND ic.relname = 'uq_entitlements_user_product'
    AND i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND am.amname = 'btree'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indpred IS NULL
    AND i.indisvalid
    AND i.indisready
    AND i.indislive
    AND i.indnatts = 2
    AND i.indnkeyatts = 2
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint c2
      WHERE c2.conindid = ic.oid
        AND c2.contype IN ('u', 'p')
    )
    AND (
      SELECT array_agg(a.attname ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_dup2_index_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: duplicate index uq_entitlements_user_product missing or shape mismatch';
  END IF;

  -- -------------------------------------------------------------------------
  -- E. Exact same-key index name set (pg_index canonical inventory)
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(ic.relname ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_pre_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_am am ON am.oid = ic.relam
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND am.amname = 'btree'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND i.indnatts = 2
    AND i.indpred IS NULL
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND (
      SELECT array_agg(a.attname ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_pre_same_key_index_names IS DISTINCT FROM ARRAY[
    'entitlements_user_id_product_id_key',
    'entitlements_user_product_uq',
    'uq_entitlements_user_product'
  ]::text[] THEN
    RAISE EXCEPTION 'precondition failed: same-key index name set is %, expected {entitlements_user_id_product_id_key,entitlements_user_product_uq,uq_entitlements_user_product}',
      v_pre_same_key_index_names;
  END IF;

  -- -------------------------------------------------------------------------
  -- F. Referencing FK count
  -- -------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_fk_target_count
  FROM pg_constraint con
  WHERE con.contype = 'f'
    AND con.confrelid = v_relation_oid
    AND (
      SELECT array_agg(a.attname ORDER BY u.ord)
      FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = u.attnum
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_fk_target_count <> 0 THEN
    RAISE EXCEPTION 'precondition failed: referencing FK count is %, expected 0', v_fk_target_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- G. Structural pre-state
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(con.conname ORDER BY con.conname), ARRAY[]::text[])
  INTO v_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  SELECT coalesce(array_agg(ic.relname ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.oid NOT IN (v_canonical_con_ind_oid, v_dup1_index_oid, v_dup2_index_oid);

  -- -------------------------------------------------------------------------
  -- H. Exact mutations
  -- -------------------------------------------------------------------------
  DROP INDEX public.entitlements_user_product_uq;
  DROP INDEX public.uq_entitlements_user_product;

  -- -------------------------------------------------------------------------
  -- I. Postconditions
  -- -------------------------------------------------------------------------
  IF (
    SELECT count(*)::integer
    FROM pg_constraint con
    WHERE con.conrelid = v_relation_oid
      AND con.conname = 'entitlements_user_id_product_id_key'
      AND con.contype = 'u'
  ) <> 1 THEN
    RAISE EXCEPTION 'postcondition failed: canonical constraint missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_index i ON i.indexrelid = ic.oid
    JOIN pg_am am ON am.oid = ic.relam
    WHERE ic.oid = v_canonical_con_ind_oid
      AND i.indrelid = v_relation_oid
      AND ic.relkind = 'i'
      AND am.amname = 'btree'
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnatts = 2
      AND i.indnkeyatts = 2
      AND i.indpred IS NULL
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
      AND (
        SELECT array_agg(a.attname ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['user_id', 'product_id']::text[]
  ) THEN
    RAISE EXCEPTION 'postcondition failed: canonical backing index full shape mismatch after mutation';
  END IF;

  IF to_regclass('public.entitlements_user_product_uq') IS NOT NULL THEN
    RAISE EXCEPTION 'postcondition failed: entitlements_user_product_uq still present';
  END IF;

  IF to_regclass('public.uq_entitlements_user_product') IS NOT NULL THEN
    RAISE EXCEPTION 'postcondition failed: uq_entitlements_user_product still present';
  END IF;

  SELECT coalesce(array_agg(ic.relname ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_am am ON am.oid = ic.relam
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND am.amname = 'btree'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND i.indnatts = 2
    AND i.indpred IS NULL
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND (
      SELECT array_agg(a.attname ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_post_same_key_index_names IS DISTINCT FROM ARRAY[
    'entitlements_user_id_product_id_key'
  ]::text[] THEN
    RAISE EXCEPTION 'postcondition failed: same-key index name set is %, expected {entitlements_user_id_product_id_key}',
      v_post_same_key_index_names;
  END IF;

  SELECT c.oid, c.relowner
  INTO v_post_relation_oid, v_post_owner_oid
  FROM pg_class c
  WHERE c.oid = v_relation_oid;

  IF v_post_relation_oid IS DISTINCT FROM v_relation_oid THEN
    RAISE EXCEPTION 'postcondition failed: relation OID changed';
  END IF;

  IF v_post_owner_oid IS DISTINCT FROM v_owner_oid THEN
    RAISE EXCEPTION 'postcondition failed: owner OID changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'entitlements';

  IF v_post_column_count IS DISTINCT FROM v_column_count THEN
    RAISE EXCEPTION 'postcondition failed: column count changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_constraint_count IS DISTINCT FROM v_constraint_count THEN
    RAISE EXCEPTION 'postcondition failed: constraint count changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  IF v_post_index_count IS DISTINCT FROM v_index_count - 2 THEN
    RAISE EXCEPTION 'postcondition failed: index count changed from % to %, expected %',
      v_index_count, v_post_index_count, v_index_count - 2;
  END IF;

  SELECT coalesce(array_agg(con.conname ORDER BY con.conname), ARRAY[]::text[])
  INTO v_post_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_constraint_names IS DISTINCT FROM v_constraint_names THEN
    RAISE EXCEPTION 'postcondition failed: constraint names changed';
  END IF;

  SELECT coalesce(array_agg(ic.relname ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.oid <> v_canonical_con_ind_oid;

  IF v_post_unrelated_index_names IS DISTINCT FROM v_unrelated_index_names THEN
    RAISE EXCEPTION 'postcondition failed: unrelated index names changed';
  END IF;
END
$m55$;

COMMIT;
