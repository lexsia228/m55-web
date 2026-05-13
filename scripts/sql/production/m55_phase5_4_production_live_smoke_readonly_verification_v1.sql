-- =============================================================================
-- READ-ONLY — Phase 5-4 Production live smoke verification (post-approval)
-- Path: scripts/sql/production/m55_phase5_4_production_live_smoke_readonly_verification_v1.sql
--
-- Run ONLY after separate live-smoke approval, against Production (or approved target).
-- Replace <CLERK_USER_ID> with the Clerk user id used for the live smoke (do not commit real ids).
--
-- SELECT only — no DML/DDL/GRANT/REVOKE/NOTIFY.
-- No secrets. No embedded raw IDs beyond the placeholder you substitute locally.
--
-- Verifies: entitlement right row, snapshot, wallet, ledger (latest purchase_grant),
--   consult thread, messages (roles + content length only).
-- =============================================================================

-- (0) entitlement_rights — core origin right (expect 1 row if entitled)
SELECT COUNT(*)::bigint AS entitlement_rights_core_origin_row_count
FROM public.entitlement_rights AS er
WHERE er.user_id = '<CLERK_USER_ID>'
  AND er.right_key = 'm55_p:core_origin';

-- (1) Latest DTR_CORE_STATIC_V1 snapshot for user (count + product_id only)
SELECT COUNT(*)::bigint AS dtr_core_snapshot_count
FROM public.dtr_report_snapshots AS s
WHERE s.user_id = '<CLERK_USER_ID>'
  AND s.product_id = 'DTR_CORE_STATIC_V1';

-- (2) Wallet — scoped to latest snapshot join
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

-- (3) Consult thread — core_origin
SELECT
  t.credits_remaining,
  t.state
FROM public.consult_threads AS t
WHERE t.user_id = '<CLERK_USER_ID>'
  AND t.report_key = 'm55_p:core_origin'
LIMIT 1;

-- (4) Messages — role and content length only
SELECT
  m.role,
  char_length(COALESCE(m.content, '')) AS content_len,
  m.created_at
FROM public.consult_messages AS m
JOIN public.consult_threads AS t ON t.id = m.thread_id
WHERE t.user_id = '<CLERK_USER_ID>'
  AND t.report_key = 'm55_p:core_origin'
ORDER BY m.created_at ASC;

-- (5) Latest purchase_grant ledger for scoped wallet (booleans for Stripe refs)
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

-- (6) one_time_fulfillments rows for user (count only — no session id printed)
SELECT COUNT(*)::bigint AS one_time_fulfillments_row_count_for_user
FROM public.one_time_fulfillments AS o
WHERE o.user_id = '<CLERK_USER_ID>';

-- END OF FILE
