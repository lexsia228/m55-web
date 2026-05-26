-- BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL — UPDATE candidate (NOT EXECUTED in planning gate)
-- Target: m55-soul-core PRODUCTION
-- Run ONLY after:
--   1) m55_backend_commerce_contract_b3_wallet_backfill_preflight_v1.sql PASS (strict eligible = 1)
--   2) BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC Human GO: BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL go
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_EXEC_PLANNING_2026-05-23.md
--
-- Mutates: reply_ticket_wallets.report_instance_id ONLY
-- Does NOT mutate: balances, status, ledger, sessions, DELETE
-- Expected rowcount: 1
-- RETURNING: md5(wallet id) only — do not paste raw UUIDs in tickets

-- ============================================================================
-- FORWARD UPDATE — single statement
-- ============================================================================

UPDATE public.reply_ticket_wallets AS w
SET report_instance_id = s.id
FROM public.dtr_report_snapshots AS s
WHERE w.report_instance_id IS NULL
  AND w.status = 'active'
  AND w.purchased_count = 0
  AND w.initial_included_count > 0
  AND NOT (
    w.user_id LIKE 'smoke\_user\_%' ESCAPE '\'
    OR w.user_id LIKE 'smoke_user%'
  )
  AND s.user_id = w.user_id
  AND s.product_id = 'DTR_CORE_STATIC_V1'
  AND s.user_hidden_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.reply_ticket_wallets AS s2
    WHERE s2.user_id = w.user_id
      AND s2.report_instance_id IS NOT NULL
      AND s2.status = 'active'
  )
  AND (
    SELECT COUNT(*)::int
    FROM public.dtr_report_snapshots AS sx
    WHERE sx.user_id = w.user_id
      AND sx.product_id = 'DTR_CORE_STATIC_V1'
      AND sx.user_hidden_at IS NULL
  ) = 1
  AND s.id = (
    SELECT s2.id
    FROM public.dtr_report_snapshots AS s2
    WHERE s2.user_id = w.user_id
      AND s2.product_id = 'DTR_CORE_STATIC_V1'
      AND s2.user_hidden_at IS NULL
    ORDER BY s2.created_at ASC, s2.id ASC
    LIMIT 1
  )
RETURNING md5(w.id::text) AS hashed_wallet_pk;

-- ============================================================================
-- ROLLBACK CANDIDATE — COMMENT ONLY — separate Human GO required
-- ============================================================================
/*
UPDATE public.reply_ticket_wallets AS w
SET report_instance_id = NULL
WHERE w.report_instance_id IS NOT NULL
  AND w.status = 'active'
  AND w.purchased_count = 0
  AND NOT (
    w.user_id LIKE 'smoke\_user\_%' ESCAPE '\'
    OR w.user_id LIKE 'smoke_user%'
  )
  AND EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.id = w.report_instance_id
      AND s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
      AND s.user_hidden_at IS NULL
  )
  AND (
    SELECT COUNT(*)::int
    FROM public.dtr_report_snapshots AS sx
    WHERE sx.user_id = w.user_id
      AND sx.product_id = 'DTR_CORE_STATIC_V1'
      AND sx.user_hidden_at IS NULL
  ) = 1;
*/
