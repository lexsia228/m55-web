-- BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL — Post-apply read-only verification (counts only)
-- Target: m55-soul-core PRODUCTION
-- Run after B3-WALLET-BACKFILL-D-EXEC UPDATE (same maintenance window)
-- Post-apply attestation SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_POSTFLIGHT_R_2026-05-23.md
-- Forbidden: DML · SELECT * · raw IDs

-- Expected after successful single-row apply (B2-R baseline):
--   strict_backfill_eligible_count = 0
--   wallets_null_report_instance_id_total = 4 (was 5)
--   wallets_with_report_instance_id_total = 6 (was 5)
--   wallets_cap_violation_rows = 0

-- ═══ 1. Scope inventory delta ═══
SELECT COUNT(*)::bigint AS wallets_null_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL;

SELECT COUNT(*)::bigint AS wallets_with_report_instance_id_total
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL;

-- ═══ 2. Strict eligible must be zero ═══
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
),
eligible AS (
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
)
SELECT COUNT(*)::bigint AS strict_backfill_eligible_count FROM eligible;

-- ═══ 3. Safety re-checks ═══
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

-- ═══ 4. Ledger note (wallet-only apply — no required ledger delta) ═══
SELECT COUNT(*)::bigint AS ledger_null_scope_wallet_report_instance_id_null
FROM public.reply_wallet_ledgers AS l
JOIN public.reply_ticket_wallets AS w ON w.id = l.wallet_id
WHERE w.report_instance_id IS NULL
  AND l.report_instance_id IS NULL;

-- STOP if strict_backfill_eligible_count > 0 after apply (partial failure)
-- STOP if wallets_cap_violation_rows > 0
-- STOP if users_with_both_null_and_scoped_wallet > 0
