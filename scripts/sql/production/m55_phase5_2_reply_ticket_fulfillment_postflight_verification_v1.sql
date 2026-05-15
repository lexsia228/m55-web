-- =============================================================================
-- READ-ONLY — Phase 5-2 reply ticket fulfillment postflight verification
-- Path: scripts/sql/production/m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql
--
-- Run ONLY after explicit approval AND after migration candidate has been applied
--   to the target database (typically Production in a controlled window).
--
-- SELECT only — no DDL/DML/GRANT/REVOKE/NOTIFY.
-- No secrets. No embedded raw IDs.
--
-- Expected after successful apply of:
--   m55_phase5_2_reply_ticket_fulfillment_production_migration_candidate_v1.sql
--
--   has_stripe_processed_events = true
--   Ledger columns: all true
--   rpc_count >= 1
--   service_role EXECUTE: at least one row
--   unique_index_on_stripe_event_id: at least one matching index (partial unique OK)
--   reply_wallet_ledgers stripe_event_id lookup index (SECTION H): optional
--     operational hardening — NOT a substitute for stripe_processed_events uniqueness
--   reply_ticket_wallets.report_instance_id: true (prerequisite for RPC wallet SELECT)
-- =============================================================================

-- SECTION A — Required tables
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stripe_processed_events'
  ) AS has_stripe_processed_events,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
  ) AS has_reply_wallet_ledgers,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reply_ticket_wallets'
  ) AS has_reply_ticket_wallets;

-- SECTION B — reply_wallet_ledgers required columns
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
      AND column_name = 'report_instance_id'
  ) AS col_report_instance_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
      AND column_name = 'stripe_event_id'
  ) AS col_stripe_event_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
      AND column_name = 'stripe_checkout_session_id'
  ) AS col_stripe_checkout_session_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
      AND column_name = 'stripe_payment_intent_id'
  ) AS col_stripe_payment_intent_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
      AND column_name = 'product_key'
  ) AS col_product_key;

-- SECTION C — reply_ticket_wallets.report_instance_id (RPC prerequisite)
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reply_ticket_wallets'
      AND column_name = 'report_instance_id'
  ) AS wallet_col_report_instance_id;

-- SECTION D — RPC existence
SELECT COUNT(*)::bigint AS rpc_m55_reply_ticket_fulfill_checkout_event_count
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'm55_reply_ticket_fulfill_checkout_event';

-- SECTION E — service_role EXECUTE
SELECT
  rp.grantee,
  rp.privilege_type,
  rp.routine_schema,
  rp.routine_name
FROM information_schema.routine_privileges AS rp
WHERE rp.routine_schema = 'public'
  AND rp.routine_name = 'm55_reply_ticket_fulfill_checkout_event'
  AND rp.grantee = 'service_role'
  AND rp.privilege_type = 'EXECUTE';

-- SECTION F — Idempotency: unique or partial-unique index on stripe_processed_events(stripe_event_id)
SELECT
  i.schemaname,
  i.tablename,
  i.indexname,
  i.indexdef
FROM pg_indexes AS i
WHERE i.schemaname = 'public'
  AND i.tablename = 'stripe_processed_events'
  AND i.indexdef ILIKE '%UNIQUE%'
  AND i.indexdef ILIKE '%stripe_event_id%';

-- SECTION G — PostgREST: routine visibility (heuristic — not a substitute for live RPC smoke)
SELECT
  r.specific_schema,
  r.routine_name,
  r.external_language
FROM information_schema.routines AS r
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'm55_reply_ticket_fulfill_checkout_event';

-- SECTION H — reply_wallet_ledgers: lookup index on stripe_event_id (Phase 5-6E NON-BLOCKING)
-- Expected after migration candidate STEP B2: at least one index referencing stripe_event_id.
-- Primary duplicate protection remains stripe_processed_events (SECTION F), not this index.
SELECT
  i.schemaname,
  i.tablename,
  i.indexname,
  i.indexdef
FROM pg_indexes AS i
WHERE i.schemaname = 'public'
  AND i.tablename = 'reply_wallet_ledgers'
  AND i.indexdef ILIKE '%stripe_event_id%';

-- END OF FILE
