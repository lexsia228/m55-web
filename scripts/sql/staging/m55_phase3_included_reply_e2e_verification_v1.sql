-- =============================================================================
-- READ-ONLY — Phase 3 included reply 1-ticket E2E verification
-- Path: scripts/sql/staging/m55_phase3_included_reply_e2e_verification_v1.sql
--
-- SHADOW / TEST ONLY. Do not run against Production.
-- Replace <CLERK_USER_ID> with the Clerk user id string before execution.
-- Do not commit real user ids into git.
--
-- Snapshot target: latest DTR_CORE_STATIC_V1 row for the user (optional filter).
--
-- SELECT only — no INSERT / UPDATE / DELETE / NOTIFY.
--
-- Expected AFTER successful included reply send (POST /api/room/core/send):
--   w.available_count = 0
--   w.consumed_count = 1
--   w.status = 'active' (unless product-specific exhaustion semantics differ)
--   t.credits_remaining = 0
--   t.state = 'read_only'
--   consult_messages for thread t: 2 rows (roles 'user' and 'assistant')
--
-- Expected BEFORE send (baseline): available_count = 1, consumed_count = 0,
-- credits_remaining consistent with wallet, state may still allow send.
-- =============================================================================

-- (1) Wallet — included reply lane tied to DTR_CORE_STATIC_V1 snapshot
SELECT
  w.available_count,
  w.consumed_count,
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
  t.state,
  t.id AS thread_id
FROM public.consult_threads AS t
WHERE t.user_id = '<CLERK_USER_ID>'
  AND t.report_key = 'm55_p:core_origin'
LIMIT 1;

-- (3) Messages — role and content length (ordering by time)
SELECT
  m.role,
  char_length(COALESCE(m.content, '')) AS content_len,
  m.created_at
FROM public.consult_messages AS m
JOIN public.consult_threads AS t ON t.id = m.thread_id
WHERE t.user_id = '<CLERK_USER_ID>'
  AND t.report_key = 'm55_p:core_origin'
ORDER BY m.created_at ASC;
