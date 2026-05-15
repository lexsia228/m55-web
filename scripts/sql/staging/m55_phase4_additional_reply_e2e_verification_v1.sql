-- =============================================================================
-- READ-ONLY — Phase 4 additional reply ¥500 E2E verification
-- Path: scripts/sql/staging/m55_phase4_additional_reply_e2e_verification_v1.sql
--
-- SHADOW / TEST ONLY. Do not run against Production.
-- Replace <CLERK_USER_ID> with the Clerk user id string before execution.
-- Do not commit real user ids into git.
--
-- Snapshot target: latest DTR_CORE_STATIC_V1 row joined to scoped wallet.
--
-- SELECT only — no INSERT / UPDATE / DELETE / NOTIFY.
--
-- Expected AFTER Phase 4 GREEN (checkout + webhook recovery + purchased reply send):
--   w.initial_included_count = 1
--   w.purchased_count = 1
--   w.consumed_count = 2
--   w.available_count = 0
--   w.status = 'active'
--   t.credits_remaining = 0
--   t.state = 'read_only'
--   consult_messages: 4 rows (two user/assistant pairs), ordered by time
--   Latest purchase_grant ledger: delta = 1, balance_after = 1,
--     product_key = 'additional_reply_ticket', Stripe ref columns populated (booleans)
-- RPC: function exists; service_role has EXECUTE (see section 5–6)
-- =============================================================================

-- (1) Wallet — DTR_CORE_STATIC_V1 scoped row
SELECT
  w.initial_included_count,
  w.purchased_count,
  w.consumed_count,
  w.available_count,
  w.status,
  w.report_instance_id IS NOT NULL AS has_report_instance
FROM public.reply_ticket_wallets AS w
INNER JOIN public.dtr_report_snapshots AS s
  ON s.id = w.report_instance_id
WHERE w.user_id = '<CLERK_USER_ID>'
  AND s.product_id = 'DTR_CORE_STATIC_V1'
ORDER BY s.created_at DESC
LIMIT 1;

-- (2) Consult thread — core_origin lane
SELECT
  t.credits_remaining,
  t.state
FROM public.consult_threads AS t
WHERE t.user_id = '<CLERK_USER_ID>'
  AND t.report_key = 'm55_p:core_origin'
LIMIT 1;

-- (3) Messages — role and content length (expect 4 rows after two sends)
SELECT
  m.role,
  char_length(COALESCE(m.content, '')) AS content_len,
  m.created_at
FROM public.consult_messages AS m
JOIN public.consult_threads AS t ON t.id = m.thread_id
WHERE t.user_id = '<CLERK_USER_ID>'
  AND t.report_key = 'm55_p:core_origin'
ORDER BY m.created_at ASC;

-- (4) Latest purchase_grant ledger row for scoped wallet (Stripe refs as booleans)
SELECT
  l.event_type,
  l.source_of_grant,
  l.delta,
  l.balance_after,
  l.product_key,
  l.stripe_event_id IS NOT NULL AS has_stripe_event_id,
  l.stripe_checkout_session_id IS NOT NULL AS has_stripe_checkout_session_id,
  l.stripe_payment_intent_id IS NOT NULL AS has_stripe_payment_intent_id,
  l.created_at
FROM public.reply_wallet_ledgers AS l
JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
JOIN public.dtr_report_snapshots AS s ON s.id = w.report_instance_id
WHERE w.user_id = '<CLERK_USER_ID>'
  AND s.product_id = 'DTR_CORE_STATIC_V1'
  AND l.event_type = 'purchase_grant'
ORDER BY l.created_at DESC
LIMIT 1;

-- (5) RPC existence (public schema)
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'm55_reply_ticket_fulfill_checkout_event';

-- (6) service_role EXECUTE on RPC (expect at least one row with privilege EXECUTE)
SELECT
  rp.grantee,
  rp.privilege_type,
  rp.specific_schema,
  rp.routine_name
FROM information_schema.routine_privileges AS rp
WHERE rp.routine_schema = 'public'
  AND rp.routine_name = 'm55_reply_ticket_fulfill_checkout_event'
  AND rp.grantee = 'service_role';
