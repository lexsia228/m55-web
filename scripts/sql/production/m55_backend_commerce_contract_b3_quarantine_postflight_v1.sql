-- BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE — Post-apply read-only verification (counts only)
-- Target: m55-soul-core PRODUCTION
-- Run after B3-QUARANTINE-D-EXEC (same maintenance window)
-- Post-apply attestation SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_PLANNING_2026-05-23.md
-- EXEC-PLANNING: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_EXEC_PLANNING_2026-05-23.md
-- Forbidden: DML · SELECT * · raw IDs

-- Expected after successful quarantine apply:
--   wallets_null_status_active = 0
--   wallets_null_active_available_gt_0 = 0
--   quarantine_apply_candidate_count = 0
--   wallets_null_report_instance_id_total = 4 (rows retained, scope still NULL)
--   wallets_cap_violation_rows = 0
--   strict_backfill_eligible_count = 0

-- ═══ 1. S-5 spendability checks ═══
SELECT COUNT(*)::bigint AS wallets_null_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_null_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_status_closed
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'closed';

-- ═══ 2. Remaining apply candidates (expect 0) ═══
WITH null_w AS (
  SELECT
    w.user_id,
    w.status,
    w.purchased_count,
    (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
        AND s.user_hidden_at IS NULL
    ) AS visible_dtr_core_snapshot_count
  FROM public.reply_ticket_wallets AS w
  WHERE w.report_instance_id IS NULL
)
SELECT COUNT(*)::bigint AS quarantine_apply_candidate_count
FROM null_w AS nw
WHERE nw.status = 'active'
  AND nw.purchased_count = 0
  AND (nw.is_smoke_pattern OR nw.visible_dtr_core_snapshot_count = 0);

SELECT COUNT(*)::bigint AS strict_backfill_eligible_count
FROM (
  WITH null_w AS (
    SELECT
      w.user_id,
      w.status,
      w.purchased_count,
      w.initial_included_count,
      (w.user_id LIKE 'smoke\_user\_%' ESCAPE '\' OR w.user_id LIKE 'smoke_user%') AS is_smoke_pattern,
      (
        SELECT COUNT(*)::bigint
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = w.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
          AND s.user_hidden_at IS NULL
      ) AS visible_dtr_core_snapshot_count
    FROM public.reply_ticket_wallets AS w
    WHERE w.report_instance_id IS NULL
  )
  SELECT 1
  FROM null_w AS nw
  WHERE NOT nw.is_smoke_pattern
    AND nw.status = 'active'
    AND nw.purchased_count = 0
    AND nw.initial_included_count > 0
    AND nw.visible_dtr_core_snapshot_count = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s
      WHERE s.user_id = nw.user_id
        AND s.report_instance_id IS NOT NULL
        AND s.status = 'active'
    )
) AS eligible;

-- ═══ 3. Safety re-checks ═══
SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

SELECT COUNT(*)::bigint AS wallets_null_purchased_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND purchased_count > 0;

SELECT COUNT(*)::bigint AS users_with_both_null_and_scoped_wallet
FROM (
  SELECT n.user_id
  FROM public.reply_ticket_wallets AS n
  WHERE n.report_instance_id IS NULL
  INTERSECT
  SELECT s.user_id
  FROM public.reply_ticket_wallets AS s
  WHERE s.report_instance_id IS NOT NULL
) AS dual_users;

-- PASS S-5 spendability axis if:
--   wallets_null_status_active = 0
--   wallets_null_active_available_gt_0 = 0
-- STOP if quarantine_apply_candidate_count > 0 after apply
