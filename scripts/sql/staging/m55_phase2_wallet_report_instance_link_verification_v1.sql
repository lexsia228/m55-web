-- =============================================================================
-- READ-ONLY — Phase 2 wallet ↔ snapshot link verification
-- Path: scripts/sql/staging/m55_phase2_wallet_report_instance_link_verification_v1.sql
--
-- SHADOW / TEST ONLY. Do not run against Production.
-- Replace <CLERK_USER_ID> with the Clerk user id string before execution.
-- Do not commit real user ids into git.
--
-- SELECT only — no INSERT / UPDATE / DELETE / NOTIFY.
--
-- Expected for DTR core + included ticket path (after c5b46f0 fulfill link):
--   s.product_id = 'DTR_CORE_STATIC_V1'
--   w.report_instance_id = s.id (join condition)
--   w.initial_included_count = 1
--   w.purchased_count = 0
--   w.consumed_count = 0
--   w.available_count = 1
--   w.status = 'active'
-- =============================================================================

SELECT
  s.id AS snapshot_id,
  w.report_instance_id,
  s.product_id,
  w.initial_included_count,
  w.purchased_count,
  w.consumed_count,
  w.available_count,
  w.status,
  (w.report_instance_id IS NOT NULL AND w.report_instance_id = s.id) AS ids_match
FROM public.dtr_report_snapshots AS s
INNER JOIN public.reply_ticket_wallets AS w
  ON w.report_instance_id = s.id
WHERE s.user_id = '<CLERK_USER_ID>'
  AND s.product_id = 'DTR_CORE_STATIC_V1'
ORDER BY s.created_at DESC
LIMIT 1;
