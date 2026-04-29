-- ============================================================================
-- M55 — REPLY TICKET FULFILLMENT — SCHEMA GAP DIAGNOSTIC — SELECT ONLY
-- Path: scripts/sql/production/m55_reply_ticket_fulfillment_schema_gap_diagnostic.sql
--
-- Executable: SELECT only. Forbidden: INSERT/UPDATE/DELETE/DDL/SET.
-- Output: catalog info only — column names, types, constraint/index definitions,
--   counts, existence booleans. No application row bodies, payloads, secrets, URLs,
--   raw user_id, Stripe keys, webhook secrets.
--
-- SSOT: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_PACKET_v1.md
-- Related: docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1.md
--
-- BEFORE RUNNING: Confirm target DB. Run SECTION-by-SECTION if your SQL UI shows
--   only the last result set when multiple statements execute.
-- ============================================================================


-- =============================================================================
-- SECTION 1 — WALLET TABLE — column catalog (information_schema.columns)
-- =============================================================================
SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable,
  c.column_default::text AS column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'reply_ticket_wallets'
ORDER BY c.ordinal_position;


-- =============================================================================
-- SECTION 2 — WALLET TABLE — PRIMARY KEY / UNIQUE / CHECK (pg_catalog)
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
WHERE pi.schemaname = 'public'
  AND pi.tablename = 'reply_ticket_wallets'
ORDER BY pi.indexname;


-- =============================================================================
-- SECTION 3 — LEDGER TABLE — column catalog
-- =============================================================================
SELECT
  c.ordinal_position AS ord,
  c.column_name::text AS column_name,
  c.data_type::text AS data_type,
  c.is_nullable::text AS is_nullable,
  c.column_default::text AS column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'reply_wallet_ledgers'
ORDER BY c.ordinal_position;


-- =============================================================================
-- SECTION 4 — LEDGER TABLE — UNIQUE / CHECK / FK (pg_catalog)
-- =============================================================================
SELECT
  c.conname::text AS constraint_name,
  c.contype::text AS contype_pg,
  pg_get_constraintdef(c.oid)::text AS constraint_definition
FROM pg_constraint AS c
JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
JOIN pg_class AS t ON c.conrelid = t.oid AND t.relname = 'reply_wallet_ledgers'
ORDER BY c.contype, c.conname;


SELECT pi.indexname::text AS index_name, pi.indexdef::text AS index_definition
FROM pg_indexes AS pi
WHERE pi.schemaname = 'public'
  AND pi.tablename = 'reply_wallet_ledgers'
ORDER BY pi.indexname;


-- =============================================================================
-- SECTION 5 — PUBLIC TABLES — Stripe / fulfillment / purchase related (presence)
-- =============================================================================
SELECT t.table_schema::text, t.table_name::text
FROM information_schema.tables AS t
WHERE t.table_schema = 'public'
  AND (
    t.table_name ILIKE '%stripe%'
    OR t.table_name IN (
      'purchases',
      'subscriptions',
      'entitlement_rights',
      'entitlements'
    )
  )
ORDER BY t.table_name;


-- =============================================================================
-- SECTION 6 — LEDGER — Stripe / checkout / payload column name matches (presence only)
-- =============================================================================
SELECT
  c.column_name::text AS column_name,
  c.data_type::text AS data_type
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'reply_wallet_ledgers'
  AND (
    c.column_name ILIKE '%stripe%'
    OR c.column_name ILIKE '%checkout%'
    OR c.column_name ILIKE '%payment_intent%'
    OR c.column_name ILIKE '%payload%'
    OR c.column_name = 'metadata_json'
  )
ORDER BY c.column_name;


-- =============================================================================
-- SECTION 7 — STRIPE_EVENTS-like columns IF table exists (0 rows when absent)
-- =============================================================================
SELECT c.column_name::text AS column_name, c.data_type::text AS data_type
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'stripe_events'
ORDER BY c.ordinal_position;


-- =============================================================================
-- SECTION 8 — CHECK constraint text substring scan (Fulfillment wording vs schema)
--      Does NOT mutate schema; informational only for compare with SSOT enums.
-- =============================================================================
WITH chk AS (
  SELECT pg_get_constraintdef(c.oid)::text AS chkdef
  FROM pg_constraint AS c
  JOIN pg_namespace AS ns ON ns.oid = c.connamespace AND ns.nspname = 'public'
  JOIN pg_class AS t ON c.conrelid = t.oid
  WHERE c.contype = 'c'::"char"
    AND t.relname = 'reply_wallet_ledgers'
)
SELECT
  (EXISTS (
    SELECT 1 FROM chk
    WHERE lower(chkdef) LIKE '%purchase_additional_reply_ticket%' OR lower(chkdef) LIKE '%stripe_checkout%'
  ))::boolean AS chk_text_mentions_additional_or_stripe_explicit,
  (EXISTS (
    SELECT 1 FROM chk
    WHERE lower(chkdef) LIKE '%purchase_grant%'
  ))::boolean AS chk_text_mentions_purchase_grant,
  (SELECT string_agg(chkdef, E'\n---\n')
   FROM chk) AS concatenated_check_definitions;


-- =============================================================================
-- SECTION 9 — DIAGNOSTIC SUMMARY FLAGS (counts / booleans; no application rows)
--    Heuristic numbers — interpret with PACKET §5.6. Blocking = missing critical tables/columns.
-- =============================================================================
WITH
stripe_events_presence AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'stripe_events'
  ) AS ev
),
stripe_ref_cols AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = 'public' AND c.table_name = 'reply_wallet_ledgers'
      AND (
        c.column_name ILIKE '%stripe_checkout%'
        OR c.column_name ILIKE '%stripe_event%'
        OR c.column_name ILIKE '%payment_intent%'
        OR c.column_name ILIKE '%stripe%checkout%'
      )
  ) AS ev
),
ledger_payload_like AS (
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = 'public' AND c.table_name = 'reply_wallet_ledgers'
      AND (
        c.column_name ILIKE '%payload%'
        OR c.column_name = 'metadata_json'
      )
  ) AS ev
),
wallet_need_cols_present AS (
  SELECT count(DISTINCT c.column_name)::int AS ct
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'reply_ticket_wallets'
    AND c.column_name IN (
      'initial_included_count','purchased_count','consumed_count','available_count','status'
    )
),
ledger_need_cols AS (
  SELECT count(DISTINCT c.column_name)::int AS ct
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'reply_wallet_ledgers'
    AND c.column_name IN (
      'wallet_id','delta','balance_after','event_type','source_of_grant','report_instance_id','user_id'
    )
),
migration_gap_sum AS (
  SELECT (
      (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public'
        AND table_name='reply_ticket_wallets')
        THEN 1 ELSE 0 END)
    + (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public'
        AND table_name='reply_wallet_ledgers')
        THEN 1 ELSE 0 END)
    + (CASE WHEN COALESCE((SELECT ct FROM wallet_need_cols_present), 0) < 5
        THEN 1 ELSE 0 END)
    + (CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema='public'
          AND table_name='reply_ticket_wallets' AND column_name='report_instance_id')
        THEN 1 ELSE 0 END)
    + (CASE WHEN NOT EXISTS (SELECT ev FROM stripe_events_presence WHERE ev)
        THEN 1 ELSE 0 END)
    + (CASE WHEN NOT EXISTS (SELECT ev FROM stripe_ref_cols WHERE ev)
        THEN 1 ELSE 0 END)
  )::smallint AS gap_v
)
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_ticket_wallets'
  ) AS wallet_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.tables AS t
    WHERE t.table_schema = 'public' AND t.table_name = 'reply_wallet_ledgers'
  ) AS ledger_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'reply_ticket_wallets'
      AND column_name = 'report_instance_id'
  ) AS wallet_has_report_instance_id_column,
  EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'reply_ticket_wallets'
      AND column_name = 'user_id'
  ) AS wallet_has_user_id_column,
  (SELECT ct FROM wallet_need_cols_present)::int AS wallet_cap_columns_distinct_hit_count_expect_5,
  (SELECT ct FROM ledger_need_cols)::int AS ledger_audit_required_columns_hit_count_expect_7,
  EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='reply_wallet_ledgers' AND column_name='report_instance_id'
  ) AS ledger_has_report_instance_id_column,
  (
    CASE WHEN (SELECT ct FROM ledger_need_cols) = 7 THEN TRUE ELSE FALSE END
  ) AS ledger_ready_for_audit_insert,
  EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'reply_wallet_ledgers' AND column_name = 'reply_session_id'
  ) AS ledger_has_reply_session_id_column,
  (SELECT ev FROM stripe_ref_cols) AS ledger_has_stripe_reference_like_column_match,
  (SELECT ev FROM ledger_payload_like) AS ledger_has_payload_like_column_match,
  (SELECT ev FROM stripe_events_presence) AS idempotency_stripe_events_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name ILIKE '%processed%stripe%'
  ) AS stripe_processed_events_like_table_exists,
  COALESCE((SELECT COUNT(*)::bigint FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name ILIKE '%processed%stripe%'), 0::bigint)
    AS stripe_processed_named_table_candidates,
  EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema='public' AND t.table_name = 'purchases'
  ) AS purchases_table_exists,
  (
    COALESCE((SELECT ev FROM stripe_events_presence), false)
    OR EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name ILIKE '%processed%stripe%'
    )
    OR COALESCE((SELECT ev FROM stripe_ref_cols), false)
  ) AS stripe_reference_storage_exists,
  (
    COALESCE((SELECT ev FROM stripe_events_presence), false)
    OR EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name ILIKE '%processed%stripe%'
    )
  ) AS idempotency_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.tables tt
    WHERE tt.table_schema='public' AND tt.table_type='BASE TABLE'
      AND tt.table_name ILIKE '%entitlement%'
  ) AS entitlement_like_tabular_relation_exists,
  EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='reply_ticket_wallets'
      AND column_name IN (
        'initial_included_count','purchased_count','consumed_count','available_count','status','report_instance_id'
      )
  ) AS wallet_bundle_columns_any_present_wide,
  (
    CASE
      WHEN (SELECT ct FROM wallet_need_cols_present) >= 5
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
          AND table_name='reply_ticket_wallets' AND column_name='report_instance_id')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public'
          AND table_name='reply_ticket_wallets')
      THEN TRUE
      ELSE FALSE
    END
  ) AS wallet_ready_for_count_update,
  EXISTS (SELECT ev FROM stripe_events_presence WHERE ev)
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name='reply_wallet_ledgers'
        AND (
          c.column_name ILIKE '%stripe%'
          OR c.column_name ILIKE '%checkout%'
          OR c.column_name ILIKE '%payload%'
        )
    )
    AS heuristic_stripe_events_plus_ledger_ref_columns,
  EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
    JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
    WHERE pc.contype = 'c'::"char"
      AND pg_get_constraintdef(pc.oid) ILIKE '%purchase_additional_reply_ticket%'
  ) AS check_def_includes_additional_reply_ticket_keyword,
  EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
    JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
    WHERE pc.contype = 'c'::"char"
      AND pg_get_constraintdef(pc.oid) ILIKE '%stripe_checkout%'
  ) AS check_def_includes_stripe_checkout_keyword,
  EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
    JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
    WHERE pc.contype = 'c'::"char"
      AND pg_get_constraintdef(pc.oid) ILIKE '%purchase_grant%'
  ) AS check_def_includes_purchase_grant_keyword,
  (
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM pg_constraint pc
        JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
        JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
        WHERE pc.contype = 'c'::"char"
          AND pg_get_constraintdef(pc.oid) ILIKE '%purchase_additional_reply_ticket%'
      )
        AND EXISTS (
          SELECT 1 FROM pg_constraint pc
          JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
          JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
          WHERE pc.contype = 'c'::"char"
            AND pg_get_constraintdef(pc.oid) ILIKE '%purchase_grant%'
        )
      THEN TRUE
      ELSE FALSE
    END
  ) AS ledger_check_likely_needs_extension_for_new_event_vs_purchase_grant_only,
  (
    EXISTS (
      SELECT 1 FROM pg_constraint pc
      JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
      JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
      WHERE pc.contype = 'c'::"char"
        AND pg_get_constraintdef(pc.oid) ILIKE '%purchase_additional_reply_ticket%'
    )
    AND EXISTS (
      SELECT 1 FROM pg_constraint pc
      JOIN pg_namespace ns ON ns.oid = pc.connamespace AND ns.nspname = 'public'
      JOIN pg_class cl ON pc.conrelid = cl.oid AND cl.relname = 'reply_wallet_ledgers'
      WHERE pc.contype = 'c'::"char"
        AND pg_get_constraintdef(pc.oid) ILIKE '%stripe_checkout%'
    )
  ) AS ledger_check_allows_new_event_type,
  COALESCE((SELECT gap_v FROM migration_gap_sum), 0::smallint) AS migration_candidate_dimension_sum_heuristic,
  COALESCE((SELECT gap_v FROM migration_gap_sum), 0::smallint) AS migration_needed_count,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema='public' AND t.table_name='reply_ticket_wallets'
    ) OR NOT EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema='public' AND t.table_name='reply_wallet_ledgers'
    )
    THEN 1::smallint ELSE 0::smallint END AS blocking_gap_count;


-- =============================================================================
-- SECTION 10 — Optional: purchases columns if table exists (otherwise 0 rows)
-- =============================================================================
SELECT c.column_name::text AS column_name, c.data_type::text AS data_type
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'purchases'
ORDER BY c.ordinal_position;


-- END OF FILE

