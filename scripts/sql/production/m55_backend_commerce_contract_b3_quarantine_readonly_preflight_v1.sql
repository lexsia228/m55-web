-- BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE — Read-only preflight (counts only)
-- Target: m55-soul-core PRODUCTION
-- Gate: B3-QUARANTINE-PLANNING / future B3-QUARANTINE-D-EXEC preflight
-- Forbidden: DML · SELECT * · raw IDs in tickets
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_EXEC_PLANNING_2026-05-23.md
-- Planning: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_PLANNING_2026-05-23.md
-- Anchor: POSTFLIGHT-R null=4 · smoke=3 · no_visible=1

-- DTR_CORE_PRODUCT_KEY = 'DTR_CORE_STATIC_V1'

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. Inventory anchor (POSTFLIGHT-R reconciliation) ═══
SELECT COUNT(*)::bigint AS wallets_null_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS wallets_with_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL;

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

-- ═══ 2. Remaining cohort classification (null-scope only) ═══
WITH null_w AS (
  SELECT
    w.status,
    w.available_count,
    w.consumed_count,
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
),
classified AS (
  SELECT
    nw.*,
    CASE
      WHEN nw.is_smoke_pattern THEN 'smoke_quarantine'
      WHEN nw.visible_dtr_core_snapshot_count = 0 THEN 'no_visible_snapshot_quarantine'
      WHEN nw.visible_dtr_core_snapshot_count = 1 THEN 'unexpected_backfill_shape'
      ELSE 'unclassified_manual'
    END AS quarantine_class
  FROM null_w AS nw
)
SELECT
  COUNT(*)::bigint AS remaining_null_scope_total,
  COUNT(*) FILTER (WHERE quarantine_class = 'smoke_quarantine')::bigint AS cohort_smoke_quarantine,
  COUNT(*) FILTER (WHERE quarantine_class = 'no_visible_snapshot_quarantine')::bigint AS cohort_no_visible_snapshot_quarantine,
  COUNT(*) FILTER (WHERE quarantine_class = 'unexpected_backfill_shape')::bigint AS cohort_unexpected_backfill_shape,
  COUNT(*) FILTER (WHERE quarantine_class = 'unclassified_manual')::bigint AS cohort_unclassified_manual
FROM classified;

-- ═══ 3. Status / spend shape (null-scope) ═══
SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_null_status_closed
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'closed';

SELECT COUNT(*)::bigint AS wallets_null_status_suspended
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'suspended';

SELECT COUNT(*)::bigint AS wallets_null_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_active_available_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active' AND available_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_consumed_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND consumed_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_purchased_gt_0
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND purchased_count > 0;

SELECT COUNT(*)::bigint AS wallets_null_included_only_purchased_zero
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL
  AND purchased_count = 0
  AND initial_included_count > 0;

-- ═══ 4. Quarantine apply candidate (active · classifiable · safe) ═══
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
SELECT COUNT(*)::bigint AS quarantine_apply_candidate_count
FROM null_w AS nw
WHERE nw.status = 'active'
  AND nw.purchased_count = 0
  AND (
    nw.is_smoke_pattern
    OR nw.visible_dtr_core_snapshot_count = 0
  )
  AND NOT (
    NOT nw.is_smoke_pattern
    AND nw.visible_dtr_core_snapshot_count = 1
    AND nw.initial_included_count > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.reply_ticket_wallets AS s
      WHERE s.user_id = nw.user_id
        AND s.report_instance_id IS NOT NULL
        AND s.status = 'active'
    )
  );

-- ═══ 5. Safety guards ═══
SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

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

-- STOP if wallets_null_report_instance_id_total <> 4 (POSTFLIGHT-R drift)
-- STOP if strict_backfill_eligible_count > 0
-- STOP if cohort_smoke + cohort_no_visible <> remaining_null_scope_total
-- STOP if wallets_null_purchased_gt_0 > 0
-- STOP if wallets_cap_violation_rows > 0
-- GO to EXEC planning if classification stable
