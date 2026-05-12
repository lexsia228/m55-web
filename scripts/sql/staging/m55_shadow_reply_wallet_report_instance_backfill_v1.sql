-- =============================================================================
-- SHADOW / TEST ONLY — reply_ticket_wallets.report_instance_id backfill
-- Path: scripts/sql/staging/m55_shadow_reply_wallet_report_instance_backfill_v1.sql
--
-- FORBIDDEN: Production, staging that mirrors production data contract without approval.
--
-- Purpose: Set reply_ticket_wallets.report_instance_id from the latest
--   dtr_report_snapshots row for DTR_CORE_STATIC_V1 for a single Clerk user.
--
-- Before run:
--   1) Confirm Supabase project is Shadow/Test (not Production).
--   2) Replace every <CLERK_USER_ID> placeholder with the real Clerk user id
--      (do not commit real ids into git).
-- =============================================================================

UPDATE public.reply_ticket_wallets AS w
SET report_instance_id = s.id
FROM (
  SELECT id
  FROM public.dtr_report_snapshots
  WHERE user_id = '<CLERK_USER_ID>'
    AND product_id = 'DTR_CORE_STATIC_V1'
  ORDER BY created_at DESC
  LIMIT 1
) AS s
WHERE w.user_id = '<CLERK_USER_ID>';

NOTIFY pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Verification: wallet row links to snapshot; show counts and status (no PII)
-- -----------------------------------------------------------------------------
SELECT
  w.report_instance_id,
  s.id AS snapshot_id,
  (w.report_instance_id IS NOT NULL AND w.report_instance_id = s.id) AS report_instance_id_matches_snapshot_id,
  w.available_count,
  w.status
FROM public.reply_ticket_wallets AS w
INNER JOIN public.dtr_report_snapshots AS s
  ON s.id = w.report_instance_id
WHERE w.user_id = '<CLERK_USER_ID>'
  AND s.product_id = 'DTR_CORE_STATIC_V1';
