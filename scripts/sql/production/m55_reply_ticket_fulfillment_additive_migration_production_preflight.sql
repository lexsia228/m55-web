-- ============================================================================
-- M55 — REPLY TICKET FULFILLMENT — ADDITIVE MIGRATION PRODUCTION PREFLIGHT — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql
--
-- Executable: SELECT only.
-- Forbidden: INSERT/UPDATE/DELETE/DDL/SET/NOTIFY.
-- Output: current_database name, catalog columns, counts, constraint text only.
-- No raw user_id, payloads, secrets, DB URLs, webhook secrets.
--
-- Which project is PRODUCTION must be verified manually in the SQL editor UI
-- alongside current_database() below. Do not paste connection strings into SSOT.
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_PREFLIGHT_PACKET_v1.md
-- Shadow result: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_RESULT_v1.md
--
-- BEFORE RUNNING: Confirm you are on m55-soul-core / intended PRODUCTION.
-- Run SECTION-by-SECTION when the UI shows only the last result set.
-- ============================================================================


-- =============================================================================
-- SECTION 1 — Connection identity (manual + current_database)
-- =============================================================================
SELECT current_database()::text AS current_database_name;


-- =============================================================================
-- SECTION 2 — Objects that must be absent before APPLY (or match IF NOT EXISTS plan)
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
) AS stripe_processed_events_already_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_events'
) AS stripe_events_table_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns AS ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = 'payload_json'
) AS reply_wallet_ledgers_payload_json_column_present;

WITH cand AS (
  SELECT unnest(ARRAY[
    'stripe_event_id'::text,
    'stripe_checkout_session_id'::text,
    'stripe_payment_intent_id'::text,
    'product_key'::text
  ]) AS col
)
SELECT
  cand.col AS ledger_candidate_column_for_production_additive,
  EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = cand.col
  ) AS column_already_present
FROM cand
ORDER BY cand.col;


-- =============================================================================
-- SECTION 3 — Baseline row counts and report_instance_id distribution
-- =============================================================================
SELECT COUNT(*)::bigint AS reply_ticket_wallets_total_rows FROM public.reply_ticket_wallets;

SELECT
  COUNT(*) FILTER (WHERE w.report_instance_id IS NOT NULL)::bigint
    AS reply_ticket_wallets_report_instance_nonnull_rows,
  COUNT(*) FILTER (WHERE w.report_instance_id IS NULL)::bigint
    AS reply_ticket_wallets_report_instance_null_rows_quarantine_bucket
FROM public.reply_ticket_wallets AS w;

SELECT COUNT(*)::bigint AS reply_wallet_ledgers_total_rows FROM public.reply_wallet_ledgers;

SELECT
  COUNT(*) FILTER (WHERE l.report_instance_id IS NOT NULL)::bigint
    AS reply_wallet_ledgers_report_instance_nonnull_rows,
  COUNT(*) FILTER (WHERE l.report_instance_id IS NULL)::bigint
    AS reply_wallet_ledgers_report_instance_null_rows_quarantine_bucket
FROM public.reply_wallet_ledgers AS l;

SELECT COUNT(*)::bigint AS reply_sessions_total_rows FROM public.reply_sessions;

SELECT
  COUNT(*) FILTER (WHERE s.report_instance_id IS NOT NULL)::bigint
    AS reply_sessions_report_instance_nonnull_rows,
  COUNT(*) FILTER (WHERE s.report_instance_id IS NULL)::bigint
    AS reply_sessions_report_instance_null_rows_quarantine_bucket
FROM public.reply_sessions AS s;


-- =============================================================================
-- SECTION 4 — Cap integrity (wallet)
-- =============================================================================
SELECT COUNT(*) FILTER (WHERE
    available_count <>
    initial_included_count + purchased_count - consumed_count
)::bigint AS reply_ticket_wallets_cap_formula_violation_count
FROM public.reply_ticket_wallets;


-- =============================================================================
-- SECTION 5 — reply_wallet_ledgers constraints and NOT NULL columns + indexes
-- =============================================================================
SELECT
  c.conname::text AS constraint_name,
  c.contype::text AS contype_pg,
  pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
ORDER BY c.contype, c.conname;

SELECT
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public' AND c.table_name = 'reply_wallet_ledgers'
  AND c.is_nullable = 'NO'
ORDER BY c.ordinal_position;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'reply_wallet_ledgers'
ORDER BY pi.indexname;


-- =============================================================================
-- SECTION 6 — reply_ticket_wallets constraints + indexes
-- =============================================================================
SELECT
  c.conname::text AS constraint_name,
  c.contype::text AS contype_pg,
  pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_ticket_wallets'
ORDER BY c.contype, c.conname;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'reply_ticket_wallets'
ORDER BY pi.indexname;


-- =============================================================================
-- SECTION 7 — PRODUCTION PREFLIGHT SUMMARY (single row; verify project name manually)
-- =============================================================================
WITH
stripe_proc AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema='public' AND t.table_name='stripe_processed_events'
  ) AS v
),
four_present AS (
  SELECT count(*)::int AS n
  FROM (VALUES
    ('stripe_event_id'),
    ('stripe_checkout_session_id'),
    ('stripe_payment_intent_id'),
    ('product_key')
  ) v(col)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema='public' AND ic.table_name='reply_wallet_ledgers'
      AND ic.column_name = v.col
  )
),
payload_pres AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema='public' AND ic.table_name='reply_wallet_ledgers'
      AND ic.column_name='payload_json'
  ) AS v
),
capviol AS (
  SELECT COUNT(*)::bigint AS vn
  FROM public.reply_ticket_wallets w
  WHERE w.available_count
    <> w.initial_included_count + w.purchased_count - w.consumed_count
)
SELECT
  current_database()::text AS current_database_name_record,
  NOT COALESCE((SELECT stripe_proc.v FROM stripe_proc), false) AS stripe_processed_events_absent_ok_for_additive,
  COALESCE((SELECT n FROM four_present), 0) = 0 AS ledger_four_candidate_columns_all_absent_ok,
  NOT COALESCE((SELECT payload_pres.v FROM payload_pres), false)
    AS reply_wallet_ledgers_no_payload_json_ok,
  COALESCE((SELECT vn FROM capviol), 0) = 0 AS wallet_cap_formula_has_zero_violations_ok,
  (
    NOT COALESCE((SELECT stripe_proc.v FROM stripe_proc), false)
    AND COALESCE((SELECT n FROM four_present), 0) = 0
    AND NOT COALESCE((SELECT payload_pres.v FROM payload_pres), false)
    AND COALESCE((SELECT vn FROM capviol), 0) = 0
  ) AS production_additive_schema_preflight_pass_summary_heuristic;


-- END OF FILE
