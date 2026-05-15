-- ============================================================================
-- M55 — REPLY TICKET — IDEMPOTENCY / UNIQUENESS — PRODUCTION PREFLIGHT — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_ticket_idempotency_uniqueness_preflight.sql
--
-- Executable: SELECT only.
-- Forbidden: INSERT/UPDATE/DELETE/DDL/SET/NOTIFY.
-- Output: catalog, counts — no payloads, secrets, URLs, raw user_id.
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_PACKET_v1.md
-- Design: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1.md
--
-- BEFORE RUNNING: Confirm target DB (typically m55-soul-core PRODUCTION).
-- Run SECTION-by-SECTION when the UI shows only the last result set.
-- Does NOT create UNIQUE / partial UNIQUE — observation only.
-- ============================================================================


-- =============================================================================
-- SECTION 1 — Identity (manual verify PRODUCTION alongside this row)
-- =============================================================================
SELECT current_database()::text AS current_database_name;


-- =============================================================================
-- SECTION 2 — stripe_processed_events: table existence + column catalog
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
) AS processed_events_table_exists;

SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'stripe_processed_events'
ORDER BY c.ordinal_position;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
      AND c.column_name = 'stripe_event_id'
) AS stripe_event_id_column_catalog_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
      AND c.column_name = 'checkout_session_id'
) AS checkout_session_id_column_catalog_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
      AND c.column_name = 'payment_intent_id'
) AS payment_intent_id_column_catalog_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
      AND c.column_name = 'report_instance_id'
) AS report_instance_id_column_catalog_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
      AND c.column_name = 'status'
) AS status_column_catalog_exists;

SELECT
  c.data_type::text AS stripe_event_id_data_type,
  c.is_nullable::text AS stripe_event_id_is_nullable_catalog
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'stripe_processed_events'
  AND c.column_name = 'stripe_event_id';


-- =============================================================================
-- SECTION 3 — stripe_processed_events: row counts / duplicate heuristic
-- =============================================================================
SELECT COUNT(*)::bigint AS processed_events_total_row_count FROM public.stripe_processed_events;

SELECT COUNT(*) FILTER (WHERE stripe_event_id IS NOT NULL)::bigint
    AS stripe_event_id_non_null_count,
  COUNT(*) FILTER (WHERE stripe_event_id IS NULL)::bigint AS stripe_event_id_null_count,
  COUNT(DISTINCT stripe_event_id) FILTER (WHERE stripe_event_id IS NOT NULL)::bigint
    AS stripe_event_id_distinct_non_null_count
FROM public.stripe_processed_events;

SELECT (
    (SELECT COUNT(*)::bigint FROM public.stripe_processed_events WHERE stripe_event_id IS NOT NULL)
    - (SELECT COUNT(DISTINCT stripe_event_id)::bigint FROM public.stripe_processed_events
        WHERE stripe_event_id IS NOT NULL)
)::bigint AS stripe_event_id_duplicate_count;


-- =============================================================================
-- SECTION 4 — stripe_processed_events: PK / UNIQUE / FK / CHECK + indexes
-- =============================================================================
SELECT
  c.conname::text AS constraint_name,
  c.contype::text AS contype_pg,
  pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS cl ON c.conrelid = cl.oid AND cl.relname = 'stripe_processed_events'
ORDER BY c.contype, c.conname;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_processed_events'
ORDER BY pi.indexname;


-- =============================================================================
-- SECTION 5 — stripe_processed_events: index/constraint hits for stripe_event_id uniqueness
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM pg_indexes pi
    WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_processed_events'
      AND pi.indexdef ILIKE '%UNIQUE%'
      AND pi.indexdef ILIKE '%stripe_event_id%'
  ) AS stripe_event_id_unique_index_or_constraint_like_exists;

SELECT EXISTS (
    SELECT 1 FROM pg_indexes pi
    WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_processed_events'
      AND pi.indexdef ILIKE '%UNIQUE%'
      AND pi.indexdef ILIKE '%stripe_event_id%'
      AND pi.indexdef ILIKE '%WHERE%'
  ) AS stripe_event_id_partial_unique_index_like_exists;


-- =============================================================================
-- SECTION 6 — reply_wallet_ledgers: Stripe reference columns + non-null counts
-- =============================================================================
WITH want AS (
  SELECT unnest(ARRAY[
    'stripe_event_id'::text,
    'stripe_checkout_session_id'::text,
    'stripe_payment_intent_id'::text,
    'product_key'::text
  ]) AS col
)
SELECT
  want.col AS ledger_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = want.col
  ) AS column_exists,
  (
    SELECT ic.is_nullable::text FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = want.col LIMIT 1
  ) AS is_nullable_if_present
FROM want
ORDER BY want.col;

SELECT COUNT(*)::bigint AS reply_wallet_ledgers_total_row_count FROM public.reply_wallet_ledgers;

SELECT
  COUNT(*) FILTER (WHERE stripe_event_id IS NOT NULL)::bigint
    AS ledger_stripe_event_id_non_null_count,
  COUNT(*) FILTER (WHERE stripe_checkout_session_id IS NOT NULL)::bigint
    AS ledger_stripe_checkout_session_id_non_null_count,
  COUNT(*) FILTER (WHERE stripe_payment_intent_id IS NOT NULL)::bigint
    AS ledger_stripe_payment_intent_id_non_null_count
FROM public.reply_wallet_ledgers;


-- =============================================================================
-- SECTION 7 — SUMMARY (single row; interpret with PACKET)
-- =============================================================================
WITH
tab AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
  ) AS ev
),
col AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
      AND c.column_name = 'stripe_event_id'
  ) AS ev
),
nul AS (
  SELECT c.is_nullable::text AS v
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
    AND c.column_name = 'stripe_event_id'
  LIMIT 1
),
rc AS (SELECT COUNT(*)::bigint AS n FROM public.stripe_processed_events),
nn AS (
  SELECT COUNT(*) FILTER (WHERE stripe_event_id IS NOT NULL)::bigint AS n
  FROM public.stripe_processed_events
),
nnull AS (
  SELECT COUNT(*) FILTER (WHERE stripe_event_id IS NULL)::bigint AS n
  FROM public.stripe_processed_events
),
dup AS (
  SELECT (
    (SELECT COUNT(*)::bigint FROM public.stripe_processed_events WHERE stripe_event_id IS NOT NULL)
    - (SELECT COUNT(DISTINCT stripe_event_id)::bigint FROM public.stripe_processed_events
        WHERE stripe_event_id IS NOT NULL)
  )::bigint AS n
),
uix AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes pi
    WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_processed_events'
      AND pi.indexdef ILIKE '%UNIQUE%'
      AND pi.indexdef ILIKE '%stripe_event_id%'
  ) AS ev
),
pux AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes pi
    WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_processed_events'
      AND pi.indexdef ILIKE '%UNIQUE%'
      AND pi.indexdef ILIKE '%stripe_event_id%'
      AND pi.indexdef ILIKE '%WHERE%'
  ) AS ev
),
four AS (
  SELECT count(*)::int AS n
  FROM (VALUES
    ('stripe_event_id'),
    ('stripe_checkout_session_id'),
    ('stripe_payment_intent_id'),
    ('product_key')
  ) v(cn)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = v.cn
  )
)
SELECT
  (SELECT ev FROM tab) AS processed_events_table_exists,
  (SELECT ev FROM col) AS stripe_event_id_column_exists,
  CASE WHEN (SELECT v FROM nul) = 'YES' THEN true WHEN (SELECT v FROM nul) IS NULL THEN false
    ELSE false END AS stripe_event_id_nullable,
  COALESCE((SELECT n FROM rc), 0::bigint) AS processed_events_row_count,
  COALESCE((SELECT n FROM nn), 0::bigint) AS stripe_event_id_non_null_count,
  COALESCE((SELECT n FROM nnull), 0::bigint) AS stripe_event_id_null_count,
  GREATEST(COALESCE((SELECT n FROM dup), 0::bigint), 0::bigint) AS stripe_event_id_duplicate_count,
  COALESCE((SELECT ev FROM uix), false) AS stripe_event_id_unique_index_exists,
  COALESCE((SELECT ev FROM pux), false) AS stripe_event_id_partial_unique_index_exists,
  (
    NOT COALESCE((SELECT ev FROM uix), false)
    AND NOT COALESCE((SELECT ev FROM pux), false)
  ) AS uniqueness_candidate_needed,
  (
    COALESCE((SELECT ev FROM tab), false)
    AND COALESCE((SELECT ev FROM col), false)
    AND GREATEST(COALESCE((SELECT n FROM dup), 0::bigint), 0::bigint) = 0
  ) AS uniqueness_candidate_safe_to_design,
  CAST(
      (CASE WHEN NOT COALESCE((SELECT ev FROM tab), false) THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT ev FROM col), false) THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT n FROM dup), 0::bigint) > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT n FROM four), 0) < 4 THEN 1 ELSE 0 END)
    AS smallint
  ) AS blocking_gap_count;


-- END OF FILE
