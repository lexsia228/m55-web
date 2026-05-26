-- BACKEND-COMMERCE-CONTRACT-B — Production read-only preflight (counts/metadata only)
-- Target safe label: m55-soul-core PRODUCTION
-- Gate: BACKEND-COMMERCE-CONTRACT-B (read-only · no mutation)
-- Forbidden: INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/GRANT/NOTIFY · SELECT * · row samples with raw IDs
-- Run: section-by-section in Supabase SQL Editor · confirm current_database() first
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B_READONLY_PREFLIGHT_2026-05-23.md

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. Core commerce RPC existence + signature ═══
SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event'
) AS rpc_fulfill_checkout_exists;

SELECT
  p.proname::text AS function_name,
  pg_get_function_identity_arguments(p.oid)::text AS identity_arguments,
  pg_get_function_result(p.oid)::text AS result_type,
  p.prosecdef AS is_security_definer
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_reply_ticket_fulfill_checkout_event';

SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
  WHERE p.proname = 'm55_reply_generate_commit'
) AS rpc_reply_generate_commit_exists;

SELECT
  p.proname::text AS function_name,
  pg_get_function_identity_arguments(p.oid)::text AS identity_arguments,
  pg_get_function_result(p.oid)::text AS result_type
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
WHERE p.proname = 'm55_reply_generate_commit';

-- ═══ 2. Required tables (DTR + reply commerce) ═══
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stripe_events') AS has_stripe_events,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stripe_processed_events') AS has_stripe_processed_events,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='one_time_fulfillments') AS has_one_time_fulfillments,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entitlements') AS has_entitlements,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entitlement_rights') AS has_entitlement_rights,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dtr_report_snapshots') AS has_dtr_report_snapshots,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reply_ticket_wallets') AS has_reply_ticket_wallets,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reply_wallet_ledgers') AS has_reply_wallet_ledgers,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consult_threads') AS has_consult_threads,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='failed_fulfillments') AS has_failed_fulfillments;

-- ═══ 3. Wallet / ledger scope columns (report_instance_id) ═══
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reply_ticket_wallets' AND column_name='report_instance_id') AS wallet_has_report_instance_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reply_wallet_ledgers' AND column_name='report_instance_id') AS ledger_has_report_instance_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reply_wallet_ledgers' AND column_name='stripe_event_id') AS ledger_has_stripe_event_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reply_wallet_ledgers' AND column_name='product_key') AS ledger_has_product_key;

-- ═══ 4. Idempotency indexes / constraints (boolean + name only) ═══
SELECT COUNT(*)::bigint AS stripe_processed_events_stripe_event_id_unique_index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'stripe_processed_events'
  AND indexdef ILIKE '%UNIQUE%'
  AND indexdef ILIKE '%stripe_event_id%';

SELECT COUNT(*)::bigint AS dtr_visible_partial_unique_index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'dtr_report_snapshots'
  AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

SELECT COUNT(*)::bigint AS reply_sessions_idempotency_unique_count
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relname = 'reply_sessions'
  AND c.contype = 'u';

-- ═══ 5. Ledger event_type CHECK alignment (catalog only) ═══
SELECT cc.check_clause::text AS reply_wallet_ledgers_event_type_check
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'reply_wallet_ledgers'
  AND tc.constraint_type = 'CHECK'
  AND cc.check_clause ILIKE '%event_type%'
LIMIT 1;

-- ═══ 6. Aggregate inventory (no row IDs) ═══
SELECT COUNT(*)::bigint AS stripe_events_total FROM public.stripe_events;
SELECT COUNT(*)::bigint AS stripe_processed_events_total FROM public.stripe_processed_events;
SELECT COUNT(*)::bigint AS one_time_fulfillments_total FROM public.one_time_fulfillments;
SELECT COUNT(*)::bigint AS reply_ticket_wallets_total FROM public.reply_ticket_wallets;
SELECT COUNT(*)::bigint AS reply_wallet_ledgers_total FROM public.reply_wallet_ledgers;

SELECT COUNT(*)::bigint AS wallets_with_null_report_instance_id
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

SELECT COUNT(*)::bigint AS ledger_reply_consume_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'reply_consume';

SELECT COUNT(*)::bigint AS ledger_purchase_grant_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'purchase_grant';

SELECT COUNT(*)::bigint AS ledger_included_grant_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'included_grant';

-- ═══ 7. consult_threads vs wallet cap drift (aggregate) ═══
SELECT COUNT(*)::bigint AS consult_threads_credits_total_gt_3
FROM public.consult_threads
WHERE credits_total > 3;

-- STOP if: rpc_fulfill_checkout_exists=false OR wallet_has_report_instance_id=false
-- STOP if: wallets_cap_violation_rows > 0
-- Compare §6 counts to R8-R baseline separately (release-readiness monitor)
