-- ============================================================================
-- M55 — REPLY TICKET FULFILLMENT — ADDITIVE MIGRATION PREFLIGHT — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_preflight.sql
--
-- Executable: SELECT only.
-- Forbidden: INSERT/UPDATE/DELETE/DDL/SET/NOTIFY.
-- Output: catalog metadata, aggregate counts — no payloads, secrets, URLs,
--   raw user_id, PII row bodies.
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_PACKET_v1.md
-- Design: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_DESIGN_REVIEW_v1.md
--
-- BEFORE RUNNING: Confirm target DB. Run SECTION-by-SECTION when the UI shows
--   only the last result set.
-- ============================================================================


-- =============================================================================
-- SECTION 1 — Candidate name: stripe_processed_events must NOT exist (clean add)
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
) AS processed_events_table_already_exists;


-- =============================================================================
-- SECTION 2 — Tables with processed / stripe / webhook / fulfillment flavor (names only)
-- =============================================================================
SELECT t.table_name::text AS table_name
FROM information_schema.tables AS t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND (
    (t.table_name ILIKE '%processed%' AND t.table_name ILIKE '%stripe%')
    OR (t.table_name ILIKE '%stripe%' AND t.table_name ILIKE '%webhook%')
    OR (t.table_name ILIKE '%fulfillment%' AND t.table_name ILIKE '%stripe%')
    OR (
      t.table_name ILIKE '%webhook%'
      AND (t.table_name ILIKE '%event%' OR t.table_name ILIKE '%stripe%')
    )
  )
ORDER BY t.table_name;


-- =============================================================================
-- SECTION 3 — stripe_events: existence + column catalog + ID-like columns
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_events'
) AS stripe_events_table_exists;

SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable,
  c.column_default::text AS column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'stripe_events'
ORDER BY c.ordinal_position;

SELECT c.column_name::text AS column_name
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'stripe_events'
  AND (
    c.column_name ILIKE '%stripe_event%'
    OR c.column_name ILIKE '%event_id%'
    OR c.column_name ILIKE '%checkout%'
    OR c.column_name ILIKE '%payment_intent%'
    OR c.column_name ILIKE '%session%'
  )
ORDER BY c.column_name;


-- =============================================================================
-- SECTION 4 — reply_wallet_ledgers: proposed additive column name collision check
-- =============================================================================
WITH want AS (
  SELECT unnest(ARRAY[
    'stripe_event_id'::text,
    'checkout_session_id'::text,
    'stripe_checkout_session_id'::text,
    'payment_intent_id'::text,
    'stripe_payment_intent_id'::text,
    'product_key'::text,
    'payload_json'::text
  ]) AS column_name_candidate
)
SELECT
  want.column_name_candidate,
  EXISTS (
    SELECT 1 FROM information_schema.columns AS ic
    WHERE ic.table_schema = 'public'
      AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = want.column_name_candidate
  ) AS column_already_present
FROM want
ORDER BY want.column_name_candidate;


-- =============================================================================
-- SECTION 5 — Ledger & wallet baseline row counts +
--               report_instance_id distribution (counts only — no identifiers)
-- =============================================================================
SELECT COUNT(*)::bigint AS reply_wallet_ledgers_total_rows FROM public.reply_wallet_ledgers;

SELECT
  COUNT(*) FILTER (WHERE l.report_instance_id IS NOT NULL)::bigint
    AS reply_wallet_ledgers_report_instance_nonnull_rows,
  COUNT(*) FILTER (WHERE l.report_instance_id IS NULL)::bigint
    AS reply_wallet_ledgers_report_instance_null_rows
FROM public.reply_wallet_ledgers AS l;

SELECT COUNT(*)::bigint AS reply_ticket_wallets_total_rows FROM public.reply_ticket_wallets;

SELECT
  COUNT(*) FILTER (WHERE w.report_instance_id IS NOT NULL)::bigint
    AS reply_ticket_wallets_report_instance_nonnull_rows,
  COUNT(*) FILTER (WHERE w.report_instance_id IS NULL)::bigint
    AS reply_ticket_wallets_report_instance_null_rows
FROM public.reply_ticket_wallets AS w;

SELECT COUNT(*)::bigint AS reply_sessions_total_rows FROM public.reply_sessions;

SELECT
  COUNT(*) FILTER (WHERE s.report_instance_id IS NOT NULL)::bigint
    AS reply_sessions_report_instance_nonnull_rows,
  COUNT(*) FILTER (WHERE s.report_instance_id IS NULL)::bigint
    AS reply_sessions_report_instance_null_rows
FROM public.reply_sessions AS s;


-- =============================================================================
-- SECTION 6 — Wallet cap / status columns (existence booleans via catalog)
-- =============================================================================
WITH need AS (
  SELECT unnest(ARRAY[
    'initial_included_count'::text,
    'purchased_count'::text,
    'consumed_count'::text,
    'available_count'::text,
    'status'::text,
    'report_instance_id'::text
  ]) AS col
)
SELECT
  need.col AS wallet_column_candidate,
  EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_ticket_wallets'
      AND ic.column_name = need.col
  ) AS wallet_column_present
FROM need
ORDER BY wallet_column_candidate;


-- =============================================================================
-- SECTION 7 — Cap integrity heuristic: rows violating canonical formula (counts only)
-- =============================================================================
SELECT COUNT(*) FILTER (WHERE TRUE
  AND (
    available_count <>
    initial_included_count + purchased_count - consumed_count
  )
)::bigint AS reply_ticket_wallets_cap_formula_violation_count
FROM public.reply_ticket_wallets;


-- =============================================================================
-- SECTION 8 — reply_wallet_ledgers CHECK constraints mentioning event_type /
--             source_of_grant (verbatim definitions for review)
-- =============================================================================
SELECT
  c.conname::text AS constraint_name,
  pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
WHERE c.contype = 'c'::"char"
ORDER BY c.conname;

SELECT (
  EXISTS (
    SELECT 1 FROM pg_constraint AS c
    JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
    JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
    WHERE c.contype = 'c'::"char"
      AND pg_get_constraintdef(c.oid) ILIKE '%purchase_grant%'
  )
)::boolean AS check_text_mentions_purchase_grant_keyword;

SELECT (
  EXISTS (
    SELECT 1 FROM pg_constraint AS c
    JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
    JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
    WHERE c.contype = 'c'::"char"
      AND pg_get_constraintdef(c.oid) ILIKE '%source_of_grant%'
      AND pg_get_constraintdef(c.oid) ILIKE '%PURCHASE%'
  )
)::boolean AS check_text_mentions_source_purchase_literal;


-- =============================================================================
-- SECTION 9 — Index / UNIQUE — stripe_events, reply_wallet_ledgers, reply_ticket_wallets
-- =============================================================================
SELECT c.conname::text AS constraint_name, c.contype::text AS contype_pg,
       pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'stripe_events'
ORDER BY c.contype, c.conname;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_events'
ORDER BY pi.indexname;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'reply_wallet_ledgers'
ORDER BY pi.indexname;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'reply_ticket_wallets'
ORDER BY pi.indexname;

SELECT c.conname::text AS constraint_name, c.contype::text AS contype_pg,
       pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_ticket_wallets'
ORDER BY c.contype, c.conname;


-- =============================================================================
-- SECTION 10 — PREFLIGHT SUMMARY (single row; heuristic flags — interpret with PACKET)
-- =============================================================================
WITH
stripe_proc_exists AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
  ) AS v
),
stripe_events_tab AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_events'
  ) AS v
),
stripe_events_id_like_exists AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'stripe_events'
      AND (
        c.column_name ILIKE '%processed%'
        OR c.column_name ILIKE '%event%id%'
        OR c.column_name ILIKE '%payload_hash%'
      )
  ) AS v
),
ledger_evt AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = 'stripe_event_id'
  ) AS ev
),
ledger_cs AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name IN ('checkout_session_id', 'stripe_checkout_session_id')
  ) AS ev
),
ledger_pi AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name IN ('payment_intent_id', 'stripe_payment_intent_id')
  ) AS ev
),
wallet_need AS (
  SELECT count(DISTINCT ic.column_name)::int AS ct
  FROM information_schema.columns AS ic
  WHERE ic.table_schema = 'public' AND ic.table_name = 'reply_ticket_wallets'
    AND ic.column_name IN (
      'initial_included_count','purchased_count','consumed_count',
      'available_count','status','report_instance_id'
    )
),
capviol AS (
  SELECT COUNT(*)::bigint AS vn
  FROM public.reply_ticket_wallets w
  WHERE w.available_count
    <> w.initial_included_count + w.purchased_count - w.consumed_count
),
purchase_kw AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint AS c
    JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
    JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
    WHERE c.contype = 'c'::"char"
      AND pg_get_constraintdef(c.oid) ILIKE '%purchase_grant%'
  ) AS ev
),
source_purchase_kw AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint AS c
    JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
    JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
    WHERE c.contype = 'c'::"char"
      AND pg_get_constraintdef(c.oid) ILIKE '%source_of_grant%'
      AND pg_get_constraintdef(c.oid) ILIKE '%PURCHASE%'
  ) AS ev
),
wallet_exist AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables t WHERE t.table_schema='public'
      AND t.table_name='reply_ticket_wallets'
  ) AS ev
),
ledger_exist AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables t WHERE t.table_schema='public'
      AND t.table_name='reply_wallet_ledgers'
  ) AS ev
),
ledger_three_ok AS (
  SELECT (
    COALESCE((SELECT ledger_evt.ev FROM ledger_evt), false)
    AND COALESCE((SELECT ledger_cs.ev FROM ledger_cs), false)
    AND COALESCE((SELECT ledger_pi.ev FROM ledger_pi), false)
  ) AS ev
),
blocking_gap_calc AS (
  SELECT CAST(
      (CASE WHEN NOT COALESCE((SELECT wallet_exist.ev FROM wallet_exist), false) THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT ledger_exist.ev FROM ledger_exist), false) THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT vn FROM capviol), 0) > 0 THEN 1 ELSE 0 END)
    AS smallint
  ) AS gap
)
SELECT
  (SELECT stripe_proc_exists.v FROM stripe_proc_exists) AS processed_events_table_already_exists,
  COALESCE((SELECT stripe_events_tab.v FROM stripe_events_tab), false)
    AND COALESCE((SELECT stripe_events_id_like_exists.v FROM stripe_events_id_like_exists), false)
    AS stripe_events_reuse_possible,
  COALESCE((SELECT ledger_three_ok.ev FROM ledger_three_ok), false)
    AS ledger_stripe_columns_already_exist,
  NOT COALESCE((SELECT ledger_three_ok.ev FROM ledger_three_ok), false)
    AS ledger_needs_nullable_reference_columns,
  (
    COALESCE((SELECT purchase_kw.ev FROM purchase_kw), false)
    AND COALESCE((SELECT source_purchase_kw.ev FROM source_purchase_kw), false)
  ) AS check_can_use_existing_values_without_extension,
  (
    COALESCE((SELECT ct FROM wallet_need), 0) = 6
    AND COALESCE((SELECT vn FROM capviol), 0) = 0
  ) AS wallet_ready_for_cap_enforcement,
  (
    (SELECT blocking_gap_calc.gap FROM blocking_gap_calc) = 0
    AND (
      NOT COALESCE((SELECT stripe_proc_exists.v FROM stripe_proc_exists), false)
      OR NOT COALESCE((SELECT ledger_three_ok.ev FROM ledger_three_ok), false)
    )
  ) AS additive_migration_candidate_needed,
  (SELECT blocking_gap_calc.gap FROM blocking_gap_calc) AS blocking_gap_count;


-- =============================================================================
-- END OF FILE
-- =============================================================================