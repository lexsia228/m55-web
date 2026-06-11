-- M55 DTR visible report uniqueness v1 (2026-06-15)
-- Purpose: state-convergent removal of competing global UNIQUE (user_id, product_id)
--   on public.dtr_report_snapshots while preserving the visible-only partial unique
--   index dtr_report_snapshots_one_visible_per_user_product_uq.
--
-- Accepted pre-states:
--   STATE_A_PRODUCTION — global constraint dtr_report_snapshots_user_product_key present
--   STATE_B_PREVIEW_REPLAY — global constraint/index absent after soft-hide replay
--
-- Production evidence:
--   - global constraint: dtr_report_snapshots_user_product_key
--   - partial unique: dtr_report_snapshots_one_visible_per_user_product_uq
--   - runtime snapshot write path is INSERT-only (no onConflict)
--
-- Forbidden in this migration:
--   application-row DML
--   partial index drop/recreate
--   generic catalog-driven DROP fallback
--   PostgREST schema reload

BEGIN;

DO $m55$
DECLARE
  v_relation_oid oid;
  v_owner_oid oid;
  v_column_count integer;
  v_constraint_count integer;
  v_index_count integer;

  v_pre_state text;
  v_constraint_delta integer;
  v_index_delta integer;

  v_global_con_oid oid;
  v_global_con_ind_oid oid;
  v_global_con_validated boolean;

  v_partial_index_oid oid;
  v_partial_index_valid boolean;
  v_partial_index_ready boolean;
  v_partial_index_live boolean;
  v_partial_predicate_norm text;

  v_pre_same_key_index_names text[];
  v_post_same_key_index_names text[];
  v_fk_target_count integer;

  v_unrelated_constraint_names text[];
  v_unrelated_index_names text[];

  v_post_relation_oid oid;
  v_post_owner_oid oid;
  v_post_column_count integer;
  v_post_constraint_count integer;
  v_post_index_count integer;
  v_post_unrelated_constraint_names text[];
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
    AND c.relname = 'dtr_report_snapshots'
    AND c.relkind = 'r';

  IF v_relation_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: public.dtr_report_snapshots missing or not ordinary table';
  END IF;

  IF pg_get_userbyid(v_owner_oid) <> 'postgres' THEN
    RAISE EXCEPTION 'precondition failed: public.dtr_report_snapshots owner is not postgres';
  END IF;

  SELECT count(*)::integer
  INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dtr_report_snapshots';

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
  -- B. Expected partial UNIQUE index (full shape; common to both states)
  -- -------------------------------------------------------------------------
  SELECT ic.oid, i.indisvalid, i.indisready, i.indislive
  INTO v_partial_index_oid, v_partial_index_valid, v_partial_index_ready, v_partial_index_live
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_namespace n ON n.oid = ic.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  WHERE n.nspname = 'public'
    AND ic.relname = 'dtr_report_snapshots_one_visible_per_user_product_uq'
    AND i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND am.amname = 'btree'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnatts = 2
    AND i.indnkeyatts = 2
    AND i.indpred IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint c2
      WHERE c2.conindid = ic.oid
        AND c2.contype IN ('u', 'p')
    );

  IF v_partial_index_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: partial unique index dtr_report_snapshots_one_visible_per_user_product_uq missing';
  END IF;

  SELECT regexp_replace(
    lower(btrim(btrim(pg_get_expr(i.indpred, i.indrelid), '('), ')')),
    '[[:space:]]', '', 'g'
  )
  INTO v_partial_predicate_norm
  FROM pg_index i
  WHERE i.indexrelid = v_partial_index_oid;

  IF v_partial_predicate_norm IS DISTINCT FROM 'user_hidden_atisnull' THEN
    RAISE EXCEPTION 'precondition failed: partial unique predicate is not user_hidden_at IS NULL';
  END IF;

  IF (
    SELECT array_agg(a.attname ORDER BY k.ord)
    FROM pg_index i
    JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
    WHERE i.indexrelid = v_partial_index_oid
      AND k.attnum > 0
  ) IS DISTINCT FROM ARRAY['user_id', 'product_id']::text[] THEN
    RAISE EXCEPTION 'precondition failed: partial unique key columns are not (user_id, product_id)';
  END IF;

  IF (SELECT count(*)::integer FROM unnest((SELECT indkey FROM pg_index WHERE indexrelid = v_partial_index_oid)) AS x(attnum) WHERE x.attnum = 0) <> 0 THEN
    RAISE EXCEPTION 'precondition failed: partial unique expression key count is not 0';
  END IF;

  IF v_partial_index_valid IS DISTINCT FROM true
     OR v_partial_index_ready IS DISTINCT FROM true
     OR v_partial_index_live IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'precondition failed: partial unique index is not valid/ready/live';
  END IF;

  -- -------------------------------------------------------------------------
  -- C. Exact same-key index name set and state classification
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_pre_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND (
      SELECT count(*)::integer
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum = 0
    ) = 0
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum > 0
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_pre_same_key_index_names = ARRAY[
    'dtr_report_snapshots_one_visible_per_user_product_uq',
    'dtr_report_snapshots_user_product_key'
  ]::text[] THEN
    v_pre_state := 'STATE_A_PRODUCTION';
    v_constraint_delta := 1;
    v_index_delta := 1;
  ELSIF v_pre_same_key_index_names = ARRAY[
    'dtr_report_snapshots_one_visible_per_user_product_uq'
  ]::text[] THEN
    v_pre_state := 'STATE_B_PREVIEW_REPLAY';
    v_constraint_delta := 0;
    v_index_delta := 0;
    v_global_con_oid := NULL;
    v_global_con_ind_oid := NULL;
    v_global_con_validated := NULL;
  ELSE
    RAISE EXCEPTION 'precondition failed (%): same-key index name set is %, expected STATE_A {dtr_report_snapshots_one_visible_per_user_product_uq,dtr_report_snapshots_user_product_key} or STATE_B {dtr_report_snapshots_one_visible_per_user_product_uq}',
      COALESCE(v_pre_state, 'UNCLASSIFIED'), v_pre_same_key_index_names;
  END IF;

  -- -------------------------------------------------------------------------
  -- D. STATE_A exact global UNIQUE contract
  -- -------------------------------------------------------------------------
  IF v_pre_state = 'STATE_A_PRODUCTION' THEN
    SELECT con.oid, con.conindid, con.convalidated
    INTO v_global_con_oid, v_global_con_ind_oid, v_global_con_validated
    FROM pg_constraint con
    WHERE con.conrelid = v_relation_oid
      AND con.conname = 'dtr_report_snapshots_user_product_key'
      AND con.contype = 'u';

    IF v_global_con_oid IS NULL THEN
      RAISE EXCEPTION 'precondition failed (STATE_A_PRODUCTION): global constraint dtr_report_snapshots_user_product_key missing';
    END IF;

    IF (
      SELECT array_agg(a.attname ORDER BY u.ord)
      FROM pg_constraint con
      JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = u.attnum
      WHERE con.oid = v_global_con_oid
    ) IS DISTINCT FROM ARRAY['user_id', 'product_id']::text[] THEN
      RAISE EXCEPTION 'precondition failed (STATE_A_PRODUCTION): global constraint key columns are not (user_id, product_id)';
    END IF;

    IF v_global_con_validated IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'precondition failed (STATE_A_PRODUCTION): global constraint is not validated';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class ic
      JOIN pg_index i ON i.indexrelid = ic.oid
      JOIN pg_am am ON am.oid = ic.relam
      WHERE ic.oid = v_global_con_ind_oid
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
      RAISE EXCEPTION 'precondition failed (STATE_A_PRODUCTION): global constraint backing index shape mismatch';
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- E. STATE_B exact global absence contract
  -- -------------------------------------------------------------------------
  IF v_pre_state = 'STATE_B_PREVIEW_REPLAY' THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint con
      WHERE con.conrelid = v_relation_oid
        AND con.conname = 'dtr_report_snapshots_user_product_key'
    ) THEN
      RAISE EXCEPTION 'precondition failed (STATE_B_PREVIEW_REPLAY): global constraint dtr_report_snapshots_user_product_key must be absent';
    END IF;

    IF to_regclass('public.dtr_report_snapshots_user_product_key') IS NOT NULL THEN
      RAISE EXCEPTION 'precondition failed (STATE_B_PREVIEW_REPLAY): global backing index dtr_report_snapshots_user_product_key must be absent';
    END IF;
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
  INTO v_unrelated_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid
    AND con.conname <> 'dtr_report_snapshots_user_product_key';

  SELECT coalesce(array_agg(ic.relname ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.oid IS DISTINCT FROM v_global_con_ind_oid;

  -- -------------------------------------------------------------------------
  -- H. Exact conditional mutation
  -- -------------------------------------------------------------------------
  IF v_pre_state = 'STATE_A_PRODUCTION' THEN
    ALTER TABLE public.dtr_report_snapshots
      DROP CONSTRAINT dtr_report_snapshots_user_product_key;
  ELSIF v_pre_state = 'STATE_B_PREVIEW_REPLAY' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'mutation branch failed: unsupported pre-state %', v_pre_state;
  END IF;

  -- -------------------------------------------------------------------------
  -- I. Postconditions
  -- -------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    WHERE con.conrelid = v_relation_oid
      AND con.conname = 'dtr_report_snapshots_user_product_key'
  ) THEN
    RAISE EXCEPTION 'postcondition failed (%): global constraint still present', v_pre_state;
  END IF;

  IF to_regclass('public.dtr_report_snapshots_user_product_key') IS NOT NULL THEN
    RAISE EXCEPTION 'postcondition failed (%): global backing index still present', v_pre_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_index i ON i.indexrelid = ic.oid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    JOIN pg_am am ON am.oid = ic.relam
    WHERE n.nspname = 'public'
      AND ic.relname = 'dtr_report_snapshots_one_visible_per_user_product_uq'
      AND i.indrelid = v_relation_oid
      AND ic.relkind = 'i'
      AND am.amname = 'btree'
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnkeyatts = 2
      AND i.indnatts = 2
      AND i.indpred IS NOT NULL
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c2
        WHERE c2.conindid = ic.oid
          AND c2.contype IN ('u', 'p')
      )
      AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
      AND regexp_replace(
        lower(btrim(btrim(pg_get_expr(i.indpred, i.indrelid), '('), ')')),
        '[[:space:]]', '', 'g'
      ) = 'user_hidden_atisnull'
      AND (
        SELECT array_agg(a.attname ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['user_id', 'product_id']::text[]
  ) THEN
    RAISE EXCEPTION 'postcondition failed (%): partial unique index full shape mismatch after mutation', v_pre_state;
  END IF;

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = 'i'
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND (
      SELECT count(*)::integer
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum = 0
    ) = 0
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum > 0
    ) = ARRAY['user_id', 'product_id']::text[];

  IF v_post_same_key_index_names IS DISTINCT FROM ARRAY[
    'dtr_report_snapshots_one_visible_per_user_product_uq'
  ]::text[] THEN
    RAISE EXCEPTION 'postcondition failed (%): same-key index name set is %, expected {dtr_report_snapshots_one_visible_per_user_product_uq}',
      v_pre_state, v_post_same_key_index_names;
  END IF;

  SELECT c.oid, c.relowner
  INTO v_post_relation_oid, v_post_owner_oid
  FROM pg_class c
  WHERE c.oid = v_relation_oid;

  IF v_post_relation_oid IS DISTINCT FROM v_relation_oid THEN
    RAISE EXCEPTION 'postcondition failed (%): relation OID changed', v_pre_state;
  END IF;

  IF v_post_owner_oid IS DISTINCT FROM v_owner_oid THEN
    RAISE EXCEPTION 'postcondition failed (%): owner OID changed', v_pre_state;
  END IF;

  SELECT count(*)::integer
  INTO v_post_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dtr_report_snapshots';

  IF v_post_column_count IS DISTINCT FROM v_column_count THEN
    RAISE EXCEPTION 'postcondition failed (%): column count changed', v_pre_state;
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_constraint_count IS DISTINCT FROM v_constraint_count - v_constraint_delta THEN
    RAISE EXCEPTION 'postcondition failed (%): constraint count changed from % to %, expected %',
      v_pre_state, v_constraint_count, v_post_constraint_count, v_constraint_count - v_constraint_delta;
  END IF;

  SELECT count(*)::integer
  INTO v_post_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  IF v_post_index_count IS DISTINCT FROM v_index_count - v_index_delta THEN
    RAISE EXCEPTION 'postcondition failed (%): index count changed from % to %, expected %',
      v_pre_state, v_index_count, v_post_index_count, v_index_count - v_index_delta;
  END IF;

  SELECT coalesce(array_agg(con.conname ORDER BY con.conname), ARRAY[]::text[])
  INTO v_post_unrelated_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_unrelated_constraint_names IS DISTINCT FROM v_unrelated_constraint_names THEN
    RAISE EXCEPTION 'postcondition failed (%): unrelated constraint names changed', v_pre_state;
  END IF;

  SELECT coalesce(array_agg(ic.relname ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.relname <> 'dtr_report_snapshots_user_product_key';

  IF v_post_unrelated_index_names IS DISTINCT FROM v_unrelated_index_names THEN
    RAISE EXCEPTION 'postcondition failed (%): unrelated index names changed', v_pre_state;
  END IF;
END
$m55$;

COMMIT;
