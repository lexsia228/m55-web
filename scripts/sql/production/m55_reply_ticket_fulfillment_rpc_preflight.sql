-- ============================================================================
-- M55 — REPLY TICKET — PHASE IV RPC — PREFLIGHT — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql
--
-- Executable: SELECT only.
-- Forbidden: INSERT / UPDATE / DELETE / ALTER / DROP / CREATE / SET / NOTIFY.
-- Output: catalog metadata, aggregate counts — no payloads, secrets, URLs,
--   raw user_id literals in row samples (only aggregate counts; optional aggregate
--   distinct md5 cardinality).
--
-- Target RPC (not applied here): staging/m55_reply_ticket_fulfillment_rpc_candidate.sql
-- SSOT: docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_PREFLIGHT_PACKET_v1.md
--
-- BEFORE RUNNING: Confirm target DB. Run SECTION-by-SECTION when UI shows last
--   result only. This packet OBSERVES only — it does NOT grant RPC apply GO.
-- ============================================================================


-- =============================================================================
-- SECTION 1 — Database identity (operator confirmation)
-- =============================================================================
SELECT current_database()::text AS current_database_name;


-- =============================================================================
-- SECTION 2 — RPC function existence + signature material (judgment aids)
--     Expected CREATE OR REPLACE target:
--       args identity (no names): text, text, text, text, uuid, text, text, integer
--       result: jsonb
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM pg_proc AS p
    JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
    WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
) AS rpc_function_already_exists;

SELECT
  p.oid::bigint AS rpc_proc_oid,
  p.proname::text AS proname,
  pg_get_function_identity_arguments(p.oid)::text AS rpc_identity_arguments,
  pg_get_function_result(p.oid)::text AS rpc_result_type,
  CASE
    WHEN pg_get_function_identity_arguments(p.oid)
      = 'text, text, text, text, uuid, text, text, integer'::text AND
      pg_get_function_result(p.oid) = 'jsonb'::text THEN true
    ELSE false
  END AS rpc_signature_matches_rpc_candidate_expected,
  CASE
    WHEN pg_get_function_identity_arguments(p.oid)
      <> 'text, text, text, text, uuid, text, text, integer'::text THEN 'signature_args_mismatch'
    WHEN pg_get_function_result(p.oid) <> 'jsonb'::text THEN 'result_type_not_jsonb'
    ELSE NULL
  END AS rpc_signature_mismatch_reason
FROM pg_proc AS p
JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event';


-- =============================================================================
-- SECTION 3 — Required tables (RPC dependencies)
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
) AS stripe_processed_events_table_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
) AS reply_ticket_wallets_table_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_wallet_ledgers'
) AS reply_wallet_ledgers_table_exists;

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'dtr_report_snapshots'
) AS dtr_report_snapshots_table_exists;


-- =============================================================================
-- SECTION 4 — Required columns presence (BOOLEAN per expected column only)
--     NOTE: stripe_processed_events includes updated_at (RPC INSERT/UPDATE).
--     NOTE: reply_ticket_wallets includes id (RPC UPDATE ... WHERE w.id).
-- =============================================================================
WITH want (tbl_schema, tbl_name, col_name, qualified_label) AS (
  VALUES
    ('public', 'stripe_processed_events', 'stripe_event_id'::text,
     'stripe_processed_events.stripe_event_id'::text),
    ('public', 'stripe_processed_events', 'checkout_session_id',
     'stripe_processed_events.checkout_session_id'),
    ('public', 'stripe_processed_events', 'payment_intent_id',
     'stripe_processed_events.payment_intent_id'),
    ('public', 'stripe_processed_events', 'product_key',
     'stripe_processed_events.product_key'),
    ('public', 'stripe_processed_events', 'report_instance_id',
     'stripe_processed_events.report_instance_id'),
    ('public', 'stripe_processed_events', 'user_ref_hash',
     'stripe_processed_events.user_ref_hash'),
    ('public', 'stripe_processed_events', 'status',
     'stripe_processed_events.status'),
    ('public', 'stripe_processed_events', 'processed_at',
     'stripe_processed_events.processed_at'),
    ('public', 'stripe_processed_events', 'updated_at',
     'stripe_processed_events.updated_at'),
    ('public', 'reply_ticket_wallets', 'id',
     'reply_ticket_wallets.id'),
    ('public', 'reply_ticket_wallets', 'user_id',
     'reply_ticket_wallets.user_id'),
    ('public', 'reply_ticket_wallets', 'status',
     'reply_ticket_wallets.status'),
    ('public', 'reply_ticket_wallets', 'initial_included_count',
     'reply_ticket_wallets.initial_included_count'),
    ('public', 'reply_ticket_wallets', 'purchased_count',
     'reply_ticket_wallets.purchased_count'),
    ('public', 'reply_ticket_wallets', 'available_count',
     'reply_ticket_wallets.available_count'),
    ('public', 'reply_ticket_wallets', 'consumed_count',
     'reply_ticket_wallets.consumed_count'),
    ('public', 'reply_wallet_ledgers', 'wallet_id',
     'reply_wallet_ledgers.wallet_id'),
    ('public', 'reply_wallet_ledgers', 'user_id',
     'reply_wallet_ledgers.user_id'),
    ('public', 'reply_wallet_ledgers', 'report_instance_id',
     'reply_wallet_ledgers.report_instance_id'),
    ('public', 'reply_wallet_ledgers', 'delta',
     'reply_wallet_ledgers.delta'),
    ('public', 'reply_wallet_ledgers', 'balance_after',
     'reply_wallet_ledgers.balance_after'),
    ('public', 'reply_wallet_ledgers', 'event_type',
     'reply_wallet_ledgers.event_type'),
    ('public', 'reply_wallet_ledgers', 'source_of_grant',
     'reply_wallet_ledgers.source_of_grant'),
    ('public', 'reply_wallet_ledgers', 'reply_session_id',
     'reply_wallet_ledgers.reply_session_id'),
    ('public', 'reply_wallet_ledgers', 'stripe_event_id',
     'reply_wallet_ledgers.stripe_event_id'),
    ('public', 'reply_wallet_ledgers', 'stripe_checkout_session_id',
     'reply_wallet_ledgers.stripe_checkout_session_id'),
    ('public', 'reply_wallet_ledgers', 'stripe_payment_intent_id',
     'reply_wallet_ledgers.stripe_payment_intent_id'),
    ('public', 'reply_wallet_ledgers', 'product_key',
     'reply_wallet_ledgers.product_key'),
    ('public', 'dtr_report_snapshots', 'id',
     'dtr_report_snapshots.id'),
    ('public', 'dtr_report_snapshots', 'user_id',
     'dtr_report_snapshots.user_id')
)
SELECT
  want.qualified_label::text AS qualified_label,
  EXISTS (
    SELECT 1 FROM information_schema.columns AS ic
    WHERE ic.table_schema = want.tbl_schema
      AND ic.table_name = want.tbl_name
      AND ic.column_name = want.col_name
  ) AS column_present
FROM want
ORDER BY want.qualified_label;


-- =============================================================================
-- SECTION 5 — Column catalog snippets (ordering for human diff)
-- =============================================================================
SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public' AND c.table_name = 'stripe_processed_events'
ORDER BY c.ordinal_position;

SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public' AND c.table_name = 'reply_ticket_wallets'
ORDER BY c.ordinal_position;

SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public' AND c.table_name = 'reply_wallet_ledgers'
ORDER BY c.ordinal_position;

SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public' AND c.table_name = 'dtr_report_snapshots'
ORDER BY c.ordinal_position;


-- =============================================================================
-- SECTION 6 — stripe_processed_events: partial UNIQUE on stripe_event_id
-- =============================================================================
SELECT EXISTS (
    SELECT 1 FROM pg_indexes pi
    WHERE pi.schemaname = 'public'
      AND pi.tablename = 'stripe_processed_events'
      AND pi.indexdef ILIKE '%UNIQUE%'
      AND pi.indexdef ILIKE '%stripe_event_id%'
      AND pi.indexdef ILIKE '%WHERE%'
  ) AS stripe_processed_events_partial_unique_on_stripe_event_id_exists;

SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public' AND pi.tablename = 'stripe_processed_events'
ORDER BY pi.indexname;


-- =============================================================================
-- SECTION 7 — reply_wallet_ledgers: CHECK verbatim + heuristic flags (NOT proof)
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
)::boolean AS ledger_check_text_mentions_purchase_grant;

SELECT (
    EXISTS (
      SELECT 1 FROM pg_constraint AS c
      JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
      JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
      WHERE c.contype = 'c'::"char"
        AND pg_get_constraintdef(c.oid) ILIKE '%source_of_grant%'
        AND pg_get_constraintdef(c.oid) ILIKE '%PURCHASE%'
    )
)::boolean AS ledger_check_text_mentions_purchase_literal;


SELECT EXISTS (
    SELECT 1 FROM information_schema.columns AS ic
    WHERE ic.table_schema = 'public'
      AND ic.table_name = 'reply_wallet_ledgers'
      AND ic.column_name = 'report_instance_id'
) AS reply_wallet_ledgers_report_instance_id_column_exists;


-- =============================================================================
-- SECTION 8 — FK / PK / UNIQUE / CHECK — baseline listings (constraints)
-- =============================================================================
SELECT
  cl.relname::text AS table_name,
  c.conname::text AS constraint_name,
  c.contype::text AS contype_pg,
  pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS cl ON c.conrelid = cl.oid
WHERE cl.relname IN (
      'stripe_processed_events',
      'reply_ticket_wallets',
      'reply_wallet_ledgers',
      'dtr_report_snapshots'
    )
ORDER BY table_name, c.contype, c.conname;


-- =============================================================================
-- SECTION 9 — NOT NULL baseline (catalog) on required tables
-- =============================================================================
SELECT
  c.table_name::text AS table_name,
  c.column_name::text AS column_name,
  c.is_nullable::text AS is_nullable_catalog
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'stripe_processed_events',
    'reply_ticket_wallets',
    'reply_wallet_ledgers',
    'dtr_report_snapshots'
  )
ORDER BY c.table_name, c.ordinal_position;


-- =============================================================================
-- SECTION 10 — Baseline row counts (skipped if relation missing → run after S3)
-- =============================================================================
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
)
THEN (SELECT COUNT(*)::bigint FROM public.stripe_processed_events)
END AS stripe_processed_events_row_count_if_table_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
)
THEN (SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets)
END AS reply_ticket_wallets_row_count_if_table_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_wallet_ledgers'
)
THEN (SELECT COUNT(*)::bigint FROM public.reply_wallet_ledgers)
END AS reply_wallet_ledgers_row_count_if_table_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_sessions'
)
THEN (SELECT COUNT(*)::bigint FROM public.reply_sessions)
END AS reply_sessions_row_count_if_table_exists;


-- =============================================================================
-- SECTION 11 — Referential / domain non-null sentinel counts (no identifiers)
-- =============================================================================
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
)
THEN (
  SELECT COUNT(*) FILTER (WHERE w.user_id IS NULL)::bigint FROM public.reply_ticket_wallets AS w
)
END AS reply_ticket_wallets_user_id_null_rows_if_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_wallet_ledgers'
)
THEN (
  SELECT COUNT(*) FILTER (WHERE l.user_id IS NULL OR l.wallet_id IS NULL)::bigint
  FROM public.reply_wallet_ledgers AS l
)
END AS reply_wallet_ledgers_user_or_wallet_null_rows_if_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_sessions'
)
THEN (
  SELECT COUNT(*) FILTER (WHERE s.user_id IS NULL)::bigint FROM public.reply_sessions AS s
)
END AS reply_sessions_user_id_null_rows_if_exists;


-- =============================================================================
-- SECTION 12 — Sample safety aggregates (counts only; hash cardinality only)
-- =============================================================================
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
)
THEN (
  SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets AS w
  WHERE w.status IS NOT DISTINCT FROM 'active'
    AND NOT (
      (w.initial_included_count + w.purchased_count >= 5)
      OR (w.purchased_count >= 4)
    )
)
END AS safe_wallet_candidate_count_if_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
)
THEN (
  SELECT COUNT(*) FILTER (WHERE w.status IS NOT DISTINCT FROM 'active')::bigint
  FROM public.reply_ticket_wallets AS w
)
END AS reply_ticket_wallets_active_count_if_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
)
THEN (
  SELECT COUNT(*)::bigint FROM public.reply_ticket_wallets AS w
  WHERE (w.initial_included_count + w.purchased_count >= 5)
    OR (w.purchased_count >= 4)
)
END AS cap_already_reached_wallet_count_if_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public'
      AND ic.table_name = 'reply_ticket_wallets'
      AND ic.column_name = 'report_instance_id'
)
THEN (
  SELECT COUNT(*) FILTER (WHERE w.report_instance_id IS NOT NULL)::bigint
  FROM public.reply_ticket_wallets AS w
)
END AS reply_ticket_wallets_report_instance_id_nonnull_count_if_exists;

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
)
THEN (
  SELECT COUNT(DISTINCT md5(w.user_id::text))::bigint
  FROM public.reply_ticket_wallets AS w
)
END AS distinct_wallet_user_id_md5_cardinality_if_exists;


-- =============================================================================
-- SECTION 13 — Heuristic summary row (interpret with PACKET — not apply GO)
-- =============================================================================
WITH
req (rel, col) AS (
  VALUES
    ('stripe_processed_events', 'stripe_event_id'),
    ('stripe_processed_events', 'checkout_session_id'),
    ('stripe_processed_events', 'payment_intent_id'),
    ('stripe_processed_events', 'product_key'),
    ('stripe_processed_events', 'report_instance_id'),
    ('stripe_processed_events', 'user_ref_hash'),
    ('stripe_processed_events', 'status'),
    ('stripe_processed_events', 'processed_at'),
    ('stripe_processed_events', 'updated_at'),
    ('reply_ticket_wallets', 'id'),
    ('reply_ticket_wallets', 'user_id'),
    ('reply_ticket_wallets', 'status'),
    ('reply_ticket_wallets', 'initial_included_count'),
    ('reply_ticket_wallets', 'purchased_count'),
    ('reply_ticket_wallets', 'available_count'),
    ('reply_ticket_wallets', 'consumed_count'),
    ('reply_wallet_ledgers', 'wallet_id'),
    ('reply_wallet_ledgers', 'user_id'),
    ('reply_wallet_ledgers', 'report_instance_id'),
    ('reply_wallet_ledgers', 'delta'),
    ('reply_wallet_ledgers', 'balance_after'),
    ('reply_wallet_ledgers', 'event_type'),
    ('reply_wallet_ledgers', 'source_of_grant'),
    ('reply_wallet_ledgers', 'reply_session_id'),
    ('reply_wallet_ledgers', 'stripe_event_id'),
    ('reply_wallet_ledgers', 'stripe_checkout_session_id'),
    ('reply_wallet_ledgers', 'stripe_payment_intent_id'),
    ('reply_wallet_ledgers', 'product_key'),
    ('dtr_report_snapshots', 'id'),
    ('dtr_report_snapshots', 'user_id')
),
tbl_stripe AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_processed_events'
  ) AS v
),
tbl_wallet AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
  ) AS v
),
tbl_ledger AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_wallet_ledgers'
  ) AS v
),
tbl_snapshot AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'dtr_report_snapshots'
  ) AS v
),
tbl_sessions AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_sessions'
  ) AS v
),
rpc_function_already_exists AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_proc AS p
    JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
    WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
  ) AS ok
),
rpc_existing_signature_conflict AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_proc AS p
    JOIN pg_namespace AS n ON p.pronamespace = n.oid AND n.nspname = 'public'
    WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
      AND (
        pg_get_function_identity_arguments(p.oid)
          <> 'text, text, text, text, uuid, text, text, integer'::text
        OR pg_get_function_result(p.oid) <> 'jsonb'::text
      )
  ) AS conflicts
),
required_tables_exist AS (
  SELECT
    (SELECT tbl_stripe.v FROM tbl_stripe)
    AND (SELECT tbl_wallet.v FROM tbl_wallet)
    AND (SELECT tbl_ledger.v FROM tbl_ledger)
    AND (SELECT tbl_snapshot.v FROM tbl_snapshot) AS ok
),
required_column_match_count AS (
  SELECT COUNT(*)::bigint AS matched_ct
  FROM req
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns AS ic
    WHERE ic.table_schema = 'public'
      AND ic.table_name = req.rel
      AND ic.column_name = req.col
  )
),
required_columns_exist AS (
  SELECT COALESCE((SELECT m.matched_ct FROM required_column_match_count AS m), 0::bigint) = 30
    AS ok
),
partial_unique_index_exists AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes pi
    WHERE pi.schemaname = 'public'
      AND pi.tablename = 'stripe_processed_events'
      AND pi.indexdef ILIKE '%UNIQUE%'
      AND pi.indexdef ILIKE '%stripe_event_id%'
      AND pi.indexdef ILIKE '%WHERE%'
  ) AS ok
),
ledger_check_allows_purchase_grant AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint AS c
    JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
    JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
    WHERE c.contype = 'c'::"char"
      AND pg_get_constraintdef(c.oid) ILIKE '%purchase_grant%'
  ) AS ok
),
ledger_check_allows_purchase_source AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint AS c
    JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
    JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
    WHERE c.contype = 'c'::"char"
      AND pg_get_constraintdef(c.oid) ILIKE '%source_of_grant%'
      AND pg_get_constraintdef(c.oid) ILIKE '%PURCHASE%'
  ) AS ok
),
wallet_cap_formula_violation_count AS (
  SELECT CASE WHEN (SELECT tbl_wallet.v FROM tbl_wallet) THEN (
    SELECT COUNT(*)::bigint
    FROM public.reply_ticket_wallets AS w
    WHERE w.available_count
      <> w.initial_included_count + w.purchased_count - w.consumed_count
  ) ELSE NULL::bigint END AS ct
),
wallet_user_id_null_rows AS (
  SELECT CASE WHEN (SELECT tbl_wallet.v FROM tbl_wallet) THEN (
    SELECT COUNT(*) FILTER (WHERE w.user_id IS NULL)::bigint FROM public.reply_ticket_wallets AS w
  ) ELSE NULL::bigint END AS ct
),
ledger_user_wallet_null_rows AS (
  SELECT CASE WHEN (SELECT tbl_ledger.v FROM tbl_ledger) THEN (
    SELECT COUNT(*) FILTER (WHERE l.user_id IS NULL OR l.wallet_id IS NULL)::bigint
    FROM public.reply_wallet_ledgers AS l
  ) ELSE NULL::bigint END AS ct
),
sessions_user_id_null_rows AS (
  SELECT CASE WHEN (SELECT tbl_sessions.v FROM tbl_sessions) THEN (
    SELECT COUNT(*) FILTER (WHERE s.user_id IS NULL)::bigint FROM public.reply_sessions AS s
  ) ELSE NULL::bigint END AS ct
),
baseline_counts_ready AS (
  SELECT
    (SELECT required_tables_exist.ok FROM required_tables_exist)
      AND COALESCE((SELECT tbl_sessions.v FROM tbl_sessions), false) AS ok
),
blocking_gap_count AS (
  SELECT CAST(
      (CASE WHEN NOT (SELECT required_tables_exist.ok FROM required_tables_exist) THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT required_columns_exist.ok FROM required_columns_exist), false) THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT partial_unique_index_exists.ok FROM partial_unique_index_exists), false) THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT ledger_check_allows_purchase_grant.ok FROM ledger_check_allows_purchase_grant), false) THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT ledger_check_allows_purchase_source.ok FROM ledger_check_allows_purchase_source), false) THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT rpc_existing_signature_conflict.conflicts FROM rpc_existing_signature_conflict), false) THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT wallet_cap_formula_violation_count.ct FROM wallet_cap_formula_violation_count), 0::bigint) > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT wallet_user_id_null_rows.ct FROM wallet_user_id_null_rows), 0::bigint) > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT ledger_user_wallet_null_rows.ct FROM ledger_user_wallet_null_rows), 0::bigint) > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT sessions_user_id_null_rows.ct FROM sessions_user_id_null_rows), 0::bigint) > 0 THEN 1 ELSE 0 END)
    + (CASE WHEN NOT COALESCE((SELECT tbl_sessions.v FROM tbl_sessions), false) THEN 1 ELSE 0 END)
  AS bigint) AS gaps
),
rpc_preflight_ready AS (
  SELECT (SELECT blocking_gap_count.gaps FROM blocking_gap_count) = 0 AS ok
)
SELECT
  (SELECT rpc_function_already_exists.ok FROM rpc_function_already_exists) AS rpc_function_already_exists,
  (SELECT required_tables_exist.ok FROM required_tables_exist) AS required_tables_exist,
  (SELECT required_columns_exist.ok FROM required_columns_exist) AS required_columns_exist,
  COALESCE((SELECT m.matched_ct FROM required_column_match_count AS m), 0::bigint)
    AS required_columns_matched_out_of_30,
  (SELECT partial_unique_index_exists.ok FROM partial_unique_index_exists) AS partial_unique_index_exists,
  (SELECT ledger_check_allows_purchase_grant.ok FROM ledger_check_allows_purchase_grant)
    AS ledger_check_allows_purchase_grant,
  (SELECT ledger_check_allows_purchase_source.ok FROM ledger_check_allows_purchase_source)
    AS ledger_check_allows_purchase_source,
  COALESCE((SELECT baseline_counts_ready.ok FROM baseline_counts_ready), false) AS baseline_counts_ready,
  COALESCE((SELECT rpc_preflight_ready.ok FROM rpc_preflight_ready), false) AS rpc_preflight_ready,
  (SELECT blocking_gap_count.gaps FROM blocking_gap_count) AS blocking_gap_count;


-- ============================================================================
-- END OF FILE
-- ============================================================================
