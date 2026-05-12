-- =============================================================================
-- READ-ONLY — Phase 5 Production promotion readiness preflight
-- Path: scripts/sql/production/m55_phase5_production_promotion_readiness_preflight_v1.sql
--
-- PURPOSE: After explicit team approval, run against the TARGET Production project
--   in SQL Editor (or supervised session) to verify schema parity with app code.
--
-- DO NOT RUN until Production access + approval — NOT part of Preview/Shadow work.
--
-- SELECT only — no DDL/DML. No secrets. No embedded IDs.
--
-- Expected when Phase 4 RPC lane is fully deployed:
--   All listed public tables exist (boolean true).
--   reply_wallet_ledgers has columns: report_instance_id, stripe_event_id,
--     stripe_checkout_session_id, stripe_payment_intent_id, product_key (each true).
--   RPC m55_reply_ticket_fulfill_checkout_event exists (count >= 1).
--   service_role has EXECUTE on that routine (at least one privilege row).
-- Idempotency helpers: stripe_processed_events should ideally have a uniqueness
--   constraint or partial unique index on stripe_event_id (gate-dependent); flags
--   below are heuristic — review with DBA if indeterminate.
-- =============================================================================

-- SECTION A — Required public tables (existence)
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stripe_events'
  ) AS has_stripe_events,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'one_time_fulfillments'
  ) AS has_one_time_fulfillments,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'failed_fulfillments'
  ) AS has_failed_fulfillments,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'entitlements'
  ) AS has_entitlements,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'entitlement_rights'
  ) AS has_entitlement_rights,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dtr_guest_drafts'
  ) AS has_dtr_guest_drafts,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dtr_report_snapshots'
  ) AS has_dtr_report_snapshots,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'consult_threads'
  ) AS has_consult_threads,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'consult_messages'
  ) AS has_consult_messages,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reply_ticket_wallets'
  ) AS has_reply_ticket_wallets,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reply_wallet_ledgers'
  ) AS has_reply_wallet_ledgers,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stripe_processed_events'
  ) AS has_stripe_processed_events;

-- SECTION B — reply_wallet_ledgers columns required by additional-reply RPC lane
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

-- SECTION C — RPC existence (public schema)
SELECT COUNT(*)::bigint AS rpc_m55_reply_ticket_fulfill_checkout_event_count
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'm55_reply_ticket_fulfill_checkout_event';

-- SECTION D — service_role EXECUTE on RPC (information_schema)
SELECT
  rp.grantee,
  rp.privilege_type,
  rp.specific_schema,
  rp.routine_name
FROM information_schema.routine_privileges AS rp
WHERE rp.routine_schema = 'public'
  AND rp.routine_name = 'm55_reply_ticket_fulfill_checkout_event'
  AND rp.grantee = 'service_role'
  AND rp.privilege_type = 'EXECUTE';

-- SECTION E — Idempotency: stripe_processed_events indexes touching stripe_event_id
-- Expected after optional gate: at least one index where stripe_event_id is indexed
-- (unique/partial unique may be required by ops policy — not strictly provable here).
SELECT
  i.schemaname,
  i.tablename,
  i.indexname,
  i.indexdef
FROM pg_indexes AS i
WHERE i.schemaname = 'public'
  AND i.tablename = 'stripe_processed_events'
  AND i.indexdef ILIKE '%stripe_event_id%';

-- SECTION F — Idempotency: reply_wallet_ledgers indexes on stripe_event_id (replay lookup)
SELECT
  i.schemaname,
  i.tablename,
  i.indexname,
  i.indexdef
FROM pg_indexes AS i
WHERE i.schemaname = 'public'
  AND i.tablename = 'reply_wallet_ledgers'
  AND i.indexdef ILIKE '%stripe_event_id%';
